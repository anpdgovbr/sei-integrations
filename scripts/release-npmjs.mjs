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
// Em CI (usado como `publish:` do changesets/action em release.yml), cada
// pacote publicado com sucesso também ganha uma tag `nome@versão` e uma
// GitHub Release com o changelog daquela versão — o changesets/action só
// cria releases automaticamente quando é ele mesmo quem publica via
// `changeset publish`, o que não é o nosso caso aqui.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const REGISTRY = "https://registry.npmjs.org"
const PACKAGES = ["sei-sip-soap", "sei-client", "sip-client"]
const IS_CI = process.env.CI === "true"

function readPackageJson(dir) {
  return JSON.parse(readFileSync(`packages/${dir}/package.json`, "utf8"))
}

function isPublished(name, version) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version", "--registry", REGISTRY], {
      stdio: "pipe",
    })
    return true
  } catch {
    return false
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

function tagAndRelease(name, version, dir) {
  if (!IS_CI) {
    console.log(`[release-npmjs] fora de CI: pulando tag/release do GitHub para ${name}@${version}.`)
    return
  }

  const tag = `${name}@${version}`
  execFileSync("git", ["tag", "-a", tag, "-m", tag])
  execFileSync("git", ["push", "origin", tag])

  const notes = changelogNotes(dir, version) || `Publicação de ${tag} em ${REGISTRY}.`
  execFileSync("gh", ["release", "create", tag, "--title", tag, "--notes", notes])
}

for (const dir of PACKAGES) {
  const { name, version } = readPackageJson(dir)
  const cwd = `packages/${dir}`

  if (isPublished(name, version)) {
    console.log(`[release-npmjs] ${name}@${version} já publicado em ${REGISTRY}, pulando.`)
    continue
  }

  const packDir = mkdtempSync(join(tmpdir(), "release-npmjs-"))
  console.log(`[release-npmjs] empacotando ${name}@${version}...`)
  execFileSync("pnpm", ["pack", "--pack-destination", packDir], { stdio: "inherit", cwd })

  const tarball = readdirSync(packDir).find((f) => f.endsWith(".tgz"))
  const tarballPath = join(packDir, tarball)

  console.log(`[release-npmjs] publicando ${name}@${version} em ${REGISTRY}...`)
  execFileSync(
    "npm",
    ["publish", tarballPath, "--access", "public", "--registry", REGISTRY, "--provenance"],
    { stdio: "inherit" },
  )

  console.log(`[release-npmjs] criando tag e release no GitHub para ${name}@${version}...`)
  tagAndRelease(name, version, dir)
}
