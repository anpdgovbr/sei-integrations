#!/usr/bin/env node
// Publica os pacotes do monorepo no registry público (npmjs.org), em ordem de
// dependência, pulando versões já publicadas. Usa `npm publish` diretamente
// (não `pnpm publish`) para compatibilidade com o Trusted Publishing (OIDC)
// do npm, e passa --registry explicitamente para não depender do
// publishConfig de cada pacote (que aponta para o registry interno da ANPD).
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

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

  if (isPublished(name, version)) {
    console.log(`[release-npmjs] ${name}@${version} já publicado em ${REGISTRY}, pulando.`)
    continue
  }

  console.log(`[release-npmjs] publicando ${name}@${version} em ${REGISTRY}...`)
  execFileSync(
    "npm",
    ["publish", "--access", "public", "--registry", REGISTRY, "--provenance"],
    { stdio: "inherit", cwd: `packages/${dir}` },
  )
}
