#!/usr/bin/env node
// Publica os pacotes do monorepo no registry público (npmjs.org), em ordem de
// dependência, pulando versões já publicadas.
//
// Cada pacote tem publishConfig.registry apontando para o registry interno
// da ANPD (uso institucional). `pnpm publish` sempre respeita esse
// publishConfig e ignora qualquer --registry passado na linha de comando, ou
// seja, não dá para usá-lo diretamente para publicar no npmjs.org. A solução
// é gerar o tarball com `pnpm pack` (que resolve corretamente os protocolos
// workspace:*/catalog: para versões reais, sem depender de registry nenhum)
// e publicar esse tarball com `npm publish`, que respeita --registry e
// suporta --provenance via Trusted Publishing (OIDC) em CI.
//
// Em CI (usado pelo step de publicação do release.yml), cada
// pacote publicado com sucesso também ganha uma tag `nome@versão` e uma
// GitHub Release com o changelog daquela versão — o changesets/action só
// cria releases automaticamente quando é ele mesmo quem publica via
// `changeset publish`, o que não é o nosso caso aqui.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { setTimeout } from "node:timers/promises"

const REGISTRY = "https://registry.npmjs.org"
const PACKAGES = ["sei-sip-soap", "sei-client", "sip-client"]
const IS_CI = process.env.CI === "true"

function readPackageJson(dir) {
  return JSON.parse(readFileSync(`packages/${dir}/package.json`, "utf8"))
}

// Somente E404 confirma ausência. Falhas de autenticação/rede não autorizam publish.
export function isPublished(name, version, run = execFileSync) {
  let output
  try {
    output = run(
      "npm",
      ["view", `${name}@${version}`, "version", "--json", "--registry", REGISTRY],
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    )
  } catch (error) {
    let code
    try {
      code = JSON.parse(String(error.stdout)).error?.code
    } catch {
      // Saída inválida é uma falha de consulta, não uma versão ausente.
    }
    if (code === "E404") {
      return false
    }
    throw new Error(`Não foi possível consultar ${name}@${version}.`, { cause: error })
  }
  if (JSON.parse(output) !== version) {
    throw new Error(`Resposta inesperada ao consultar ${name}@${version}: ${output}`)
  }
  return true
}

export async function waitForPublication(
  name,
  version,
  { run = execFileSync, wait = setTimeout, attempts = 12, delay = 10000 } = {},
) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (isPublished(name, version, run)) {
        return
      }
    } catch (error) {
      lastError = error
    }
    if (attempt + 1 < attempts) {
      await wait(delay)
    }
  }
  throw new Error(
    `${name}@${version} ainda não está disponível publicamente. Verifique o staging no npm e execute novamente; nenhuma nova versão foi criada.`,
    { cause: lastError },
  )
}

export async function publishAndWait(name, version, tarballPath, options = {}) {
  const { run = execFileSync } = options
  try {
    const output = run(
      "npm",
      ["publish", tarballPath, "--access", "public", "--registry", REGISTRY, "--provenance"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    )
    console.log(output)
  } catch (error) {
    const diagnostic = `${error.stdout || ""}\n${error.stderr || ""}`
    // Outro pipeline pode ter enviado a mesma versão antes de ela ficar visível.
    if (
      !/\bE409\b/.test(diagnostic) ||
      !/Cannot publish over previously staged version/.test(diagnostic)
    ) {
      throw new Error(`Falha ao publicar ${name}@${version}: ${diagnostic}`, { cause: error })
    }
    console.log(
      `[release-npmjs] ${name}@${version} já está em staging; aguardando disponibilidade.`,
    )
  }
  // Um publish aceito não garante disponibilidade imediata no registry.
  await waitForPublication(name, version, options)
}

export async function runPackages(packages, release) {
  const failures = []
  for (const dir of packages) {
    try {
      await release(dir)
    } catch (error) {
      console.error(`[release-npmjs] ${dir}: ${error.message}`)
      failures.push(error)
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, `${failures.length} pacote(s) com publicação incompleta.`)
  }
}

function changelogNotes(dir, version) {
  try {
    const changelog = readFileSync(`packages/${dir}/CHANGELOG.md`, "utf8")
    const match = changelog.match(new RegExp(`^## ${version}\\n([\\s\\S]*?)(?=\\n## |$)`, "m"))
    return match ? match[1].trim() : ""
  } catch {
    return ""
  }
}

export function tagAndRelease(name, version, dir, run = execFileSync, ci = IS_CI) {
  if (!ci) {
    console.log(
      `[release-npmjs] fora de CI: pulando tag/release do GitHub para ${name}@${version}.`,
    )
    return
  }

  const tag = `${name}@${version}`
  try {
    run("git", ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`])
  } catch (error) {
    if (error.status !== 1) {
      throw error
    }
    run("git", ["tag", "-a", tag, "-m", tag])
  }
  // Push da mesma tag é idempotente; nunca substituímos uma tag existente.
  run("git", ["push", "origin", tag])

  try {
    run(
      "gh",
      ["api", `repos/{owner}/{repo}/releases/tags/${encodeURIComponent(tag)}`, "--silent"],
      { stdio: "pipe" },
    )
    return
  } catch (error) {
    if (!/HTTP 404/.test(String(error.stderr))) {
      throw error
    }
  }
  const notes = changelogNotes(dir, version) || `Publicação de ${tag} em ${REGISTRY}.`
  run("gh", ["release", "create", tag, "--verify-tag", "--title", tag, "--notes", notes])
}

async function releasePackage(dir) {
  const { name, version } = readPackageJson(dir)
  if (isPublished(name, version)) {
    console.log(`[release-npmjs] ${name}@${version} já publicado; verificando tag/release.`)
  } else {
    const packDir = mkdtempSync(join(tmpdir(), "release-npmjs-"))
    console.log(`[release-npmjs] empacotando ${name}@${version}...`)
    execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
      stdio: "inherit",
      cwd: `packages/${dir}`,
    })
    const tarball = readdirSync(packDir).find((f) => f.endsWith(".tgz"))
    if (!tarball) {
      throw new Error(`Tarball não encontrado para ${name}@${version}.`)
    }
    await publishAndWait(name, version, join(packDir, tarball))
  }
  tagAndRelease(name, version, dir)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runPackages(PACKAGES, releasePackage)
}
