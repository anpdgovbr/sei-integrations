import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

import { createSeiClient, encodeSeiBase64, SeiSoapError } from "../packages/sei-client/src"

type SmokeCycle = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
type SmokeEffect = "read" | "write" | "external"
type SmokeStatus = "automated" | "planned"

type SmokeOperation = Readonly<{
  cycle: SmokeCycle
  name: string
  method: string
  effect: SmokeEffect
  requiredEnv?: readonly string[]
  guardEnv?: string
  status: SmokeStatus
  run?: () => Promise<unknown>
}>

type SmokeResult = Readonly<{
  operation: string
  cycle: SmokeCycle
  method: string
  effect: SmokeEffect
  status: "ok" | "skipped" | "failed" | "planned"
  summary?: unknown
  reason?: string
  error?: {
    operation?: string
    status?: number
    fault?: string
    message: string
  }
}>

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

const sipPersonaSlug = process.env.SIP_SMOKE_PERSONA
const sipPersonaPrefix = sipPersonaSlug
  ? `SIP_PERSONA_${sipPersonaSlug.toUpperCase().replaceAll("-", "_")}_`
  : null

const sipPersonaEnv = (name: string): string | undefined => {
  const personaValue = sipPersonaPrefix ? process.env[`${sipPersonaPrefix}${name}`] : undefined
  return personaValue || undefined
}

const deriveSeiEndpointFromSip = (): string | undefined => {
  const sipEndpoint = process.env.SIP_SOAP_ENDPOINT
  if (!sipEndpoint?.endsWith("/sip/ws/SipWS.php")) {
    return undefined
  }
  return sipEndpoint.replace(/\/sip\/ws\/SipWS\.php$/, "/sei/ws/SeiWS.php")
}

const envValue = (name: string): string | undefined => {
  const value = process.env[name]
  if (value) {
    return value
  }

  if (name === "SEI_SOAP_ENDPOINT") {
    return deriveSeiEndpointFromSip()
  }

  if (name === "SEI_SMOKE_SIGLA_USUARIO") {
    return process.env.SIP_SMOKE_SIGLA_USUARIO || sipPersonaEnv("SIGLA_USUARIO")
  }

  return undefined
}

const requiredEnv = (name: string): string => {
  const value = envValue(name)
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`)
  }
  return value
}

const optionalEnv = (name: string): string | undefined => envValue(name)

const envList = (name: string): string[] =>
  (optionalEnv(name) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

const hasEnv = (names: readonly string[] = []): boolean =>
  names.every((name) => Boolean(envValue(name)))

const parseBool = (name: string): boolean =>
  process.env[name] === "1" || process.env[name] === "true"

const isEnabled = (name: string): boolean => parseBool(name)

const summarize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return { count: value.length }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return {
      present: true,
      idProcedimento: record.idProcedimento,
      procedimentoFormatado: record.procedimentoFormatado,
      idDocumento: record.idDocumento,
      documentoFormatado: record.documentoFormatado,
      idAndamento: record.idAndamento,
      idTarefa: record.idTarefa,
    }
  }
  return value
}

const normalizeError = (error: unknown): SmokeResult["error"] => {
  if (error instanceof SeiSoapError) {
    return {
      operation: error.operation,
      status: error.status,
      fault: error.fault,
      message: error.message,
    }
  }
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: String(error) }
}

loadDotenv()

const args = process.argv.slice(2)
const hasArg = (name: string): boolean => args.includes(name)
const argValue = (name: string): string | undefined => {
  const prefix = `${name}=`
  const inline = args.find((arg) => arg.startsWith(prefix))
  if (inline) {
    return inline.slice(prefix.length)
  }
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

const planOnly = hasArg("--plan") || hasArg("plan")
const listOnly = hasArg("--list") || hasArg("list")
const allowWrite = parseBool("SEI_SMOKE_ALLOW_WRITE")

const selectedCycleInput =
  argValue("--cycle") ?? argValue("-c") ?? process.env.SEI_SMOKE_CYCLE ?? "1"
const selectedOperation =
  argValue("--operation") ?? argValue("-o") ?? process.env.SEI_SMOKE_OPERATION

const parseCycle = (value: string): SmokeCycle | "all" => {
  if (value === "all" || value === "todos") {
    return "all"
  }
  const match = /\d+/.exec(value)
  const cycle = match ? Number(match[0]) : Number.NaN
  if (Number.isInteger(cycle) && cycle >= 1 && cycle <= 8) {
    return cycle as SmokeCycle
  }
  throw new Error(`Ciclo SEI invalido: ${value}`)
}

const selectedCycle = parseCycle(selectedCycleInput)

const getCoreConfig = () => ({
  endpointUrl: requiredEnv("SEI_SOAP_ENDPOINT"),
  siglaSistema: requiredEnv("SEI_SIGLA_SISTEMA"),
  identificacaoServico: requiredEnv("SEI_IDENTIFICACAO_SERVICO"),
  requestTimeoutMs: Number(process.env.SEI_REQUEST_TIMEOUT_MS ?? 30_000),
})

const maskSoapXml = (xml: string): string => {
  const secrets = [envValue("SEI_IDENTIFICACAO_SERVICO")].filter((value): value is string =>
    Boolean(value),
  )
  const withoutKnownSecret = secrets.reduce(
    (masked, secret) => masked.replaceAll(secret, "***"),
    xml,
  )
  return withoutKnownSecret.replaceAll(
    /(<IdentificacaoServico\b[^>]*>)([\s\S]*?)(<\/IdentificacaoServico>)/g,
    "$1***$3",
  )
}

const getSoapOperation = (xml: string): string | null => {
  const match = /<sei:(\w+)/.exec(xml)
  return match?.[1] ?? null
}

const installSmokeDebugFetch = () => {
  if (process.env.SEI_SMOKE_DEBUG_SOAP !== "1") {
    return
  }

  const debugOperation = process.env.SEI_SMOKE_DEBUG_OPERATION
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    const operation = typeof init?.body === "string" ? getSoapOperation(init.body) : null
    if (typeof init?.body === "string" && (!debugOperation || debugOperation === operation)) {
      console.error(`\n--- SEI SOAP request: ${operation ?? "unknown"} ---`)
      console.error(maskSoapXml(init.body))
      console.error("--- end SEI SOAP request ---\n")
    }

    const response = await originalFetch(input, init)
    if (!debugOperation || debugOperation === operation) {
      const contentType = response.headers.get("content-type") ?? ""
      if (contentType.includes("xml")) {
        const responseText = await response.clone().text()
        console.error(`\n--- SEI SOAP response: ${operation ?? "unknown"} (${response.status}) ---`)
        console.error(responseText)
        console.error("--- end SEI SOAP response ---\n")
      }
    }
    return response
  }
}

installSmokeDebugFetch()

const sei = planOnly || listOnly ? null : createSeiClient(getCoreConfig())
const idUnidade = () => requiredEnv("SEI_SMOKE_ID_UNIDADE")
let cycle3GeneratedProcedure: string | undefined
let cycle5GeneratedBlock: string | undefined
let cycle7GeneratedFileId: string | undefined
let cycle7UploadBuffer: Buffer | undefined

const smokeLabel = () => {
  const prefix = optionalEnv("SEI_SMOKE_WRITE_LABEL_PREFIX") ?? "sei-client smoke ciclo 3"
  return `${prefix} ${new Date().toISOString()}`
}

const cycle3Procedure = (): string => {
  const protocolo =
    cycle3GeneratedProcedure ?? optionalEnv("SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO")
  if (!protocolo) {
    throw new Error(
      "Variavel obrigatoria ausente: SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO; rode gerarProcedimento antes ou informe um processo de teste.",
    )
  }
  return protocolo
}

const relatedProcedure = (): string => requiredEnv("SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO")

const cycle4Motivo = (): string => optionalEnv("SEI_SMOKE_CYCLE4_MOTIVO") ?? smokeLabel()

const cycle4Document = (): string =>
  optionalEnv("SEI_SMOKE_WRITE_PROTOCOLO_DOCUMENTO") ?? requiredEnv("SEI_SMOKE_PROTOCOLO_DOCUMENTO")

const cycle4DocumentCancelReason = (): string =>
  optionalEnv("SEI_SMOKE_CANCELAR_DOCUMENTO_MOTIVO") ?? cycle4Motivo()

const cycle4AssignmentUser = (): string => requiredEnv("SEI_SMOKE_ID_USUARIO")

const cycle4TargetUnits = (): string[] => blockUnits()

const cycle5Block = (): string => {
  const idBloco = cycle5GeneratedBlock ?? optionalEnv("SEI_SMOKE_ID_BLOCO")
  if (!idBloco) {
    throw new Error(
      "Variavel obrigatoria ausente: SEI_SMOKE_ID_BLOCO; rode gerarBloco antes ou informe um bloco de teste.",
    )
  }
  return idBloco
}

const existingBlock = (): string => requiredEnv("SEI_SMOKE_ID_BLOCO")

const blockDocument = (): string =>
  optionalEnv("SEI_SMOKE_WRITE_PROTOCOLO_DOCUMENTO") ?? requiredEnv("SEI_SMOKE_PROTOCOLO_DOCUMENTO")

const blockUnits = (): string[] => envList("SEI_SMOKE_ID_UNIDADE_DESTINO")

const cycle6MarkerText = (): string =>
  optionalEnv("SEI_SMOKE_CYCLE6_MARCADOR_TEXTO") ?? smokeLabel()

const cycle6ControlePrazoData = (): string =>
  optionalEnv("SEI_SMOKE_CYCLE6_CONTROLE_PRAZO_DATA") ?? ""

const cycle6ControlePrazoDias = (): string =>
  optionalEnv("SEI_SMOKE_CYCLE6_CONTROLE_PRAZO_DIAS") ?? "1"

const cycle6ControlePrazoSinDiasUteis = (): string =>
  optionalEnv("SEI_SMOKE_CYCLE6_CONTROLE_PRAZO_SIN_DIAS_UTEIS") ?? "S"

const cycle7UploadName = (): string =>
  optionalEnv("SEI_SMOKE_UPLOAD_NOME") ?? "smoke-sei-client.txt"

const cycle7UploadContent = (): Buffer => {
  cycle7UploadBuffer ??= Buffer.from(
    optionalEnv("SEI_SMOKE_UPLOAD_CONTEUDO") ??
      `Arquivo temporario do smoke @anpdgovbr/sei-client ${new Date().toISOString()}\n`,
    "utf8",
  )
  return cycle7UploadBuffer
}

const cycle7UploadParts = (): readonly [Buffer, Buffer] => {
  const content = cycle7UploadContent()
  const splitAt = Math.max(1, Math.floor(content.length / 2))
  return [content.subarray(0, splitAt), content.subarray(splitAt)]
}

const cycle7UploadHash = (): string => createHash("md5").update(cycle7UploadContent()).digest("hex")

const cycle7FileId = (): string => {
  const idArquivo = cycle7GeneratedFileId ?? optionalEnv("SEI_SMOKE_ID_ARQUIVO")
  if (!idArquivo) {
    throw new Error(
      "Variavel obrigatoria ausente: SEI_SMOKE_ID_ARQUIVO; rode adicionarArquivo antes ou informe um arquivo temporario de teste.",
    )
  }
  return idArquivo
}

const cycle7ContatoId = (): string => requiredEnv("SEI_SMOKE_CONTATO_ID")

const cycle7ContatoOperacao = (): string => optionalEnv("SEI_SMOKE_CONTATO_OPERACAO") ?? "R"

const cycle7EmailDestinatario = (): string => requiredEnv("SEI_SMOKE_EMAIL_DESTINATARIO")

const cycle7EmailRemetente = (): string =>
  optionalEnv("SEI_SMOKE_EMAIL_REMETENTE") ?? "sei@anpd.gov.br"

const cycle7OuvidoriaTipoProcedimento = (): string =>
  optionalEnv("SEI_SMOKE_OUVIDORIA_ID_TIPO_PROCEDIMENTO") ?? "100000337"

const cycle7OuvidoriaMensagem = (): string =>
  optionalEnv("SEI_SMOKE_OUVIDORIA_MENSAGEM") ?? smokeLabel()

const cycle7OuvidoriaSinAnonimo = (): string =>
  optionalEnv("SEI_SMOKE_OUVIDORIA_SIN_ANONIMO") ?? "N"

const formatSeiDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

const nextBusinessDate = (daysAhead: number): Date => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + daysAhead)
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1)
  }
  return date
}

const cycle8Document = (): string => blockDocument()

const cycle8PublicationVehicle = (): string => optionalEnv("SEI_SMOKE_ID_VEICULO_PUBLICACAO") ?? "1"

const cycle8PublicationReason = (): string => optionalEnv("SEI_SMOKE_PUBLICACAO_STA_MOTIVO") ?? "1"

const cycle8PublicationDate = (): string =>
  optionalEnv("SEI_SMOKE_PUBLICACAO_DATA_DISPONIBILIZACAO") ?? formatSeiDate(nextBusinessDate(3))

const cycle8AlteredPublicationDate = (): string =>
  optionalEnv("SEI_SMOKE_PUBLICACAO_DATA_DISPONIBILIZACAO_ALTERADA") ??
  formatSeiDate(nextBusinessDate(4))

const cycle8PublicationSummary = (): string =>
  optionalEnv("SEI_SMOKE_PUBLICACAO_RESUMO") ?? smokeLabel()

const cycle8PublicationNumber = (): string => optionalEnv("SEI_SMOKE_PUBLICACAO_NUMERO") ?? "1"

const cycle8PublicationDatePublished = (): string =>
  optionalEnv("SEI_SMOKE_PUBLICACAO_DATA_PUBLICACAO") ?? cycle8AlteredPublicationDate()

const generatedDocumentHtml = (label: string): string =>
  `<p>Documento gerado automaticamente pelo smoke do @anpdgovbr/sei-client.</p><p>${label}</p>`

const operations: SmokeOperation[] = [
  {
    cycle: 1,
    name: "listarUnidades",
    method: "sei.consultas.listarUnidades",
    effect: "read",
    status: "automated",
    run: () =>
      sei!.consultas.listarUnidades({
        idTipoProcedimento: optionalEnv("SEI_SMOKE_ID_TIPO_PROCEDIMENTO"),
        idSerie: optionalEnv("SEI_SMOKE_ID_SERIE"),
      }),
  },
  {
    cycle: 1,
    name: "listarTiposProcedimento",
    method: "sei.consultas.listarTiposProcedimento",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarTiposProcedimento({
        idUnidade: idUnidade(),
        idSerie: optionalEnv("SEI_SMOKE_ID_SERIE"),
        sinIndividual: optionalEnv("SEI_SMOKE_SIN_INDIVIDUAL"),
      }),
  },
  {
    cycle: 1,
    name: "listarSeries",
    method: "sei.consultas.listarSeries",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarSeries({
        idUnidade: idUnidade(),
        idTipoProcedimento: optionalEnv("SEI_SMOKE_ID_TIPO_PROCEDIMENTO"),
      }),
  },
  {
    cycle: 1,
    name: "listarTiposPrioridade",
    method: "sei.consultas.listarTiposPrioridade",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => sei!.consultas.listarTiposPrioridade({ idUnidade: idUnidade() }),
  },
  {
    cycle: 1,
    name: "listarHipotesesLegais",
    method: "sei.consultas.listarHipotesesLegais",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarHipotesesLegais({
        idUnidade: idUnidade(),
        nivelAcesso: optionalEnv("SEI_SMOKE_NIVEL_ACESSO"),
      }),
  },
  {
    cycle: 1,
    name: "listarTiposConferencia",
    method: "sei.consultas.listarTiposConferencia",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => sei!.consultas.listarTiposConferencia({ idUnidade: idUnidade() }),
  },
  {
    cycle: 1,
    name: "listarUsuarios",
    method: "sei.consultas.listarUsuarios",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarUsuarios({
        idUnidade: idUnidade(),
        idUsuario: optionalEnv("SEI_SMOKE_ID_USUARIO"),
      }),
  },
  {
    cycle: 1,
    name: "listarPaises",
    method: "sei.consultas.listarPaises",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => sei!.consultas.listarPaises({ idUnidade: idUnidade() }),
  },
  {
    cycle: 1,
    name: "listarEstados",
    method: "sei.consultas.listarEstados",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarEstados({
        idUnidade: idUnidade(),
        idPais: optionalEnv("SEI_SMOKE_ID_PAIS"),
      }),
  },
  {
    cycle: 1,
    name: "listarCidades",
    method: "sei.consultas.listarCidades",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarCidades({
        idUnidade: idUnidade(),
        idPais: optionalEnv("SEI_SMOKE_ID_PAIS"),
        idEstado: optionalEnv("SEI_SMOKE_ID_ESTADO"),
      }),
  },
  {
    cycle: 1,
    name: "listarCargos",
    method: "sei.consultas.listarCargos",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarCargos({
        idUnidade: idUnidade(),
        idCargo: optionalEnv("SEI_SMOKE_ID_CARGO"),
      }),
  },
  {
    cycle: 1,
    name: "listarFeriados",
    method: "sei.consultas.listarFeriados",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarFeriados({
        idUnidade: idUnidade(),
        idOrgao: optionalEnv("SEI_SMOKE_ID_ORGAO"),
        dataInicial: optionalEnv("SEI_SMOKE_DATA_INICIAL"),
        dataFinal: optionalEnv("SEI_SMOKE_DATA_FINAL"),
      }),
  },
  {
    cycle: 1,
    name: "listarExtensoesPermitidas",
    method: "sei.consultas.listarExtensoesPermitidas",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarExtensoesPermitidas({
        idUnidade: idUnidade(),
        idArquivoExtensao: optionalEnv("SEI_SMOKE_ID_ARQUIVO_EXTENSAO"),
      }),
  },
  {
    cycle: 1,
    name: "listarTiposProcedimentoOuvidoria",
    method: "sei.consultas.listarTiposProcedimentoOuvidoria",
    effect: "read",
    status: "automated",
    run: () => sei!.consultas.listarTiposProcedimentoOuvidoria(),
  },
  {
    cycle: 2,
    name: "consultarProcedimento",
    method: "sei.consultas.consultarProcedimento",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.consultas.consultarProcedimento({
        idUnidade: idUnidade(),
        protocoloProcedimento: requiredEnv("SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"),
      }),
  },
  {
    cycle: 2,
    name: "consultarDocumento",
    method: "sei.consultas.consultarDocumento",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.consultas.consultarDocumento({
        idUnidade: idUnidade(),
        protocoloDocumento: requiredEnv("SEI_SMOKE_PROTOCOLO_DOCUMENTO"),
      }),
  },
  {
    cycle: 2,
    name: "listarAndamentos",
    method: "sei.consultas.listarAndamentos",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.consultas.listarAndamentos({
        idUnidade: idUnidade(),
        protocoloProcedimento: requiredEnv("SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"),
        sinRetornarAtributos: optionalEnv("SEI_SMOKE_SIN_RETORNAR_ATRIBUTOS"),
        andamentos: envList("SEI_SMOKE_ANDAMENTOS"),
        tarefas: envList("SEI_SMOKE_TAREFAS"),
        tarefasModulos: envList("SEI_SMOKE_TAREFAS_MODULOS"),
      }),
  },
  {
    cycle: 2,
    name: "consultarBloco",
    method: "sei.consultas.consultarBloco",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_ID_BLOCO"],
    status: "automated",
    run: () =>
      sei!.consultas.consultarBloco({
        idUnidade: idUnidade(),
        idBloco: requiredEnv("SEI_SMOKE_ID_BLOCO"),
      }),
  },
  {
    cycle: 2,
    name: "listarMarcadoresUnidade",
    method: "sei.consultas.listarMarcadoresUnidade",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => sei!.consultas.listarMarcadoresUnidade({ idUnidade: idUnidade() }),
  },
  {
    cycle: 2,
    name: "listarAndamentosMarcadores",
    method: "sei.consultas.listarAndamentosMarcadores",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.consultas.listarAndamentosMarcadores({
        idUnidade: idUnidade(),
        protocoloProcedimento: requiredEnv("SEI_SMOKE_PROTOCOLO_PROCEDIMENTO"),
        marcadores: envList("SEI_SMOKE_MARCADORES"),
      }),
  },
  {
    cycle: 2,
    name: "consultarPublicacao",
    method: "sei.consultas.consultarPublicacao",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.consultarPublicacao({
        idUnidade: idUnidade(),
        idPublicacao: optionalEnv("SEI_SMOKE_ID_PUBLICACAO"),
        idDocumento: optionalEnv("SEI_SMOKE_ID_DOCUMENTO"),
        protocoloDocumento: optionalEnv("SEI_SMOKE_PROTOCOLO_DOCUMENTO"),
      }),
  },
  {
    cycle: 2,
    name: "listarContatos",
    method: "sei.consultas.listarContatos",
    effect: "read",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.consultas.listarContatos({
        idUnidade: idUnidade(),
        paginaRegistros: process.env.SEI_SMOKE_CONTATOS_PAGINA_REGISTROS ?? "10",
        paginaAtual: process.env.SEI_SMOKE_CONTATOS_PAGINA_ATUAL ?? "1",
        sigla: optionalEnv("SEI_SMOKE_CONTATO_SIGLA"),
        nome: optionalEnv("SEI_SMOKE_CONTATO_NOME"),
      }),
  },
  {
    cycle: 2,
    name: "consultarProcedimentoIndividual",
    method: "sei.consultas.consultarProcedimentoIndividual",
    effect: "read",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_ID_ORGAO_PROCEDIMENTO",
      "SEI_SMOKE_ID_TIPO_PROCEDIMENTO_INDIVIDUAL",
      "SEI_SMOKE_ID_ORGAO_USUARIO",
      "SEI_SMOKE_SIGLA_USUARIO",
    ],
    status: "automated",
    run: () =>
      sei!.consultas.consultarProcedimentoIndividual({
        idUnidade: idUnidade(),
        idOrgaoProcedimento: requiredEnv("SEI_SMOKE_ID_ORGAO_PROCEDIMENTO"),
        idTipoProcedimento: requiredEnv("SEI_SMOKE_ID_TIPO_PROCEDIMENTO_INDIVIDUAL"),
        idOrgaoUsuario: requiredEnv("SEI_SMOKE_ID_ORGAO_USUARIO"),
        siglaUsuario: requiredEnv("SEI_SMOKE_SIGLA_USUARIO"),
      }),
  },
  {
    cycle: 3,
    name: "gerarProcedimento",
    method: "sei.operacoes.gerarProcedimento",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_ID_TIPO_PROCEDIMENTO",
      "SEI_SMOKE_WRITE_CODIGO_ASSUNTO",
      "SEI_SMOKE_WRITE_INTERESSADO_NOME",
    ],
    status: "automated",
    run: async () => {
      const label = smokeLabel()
      const result = await sei!.operacoes.gerarProcedimento({
        idUnidade: idUnidade(),
        procedimento: {
          idTipoProcedimento: requiredEnv("SEI_SMOKE_WRITE_ID_TIPO_PROCEDIMENTO"),
          especificacao: label,
          assuntos: [{ codigoEstruturado: requiredEnv("SEI_SMOKE_WRITE_CODIGO_ASSUNTO") }],
          interessados: [{ nome: requiredEnv("SEI_SMOKE_WRITE_INTERESSADO_NOME") }],
          observacao: label,
          nivelAcesso: optionalEnv("SEI_SMOKE_WRITE_NIVEL_ACESSO") ?? "0",
          idHipoteseLegal: optionalEnv("SEI_SMOKE_WRITE_ID_HIPOTESE_LEGAL"),
        },
        sinManterAbertoUnidade: "S",
      })
      cycle3GeneratedProcedure = result?.procedimentoFormatado
      return result
    },
  },
  {
    cycle: 3,
    name: "incluirDocumento",
    method: "sei.operacoes.incluirDocumento",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_ID_SERIE"],
    status: "automated",
    run: () => {
      const label = smokeLabel()
      return sei!.operacoes.incluirDocumento({
        idUnidade: idUnidade(),
        documento: {
          tipo: optionalEnv("SEI_SMOKE_WRITE_TIPO_DOCUMENTO") ?? "G",
          protocoloProcedimento: cycle3Procedure(),
          idSerie: requiredEnv("SEI_SMOKE_WRITE_ID_SERIE"),
          descricao: label,
          nomeArvore: optionalEnv("SEI_SMOKE_WRITE_NOME_ARVORE") ?? "Smoke sei-client",
          nivelAcesso: optionalEnv("SEI_SMOKE_WRITE_NIVEL_ACESSO") ?? "0",
          idHipoteseLegal: optionalEnv("SEI_SMOKE_WRITE_ID_HIPOTESE_LEGAL"),
          conteudo:
            optionalEnv("SEI_SMOKE_WRITE_DOCUMENTO_CONTEUDO") ??
            encodeSeiBase64(generatedDocumentHtml(label)),
          sinBloqueado: "S",
          sinAssinado: "N",
        },
      })
    },
  },
  {
    cycle: 3,
    name: "lancarAndamento",
    method: "sei.operacoes.lancarAndamento",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => {
      const label = smokeLabel()
      return sei!.operacoes.lancarAndamento({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
        idTarefa: optionalEnv("SEI_SMOKE_WRITE_ID_TAREFA_ANDAMENTO") ?? "65",
        atributos: [
          {
            nome: optionalEnv("SEI_SMOKE_WRITE_ATRIBUTO_NOME") ?? "Smoke",
            valor: label,
            idOrigem: optionalEnv("SEI_SMOKE_WRITE_ATRIBUTO_ID_ORIGEM") ?? "sei-client",
          },
        ],
      })
    },
  },
  {
    cycle: 3,
    name: "registrarAnotacao",
    method: "sei.operacoes.registrarAnotacao",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.operacoes.registrarAnotacao({
        idUnidade: idUnidade(),
        anotacoes: [
          {
            protocoloProcedimento: cycle3Procedure(),
            descricao: smokeLabel(),
            sinPrioridade: optionalEnv("SEI_SMOKE_WRITE_ANOTACAO_PRIORIDADE") ?? "N",
          },
        ],
      }),
  },
  {
    cycle: 4,
    name: "concluirProcesso",
    method: "sei.operacoes.concluirProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.concluirProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "reabrirProcesso",
    method: "sei.operacoes.reabrirProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.reabrirProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "bloquearProcesso",
    method: "sei.operacoes.bloquearProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.bloquearProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "desbloquearProcesso",
    method: "sei.operacoes.desbloquearProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.desbloquearProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "relacionarProcesso",
    method: "sei.operacoes.relacionarProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.relacionarProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento1: cycle3Procedure(),
        protocoloProcedimento2: relatedProcedure(),
      }),
  },
  {
    cycle: 4,
    name: "removerRelacionamentoProcesso",
    method: "sei.operacoes.removerRelacionamentoProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.removerRelacionamentoProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento1: cycle3Procedure(),
        protocoloProcedimento2: relatedProcedure(),
      }),
  },
  {
    cycle: 4,
    name: "anexarProcesso",
    method: "sei.operacoes.anexarProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.anexarProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimentoPrincipal: relatedProcedure(),
        protocoloProcedimentoAnexado: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "desanexarProcesso",
    method: "sei.operacoes.desanexarProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.desanexarProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimentoPrincipal: relatedProcedure(),
        protocoloProcedimentoAnexado: cycle3Procedure(),
        motivo: cycle4Motivo(),
      }),
  },
  {
    cycle: 4,
    name: "sobrestarProcesso",
    method: "sei.operacoes.sobrestarProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.sobrestarProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
        protocoloProcedimentoVinculado: optionalEnv("SEI_SMOKE_RELATED_PROTOCOLO_PROCEDIMENTO"),
        motivo: cycle4Motivo(),
      }),
  },
  {
    cycle: 4,
    name: "removerSobrestamentoProcesso",
    method: "sei.operacoes.removerSobrestamentoProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.removerSobrestamentoProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 4,
    name: "enviarProcesso",
    method: "sei.operacoes.enviarProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_ID_UNIDADE_DESTINO",
    ],
    guardEnv: "SEI_SMOKE_ENABLE_ENVIAR_PROCESSO",
    status: "automated",
    run: () =>
      sei!.operacoes.enviarProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
        unidadesDestino: cycle4TargetUnits(),
        sinManterAbertoUnidade: optionalEnv("SEI_SMOKE_ENVIAR_PROCESSO_SIN_MANTER_ABERTO") ?? "S",
        sinRemoverAnotacao: optionalEnv("SEI_SMOKE_ENVIAR_PROCESSO_SIN_REMOVER_ANOTACAO") ?? "N",
        sinEnviarEmailNotificacao: optionalEnv("SEI_SMOKE_ENVIAR_PROCESSO_SIN_EMAIL") ?? "N",
        sinReabrir: optionalEnv("SEI_SMOKE_ENVIAR_PROCESSO_SIN_REABRIR") ?? "N",
      }),
  },
  {
    cycle: 4,
    name: "atribuirProcesso",
    method: "sei.operacoes.atribuirProcesso",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_ID_USUARIO",
    ],
    guardEnv: "SEI_SMOKE_ENABLE_ATRIBUIR_PROCESSO",
    status: "automated",
    run: () =>
      sei!.operacoes.atribuirProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
        idUsuario: cycle4AssignmentUser(),
        sinReabrir: optionalEnv("SEI_SMOKE_ATRIBUIR_PROCESSO_SIN_REABRIR") ?? "N",
      }),
  },
  {
    cycle: 4,
    name: "bloquearDocumento",
    method: "sei.operacoes.bloquearDocumento",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    guardEnv: "SEI_SMOKE_ENABLE_BLOQUEAR_DOCUMENTO",
    status: "automated",
    run: () =>
      sei!.operacoes.bloquearDocumento({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle4Document(),
      }),
  },
  {
    cycle: 4,
    name: "cancelarDocumento",
    method: "sei.operacoes.cancelarDocumento",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    guardEnv: "SEI_SMOKE_ENABLE_CANCELAR_DOCUMENTO",
    status: "automated",
    run: () =>
      sei!.operacoes.cancelarDocumento({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle4Document(),
        motivo: cycle4DocumentCancelReason(),
      }),
  },
  {
    cycle: 4,
    name: "excluirDocumento",
    method: "sei.operacoes.excluirDocumento",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    guardEnv: "SEI_SMOKE_ENABLE_EXCLUIR_DOCUMENTO",
    status: "automated",
    run: () =>
      sei!.operacoes.excluirDocumento({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle4Document(),
      }),
  },
  {
    cycle: 4,
    name: "excluirProcesso",
    method: "sei.operacoes.excluirProcesso",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    guardEnv: "SEI_SMOKE_ENABLE_EXCLUIR_PROCESSO",
    status: "automated",
    run: () =>
      sei!.operacoes.excluirProcesso({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 5,
    name: "gerarBloco",
    method: "sei.operacoes.gerarBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: async () => {
      const result = await sei!.operacoes.gerarBloco({
        idUnidade: idUnidade(),
        tipo: optionalEnv("SEI_SMOKE_BLOCO_TIPO") ?? "A",
        descricao: smokeLabel(),
        unidadesDisponibilizacao: blockUnits(),
        sinDisponibilizar: optionalEnv("SEI_SMOKE_BLOCO_SIN_DISPONIBILIZAR") ?? "N",
      })
      cycle5GeneratedBlock = result
      return result
    },
  },
  {
    cycle: 5,
    name: "alterarBloco",
    method: "sei.operacoes.alterarBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.operacoes.alterarBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
        descricao: smokeLabel(),
        unidadesDisponibilizacao: blockUnits(),
      }),
  },
  {
    cycle: 5,
    name: "incluirDocumentoBloco",
    method: "sei.operacoes.incluirDocumentoBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.incluirDocumentoBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
        protocoloDocumento: blockDocument(),
        anotacao: smokeLabel(),
      }),
  },
  {
    cycle: 5,
    name: "incluirProcessoBloco",
    method: "sei.operacoes.incluirProcessoBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.incluirProcessoBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
        protocoloProcedimento: cycle3Procedure(),
        anotacao: smokeLabel(),
      }),
  },
  {
    cycle: 5,
    name: "retirarProcessoBloco",
    method: "sei.operacoes.retirarProcessoBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.retirarProcessoBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
        protocoloProcedimento: cycle3Procedure(),
      }),
  },
  {
    cycle: 5,
    name: "disponibilizarBloco",
    method: "sei.operacoes.disponibilizarBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_ID_UNIDADE_DESTINO"],
    status: "automated",
    run: () =>
      sei!.operacoes.disponibilizarBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
      }),
  },
  {
    cycle: 5,
    name: "cancelarDisponibilizacaoBloco",
    method: "sei.operacoes.cancelarDisponibilizacaoBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_ID_UNIDADE_DESTINO"],
    status: "automated",
    run: () =>
      sei!.operacoes.cancelarDisponibilizacaoBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
      }),
  },
  {
    cycle: 5,
    name: "retirarDocumentoBloco",
    method: "sei.operacoes.retirarDocumentoBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.retirarDocumentoBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
        protocoloDocumento: blockDocument(),
      }),
  },
  {
    cycle: 5,
    name: "concluirBloco",
    method: "sei.operacoes.concluirBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.operacoes.concluirBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
      }),
  },
  {
    cycle: 5,
    name: "reabrirBloco",
    method: "sei.operacoes.reabrirBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.operacoes.reabrirBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
      }),
  },
  {
    cycle: 5,
    name: "excluirBloco",
    method: "sei.operacoes.excluirBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () =>
      sei!.operacoes.excluirBloco({
        idUnidade: idUnidade(),
        idBloco: cycle5Block(),
      }),
  },
  {
    cycle: 5,
    name: "devolverBloco",
    method: "sei.operacoes.devolverBloco",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_ID_BLOCO"],
    status: "automated",
    run: () =>
      sei!.operacoes.devolverBloco({
        idUnidade: idUnidade(),
        idBloco: existingBlock(),
      }),
  },
  {
    cycle: 6,
    name: "definirMarcador",
    method: "sei.operacoes.definirMarcador",
    effect: "write",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_ID_MARCADOR",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.definirMarcador({
        idUnidade: idUnidade(),
        definicoes: [
          {
            protocoloProcedimento: cycle3Procedure(),
            idMarcador: requiredEnv("SEI_SMOKE_ID_MARCADOR"),
            texto: cycle6MarkerText(),
          },
        ],
      }),
  },
  {
    cycle: 6,
    name: "definirControlePrazo",
    method: "sei.operacoes.definirControlePrazo",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.definirControlePrazo({
        idUnidade: idUnidade(),
        definicoes: [
          {
            protocoloProcedimento: cycle3Procedure(),
            dataPrazo: cycle6ControlePrazoData(),
            dias: cycle6ControlePrazoDias(),
            sinDiasUteis: cycle6ControlePrazoSinDiasUteis(),
          },
        ],
      }),
  },
  {
    cycle: 6,
    name: "concluirControlePrazo",
    method: "sei.operacoes.concluirControlePrazo",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.concluirControlePrazo({
        idUnidade: idUnidade(),
        protocolosProcedimentos: [cycle3Procedure()],
      }),
  },
  {
    cycle: 6,
    name: "removerControlePrazo",
    method: "sei.operacoes.removerControlePrazo",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.removerControlePrazo({
        idUnidade: idUnidade(),
        protocolosProcedimentos: [cycle3Procedure()],
      }),
  },
  {
    cycle: 7,
    name: "adicionarArquivo",
    method: "sei.consultas.adicionarArquivo",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: async () => {
      const [firstPart] = cycle7UploadParts()
      const result = await sei!.consultas.adicionarArquivo({
        idUnidade: idUnidade(),
        nome: cycle7UploadName(),
        tamanho: String(cycle7UploadContent().length),
        hash: cycle7UploadHash(),
        conteudo: firstPart.toString("base64"),
      })
      cycle7GeneratedFileId = result
      return result
    },
  },
  {
    cycle: 7,
    name: "adicionarConteudoArquivo",
    method: "sei.consultas.adicionarConteudoArquivo",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE"],
    status: "automated",
    run: () => {
      const [, secondPart] = cycle7UploadParts()
      return sei!.consultas.adicionarConteudoArquivo({
        idUnidade: idUnidade(),
        idArquivo: cycle7FileId(),
        conteudo: secondPart.toString("base64"),
      })
    },
  },
  {
    cycle: 7,
    name: "atualizarContatos",
    method: "sei.operacoes.atualizarContatos",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_CONTATO_ID"],
    status: "automated",
    run: () =>
      sei!.operacoes.atualizarContatos({
        idUnidade: idUnidade(),
        contatos: [
          {
            staOperacao: cycle7ContatoOperacao(),
            idContato: cycle7ContatoId(),
            idTipoContato: "",
            sigla: "",
            nome: "Smoke sei-client",
            staNatureza: "",
            sinEnderecoAssociado: "N",
            endereco: "",
            complemento: "",
            bairro: "",
            cep: "",
            staGenero: "",
            cpf: "",
            cnpj: "",
            rg: "",
            orgaoExpedidor: "",
            matricula: "",
            matriculaOab: "",
            telefoneComercial: "",
            telefoneResidencial: "",
            telefoneCelular: "",
            dataNascimento: "",
            email: "",
            sitioInternet: "",
            observacao: smokeLabel(),
            sinAtivo: "S",
          },
        ],
      }),
  },
  {
    cycle: 7,
    name: "enviarEmail",
    method: "sei.operacoes.enviarEmail",
    effect: "external",
    requiredEnv: [
      "SEI_SMOKE_ID_UNIDADE",
      "SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO",
      "SEI_SMOKE_EMAIL_DESTINATARIO",
    ],
    status: "automated",
    run: () =>
      sei!.operacoes.enviarEmail({
        idUnidade: idUnidade(),
        protocoloProcedimento: cycle3Procedure(),
        de: cycle7EmailRemetente(),
        para: cycle7EmailDestinatario(),
        assunto: optionalEnv("SEI_SMOKE_EMAIL_ASSUNTO") ?? smokeLabel(),
        mensagem:
          optionalEnv("SEI_SMOKE_EMAIL_MENSAGEM") ??
          "Mensagem automatizada de teste HML do @anpdgovbr/sei-client.",
        nivelAcesso: optionalEnv("SEI_SMOKE_WRITE_NIVEL_ACESSO") ?? "0",
        idHipoteseLegal: optionalEnv("SEI_SMOKE_WRITE_ID_HIPOTESE_LEGAL"),
      }),
  },
  {
    cycle: 7,
    name: "registrarOuvidoria",
    method: "sei.operacoes.registrarOuvidoria",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_ORGAO"],
    status: "automated",
    run: () =>
      sei!.operacoes.registrarOuvidoria({
        idOrgao: requiredEnv("SEI_SMOKE_ID_ORGAO"),
        nome: optionalEnv("SEI_SMOKE_OUVIDORIA_NOME") ?? "Smoke sei-client",
        email: optionalEnv("SEI_SMOKE_EMAIL_DESTINATARIO"),
        idTipoProcedimento: cycle7OuvidoriaTipoProcedimento(),
        sinRetorno: optionalEnv("SEI_SMOKE_OUVIDORIA_SIN_RETORNO") ?? "N",
        mensagem: cycle7OuvidoriaMensagem(),
        sinAnonimo: cycle7OuvidoriaSinAnonimo(),
        sinSigilo: optionalEnv("SEI_SMOKE_OUVIDORIA_SIN_SIGILO") ?? "N",
      }),
  },
  {
    cycle: 8,
    name: "agendarPublicacao",
    method: "sei.operacoes.agendarPublicacao",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.agendarPublicacao({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle8Document(),
        staMotivo: cycle8PublicationReason(),
        idVeiculoPublicacao: cycle8PublicationVehicle(),
        dataDisponibilizacao: cycle8PublicationDate(),
        resumo: cycle8PublicationSummary(),
      }),
  },
  {
    cycle: 8,
    name: "alterarPublicacao",
    method: "sei.operacoes.alterarPublicacao",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.alterarPublicacao({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle8Document(),
        staMotivo: cycle8PublicationReason(),
        idVeiculoPublicacao: cycle8PublicationVehicle(),
        dataDisponibilizacao: cycle8AlteredPublicationDate(),
        resumo: cycle8PublicationSummary(),
      }),
  },
  {
    cycle: 8,
    name: "cancelarAgendamentoPublicacao",
    method: "sei.operacoes.cancelarAgendamentoPublicacao",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_UNIDADE", "SEI_SMOKE_PROTOCOLO_DOCUMENTO"],
    status: "automated",
    run: () =>
      sei!.operacoes.cancelarAgendamentoPublicacao({
        idUnidade: idUnidade(),
        protocoloDocumento: cycle8Document(),
      }),
  },
  {
    cycle: 8,
    name: "confirmarDisponibilizacaoPublicacao",
    method: "sei.operacoes.confirmarDisponibilizacaoPublicacao",
    effect: "write",
    requiredEnv: ["SEI_SMOKE_ID_DOCUMENTO"],
    guardEnv: "SEI_SMOKE_CONFIRMAR_PUBLICACAO",
    status: "automated",
    run: () =>
      sei!.operacoes.confirmarDisponibilizacaoPublicacao({
        idVeiculoPublicacao: cycle8PublicationVehicle(),
        dataDisponibilizacao: cycle8PublicationDate(),
        dataPublicacao: cycle8PublicationDatePublished(),
        numero: cycle8PublicationNumber(),
        idDocumentos: [requiredEnv("SEI_SMOKE_ID_DOCUMENTO")],
      }),
  },
]

const selectedOperations = operations.filter((operation) => {
  const cycleMatches = listOnly || selectedCycle === "all" || operation.cycle === selectedCycle
  const operationMatches = !selectedOperation || operation.name === selectedOperation
  return cycleMatches && operationMatches
})

if (!selectedOperations.length) {
  throw new Error("Nenhuma operacao SEI encontrada para os filtros informados.")
}

const plan = selectedOperations.map(
  ({ cycle, name, method, effect, status, requiredEnv, guardEnv }) => ({
    cycle,
    name,
    method,
    effect,
    status,
    requiredEnv: requiredEnv ?? [],
    guardEnv: guardEnv ?? null,
  }),
)

if (planOnly || listOnly) {
  console.log(
    JSON.stringify(
      {
        selectedCycle: listOnly ? "all" : selectedCycle,
        selectedOperation: selectedOperation ?? null,
        plan,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const runOperation = async (operation: SmokeOperation): Promise<SmokeResult> => {
  if (operation.status === "planned" || !operation.run) {
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "planned",
      reason: "Operacao catalogada para ciclo futuro; runner HML ainda nao automatizado.",
    }
  }

  if ((operation.effect === "write" || operation.effect === "external") && !allowWrite) {
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "skipped",
      reason: "Operacao de escrita/efeito externo exige SEI_SMOKE_ALLOW_WRITE=1.",
    }
  }

  if (operation.guardEnv && !isEnabled(operation.guardEnv)) {
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "skipped",
      reason: `Operacao exige ${operation.guardEnv}=1.`,
    }
  }

  if (!hasEnv(operation.requiredEnv)) {
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "skipped",
      reason: `Variaveis ausentes: ${(operation.requiredEnv ?? []).filter((name) => !envValue(name)).join(", ")}`,
    }
  }

  try {
    const value = await operation.run()
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "ok",
      summary: summarize(value),
    }
  } catch (error) {
    process.exitCode = 1
    return {
      operation: operation.name,
      cycle: operation.cycle,
      method: operation.method,
      effect: operation.effect,
      status: "failed",
      error: normalizeError(error),
    }
  }
}

const results: SmokeResult[] = []
for (const operation of selectedOperations) {
  results.push(await runOperation(operation))
}

const failed = results.filter((result) => result.status === "failed").length
const skipped = results.filter((result) => result.status === "skipped").length
const ok = results.filter((result) => result.status === "ok").length
const planned = results.filter((result) => result.status === "planned").length

console.log(
  JSON.stringify(
    {
      endpoint: envValue("SEI_SOAP_ENDPOINT"),
      cycle: selectedCycle,
      operation: selectedOperation ?? null,
      allowWrite,
      ok,
      skipped,
      planned,
      failed,
      results,
    },
    null,
    2,
  ),
)
