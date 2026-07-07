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

const siglaUsuario = process.env.SIP_SMOKE_SIGLA_USUARIO

const sip = createSipClient({
  endpointUrl: requiredEnv("SIP_SOAP_ENDPOINT"),
  accessKey: requiredEnv("SIP_ACCESS_KEY"),
  systemId: requiredEnv("SIP_SYSTEM_ID"),
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
    process.exitCode = 1
  }
}

console.log(
  JSON.stringify(
    {
      endpoint: process.env.SIP_SOAP_ENDPOINT,
      systemId: process.env.SIP_SYSTEM_ID,
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
