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
  ...(
    [
      [4, "enviarProcesso", "sei.operacoes.enviarProcesso"],
      [4, "atribuirProcesso", "sei.operacoes.atribuirProcesso"],
      [4, "concluirProcesso", "sei.operacoes.concluirProcesso"],
      [4, "reabrirProcesso", "sei.operacoes.reabrirProcesso"],
      [4, "bloquearProcesso", "sei.operacoes.bloquearProcesso"],
      [4, "desbloquearProcesso", "sei.operacoes.desbloquearProcesso"],
      [4, "bloquearDocumento", "sei.operacoes.bloquearDocumento"],
      [4, "cancelarDocumento", "sei.operacoes.cancelarDocumento"],
      [4, "excluirDocumento", "sei.operacoes.excluirDocumento"],
      [4, "excluirProcesso", "sei.operacoes.excluirProcesso"],
      [4, "relacionarProcesso", "sei.operacoes.relacionarProcesso"],
      [4, "removerRelacionamentoProcesso", "sei.operacoes.removerRelacionamentoProcesso"],
      [4, "anexarProcesso", "sei.operacoes.anexarProcesso"],
      [4, "desanexarProcesso", "sei.operacoes.desanexarProcesso"],
      [4, "sobrestarProcesso", "sei.operacoes.sobrestarProcesso"],
      [4, "removerSobrestamentoProcesso", "sei.operacoes.removerSobrestamentoProcesso"],
      [5, "gerarBloco", "sei.operacoes.gerarBloco"],
      [5, "alterarBloco", "sei.operacoes.alterarBloco"],
      [5, "disponibilizarBloco", "sei.operacoes.disponibilizarBloco"],
      [5, "cancelarDisponibilizacaoBloco", "sei.operacoes.cancelarDisponibilizacaoBloco"],
      [5, "incluirDocumentoBloco", "sei.operacoes.incluirDocumentoBloco"],
      [5, "retirarDocumentoBloco", "sei.operacoes.retirarDocumentoBloco"],
      [5, "incluirProcessoBloco", "sei.operacoes.incluirProcessoBloco"],
      [5, "retirarProcessoBloco", "sei.operacoes.retirarProcessoBloco"],
      [5, "concluirBloco", "sei.operacoes.concluirBloco"],
      [5, "reabrirBloco", "sei.operacoes.reabrirBloco"],
      [5, "devolverBloco", "sei.operacoes.devolverBloco"],
      [5, "excluirBloco", "sei.operacoes.excluirBloco"],
      [6, "definirMarcador", "sei.operacoes.definirMarcador"],
      [6, "definirControlePrazo", "sei.operacoes.definirControlePrazo"],
      [6, "concluirControlePrazo", "sei.operacoes.concluirControlePrazo"],
      [6, "removerControlePrazo", "sei.operacoes.removerControlePrazo"],
      [7, "atualizarContatos", "sei.operacoes.atualizarContatos"],
      [7, "adicionarArquivo", "sei.consultas.adicionarArquivo"],
      [7, "adicionarConteudoArquivo", "sei.consultas.adicionarConteudoArquivo"],
      [7, "enviarEmail", "sei.operacoes.enviarEmail"],
      [7, "registrarOuvidoria", "sei.operacoes.registrarOuvidoria"],
      [8, "agendarPublicacao", "sei.operacoes.agendarPublicacao"],
      [8, "alterarPublicacao", "sei.operacoes.alterarPublicacao"],
      [8, "cancelarAgendamentoPublicacao", "sei.operacoes.cancelarAgendamentoPublicacao"],
      [
        8,
        "confirmarDisponibilizacaoPublicacao",
        "sei.operacoes.confirmarDisponibilizacaoPublicacao",
      ],
    ] as const
  ).map(([cycle, name, method]) => ({
    cycle: cycle as SmokeCycle,
    name: String(name),
    method: String(method),
    effect: (cycle === 7 && name === "enviarEmail" ? "external" : "write") as SmokeEffect,
    status: "planned" as SmokeStatus,
  })),
]

const selectedOperations = operations.filter((operation) => {
  const cycleMatches = selectedCycle === "all" || operation.cycle === selectedCycle
  const operationMatches = !selectedOperation || operation.name === selectedOperation
  return cycleMatches && operationMatches
})

if (!selectedOperations.length) {
  throw new Error("Nenhuma operacao SEI encontrada para os filtros informados.")
}

const plan = selectedOperations.map(({ cycle, name, method, effect, status, requiredEnv }) => ({
  cycle,
  name,
  method,
  effect,
  status,
  requiredEnv: requiredEnv ?? [],
}))

if (planOnly || listOnly) {
  console.log(
    JSON.stringify({ selectedCycle, selectedOperation: selectedOperation ?? null, plan }, null, 2),
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
