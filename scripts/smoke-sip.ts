import { readFileSync } from "node:fs"

import { createSipClient, SipSoapError } from "../packages/sip-client/src"

const loadDotenv = () => {
  try {
    const content = readFileSync(".env", "utf8")
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }
      const separatorIndex = trimmed.indexOf("=")
      if (separatorIndex === -1) {
        continue
      }
      const key = trimmed.slice(0, separatorIndex)
      const value = trimmed.slice(separatorIndex + 1)
      process.env[key] ??= value
    }
  } catch {
    // .env is optional; CI and shells can provide variables directly.
  }
}

const requiredEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`)
  }
  return value
}

loadDotenv()

const personaSlug = process.env.SIP_SMOKE_PERSONA
const personaPrefix = personaSlug
  ? `SIP_PERSONA_${personaSlug.toUpperCase().replaceAll("-", "_")}_`
  : null

const personaEnv = (name: string, fallbackName: string): string | undefined => {
  const personaValue = personaPrefix ? process.env[`${personaPrefix}${name}`] : undefined
  return personaValue || process.env[fallbackName]
}

const requiredPersonaEnv = (name: string, fallbackName: string): string => {
  const value = personaEnv(name, fallbackName)
  if (!value) {
    throw new Error(
      `Variavel obrigatoria ausente: ${personaPrefix !== null ? personaPrefix + name : fallbackName}`,
    )
  }
  return value
}

const maskSoapXml = (xml: string): string => {
  const accessKeys = [
    process.env.SIP_ACCESS_KEY,
    personaEnv("ACCESS_KEY", "SIP_ACCESS_KEY"),
  ].filter((value): value is string => Boolean(value))
  const withoutKnownSecret = accessKeys.reduce(
    (masked, accessKey) => masked.replaceAll(accessKey, "***"),
    xml,
  )
  return withoutKnownSecret.replaceAll(
    /(<ChaveAcesso\b[^>]*>)([\s\S]*?)(<\/ChaveAcesso>)/g,
    "$1***$3",
  )
}

const getSoapOperation = (xml: string): string | null => {
  const match = /<sip:(\w+)/.exec(xml)
  return match?.[1] ?? null
}

const installSmokeDebugFetch = () => {
  if (process.env.SIP_SMOKE_DEBUG_SOAP !== "1") {
    return
  }

  const debugOperation = process.env.SIP_SMOKE_DEBUG_OPERATION
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    const operation = typeof init?.body === "string" ? getSoapOperation(init.body) : null
    if (typeof init?.body === "string") {
      if (!debugOperation || debugOperation === operation) {
        console.error(`\n--- SIP SOAP request: ${operation ?? "unknown"} ---`)
        console.error(maskSoapXml(init.body))
        console.error("--- end SIP SOAP request ---\n")
      }
    }
    const response = await originalFetch(input, init)
    if (!debugOperation || debugOperation === operation) {
      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("xml")) {
        const responseText = await response.clone().text()
        console.error(`\n--- SIP SOAP response: ${operation ?? "unknown"} (${response.status}) ---`)
        console.error(responseText)
        console.error("--- end SIP SOAP response ---\n")
      }
    }
    return response
  }
}

installSmokeDebugFetch()

const siglaUsuario = personaEnv("SIGLA_USUARIO", "SIP_SMOKE_SIGLA_USUARIO")
const expected = personaEnv("EXPECTED", "SIP_SMOKE_EXPECTED") ?? "success"

const sip = createSipClient({
  endpointUrl: requiredEnv("SIP_SOAP_ENDPOINT"),
  accessKey: requiredPersonaEnv("ACCESS_KEY", "SIP_ACCESS_KEY"),
  systemId: requiredPersonaEnv("SYSTEM_ID", "SIP_SYSTEM_ID"),
  requestTimeoutMs: Number(process.env.SIP_REQUEST_TIMEOUT_MS ?? 30_000),
})

const orgaos = await sip.consultas.listarOrgaos({ todos: false })
const perfis = await sip.consultas.listarPerfis()
const recursos = await sip.consultas.listarRecursos()

let usuario: Awaited<ReturnType<typeof sip.consultas.buscarUsuarioPorSigla>> = null
let permissoes: Awaited<ReturnType<typeof sip.consultas.listarPermissoes>> = []
let usuarioErro: {
  operation?: string
  status?: number
  fault?: string
  message: string
} | null = null

if (siglaUsuario) {
  try {
    usuario = await sip.consultas.buscarUsuarioPorSigla(siglaUsuario)
    permissoes = usuario ? await sip.consultas.listarPermissoes({ idUsuario: usuario.id }) : []
  } catch (error) {
    if (error instanceof SipSoapError) {
      usuarioErro = {
        operation: error.operation,
        status: error.status,
        fault: error.fault,
        message: error.message,
      }
    } else if (error instanceof Error) {
      usuarioErro = { message: error.message }
    } else {
      usuarioErro = { message: String(error) }
    }
    if (expected !== "fault") {
      process.exitCode = 1
    }
  }
}

if (expected === "success" && siglaUsuario && !usuario) {
  process.exitCode = 1
}

if (expected === "empty" && (usuario || permissoes.length > 0 || usuarioErro)) {
  process.exitCode = 1
}

if (expected === "fault" && !usuarioErro) {
  process.exitCode = 1
}

console.log(
  JSON.stringify(
    {
      endpoint: process.env.SIP_SOAP_ENDPOINT,
      persona: personaSlug ?? null,
      expected,
      systemId: requiredPersonaEnv("SYSTEM_ID", "SIP_SYSTEM_ID"),
      orgaos: orgaos.length,
      perfis: perfis.length,
      recursos: recursos.length,
      usuario: usuario ? { id: usuario.id, sigla: usuario.sigla } : null,
      usuarioErro,
      permissoes: permissoes.length,
    },
    null,
    2,
  ),
)
