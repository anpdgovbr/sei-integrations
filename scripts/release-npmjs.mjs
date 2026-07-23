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
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const REGISTRY = "https://registry.npmjs.org"

const PACKAGES = ["sei-sip-soap", "sei-client", "sip-client"]

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
}
