/**
 * @packageDocumentation
 *
 * Camada de transporte SOAP do cliente SIP.
 *
 * Este módulo é responsável por:
 *
 * 1. **Serialização** — converter parâmetros TypeScript em envelopes XML SOAP
 *    RPC/encoded compatíveis com o WSDL legado do SIP (PHP SoapServer).
 *    Função: {@link buildSipSoapEnvelope}.
 *
 * 2. **Transporte** — enviar o envelope via `fetch` com suporte a timeout e
 *    cancelamento por `AbortController`. Função: {@link callSipSoap}.
 *
 * 3. **Deserialização** — normalizar a resposta XML SOAP em estruturas JS
 *    simples consumíveis pelos mappers. Função: {@link parseSipSoapResponse}.
 *
 * 4. **Erros** — encapsular falhas HTTP e SOAP Fault em {@link SipSoapError}.
 *
 * Consumidores normais não precisam usar este módulo diretamente — basta
 * instanciar {@link SipClient} ou {@link SipConsultasClient}.
 *
 * @see {@link SipClient}
 * @see {@link callSipSoap}
 * @see {@link buildSipSoapEnvelope}
 */
import { XMLParser } from "fast-xml-parser"

import type {
  SipConfig,
  SipRawMap,
  SipRawValue,
  SipScalarSoapValue,
  SipSoapArrayValue,
  SipSoapCallOptions,
  SipSoapParamValue,
  SipSoapStructValue,
} from "./types"

/**
 * Erro lançado quando uma chamada SOAP ao SIP falha.
 *
 * Pode representar dois casos distintos:
 * - **SOAP Fault** — o servidor retornou um elemento `<Fault>` no corpo da
 *   resposta (ex.: serviço não liberado para o sistema, chave inválida).
 * - **Erro HTTP** — a resposta teve status fora da faixa 2xx (ex.: 404, 500).
 * - **Timeout** — o `AbortController` cancelou a requisição após
 *   `requestTimeoutMs` milissegundos (`status === 408`).
 *
 * @example
 * ```ts
 * import { SipSoapError, createSipClient } from "@anpdgovbr/sip-client"
 *
 * try {
 *   const usuarios = await sip.buscarUsuarios({ siglaUsuario: "joao.silva" })
 * } catch (error) {
 *   if (error instanceof SipSoapError) {
 *     console.error(`Operação: ${error.operation}`)
 *     console.error(`HTTP status: ${error.status}`)
 *     if (error.fault) console.error(`SOAP fault: ${error.fault}`)
 *   }
 * }
 * ```
 *
 * @see {@link callSipSoap}
 */
export class SipSoapError extends Error {
  /**
   * @param message - Mensagem legível descrevendo o erro.
   * @param operation - Nome da operação SOAP que originou o erro.
   * @param status - Código HTTP da resposta (408 para timeout).
   * @param fault - Conteúdo do `<faultstring>` SOAP, quando presente.
   */
  constructor(
    message: string,
    /** Nome da operação SOAP que originou o erro (ex.: `"carregarUsuarios"`). */
    readonly operation: string,
    /** Código HTTP da resposta. `408` indica timeout por `AbortController`. */
    readonly status: number,
    /** Conteúdo do `<faultstring>` SOAP retornado pelo servidor, ou `undefined`. */
    readonly fault?: string,
  ) {
    super(message)
    this.name = "SipSoapError"
  }
}

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
})

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

/**
 * Cria um valor de array SOAP RPC/encoded para uso como parâmetro em
 * {@link buildSipSoapEnvelope}.
 *
 * @remarks
 * O SIP é um serviço PHP legado que usa SOAP RPC/encoded. Cada array requer um
 * `arrayType` (nome do tipo SOAP do container, ex.: `"ArrayOfPermissoes"`) e um
 * `itemType` (tipo dos itens, ex.: `"Permissao"` ou `"xsd:string"`). Esses nomes
 * são definidos no WSDL e devem corresponder exatamente.
 *
 * @param arrayType - Nome do tipo SOAP do array conforme o WSDL
 *   (ex.: `"ArrayOfUsuarios"`, `"ArrayOfIdSistema"`).
 * @param itemType - Nome do tipo SOAP de cada item
 *   (ex.: `"Usuario"`, `"xsd:string"`).
 * @param items - Itens do array; podem ser escalares, structs ou arrays aninhados.
 * @returns Um {@link SipSoapArrayValue} pronto para ser passado como parâmetro.
 *
 * @example
 * ```ts
 * import { createSoapArray, buildSipSoapEnvelope } from "@anpdgovbr/sip-client"
 *
 * const envelope = buildSipSoapEnvelope({
 *   operation: "replicarUsuario",
 *   params: {
 *     ChaveAcesso: "minha-chave",
 *     Usuarios: createSoapArray("ArrayOfUsuarios", "Usuario", [
 *       { StaOperacao: "C", IdOrigem: "ad:joao.silva", IdOrgao: "0",
 *         Sigla: "joao.silva", Nome: "João Silva", NomeSocial: null,
 *         Cpf: "00000000000", Email: "joao@orgao.gov.br" },
 *     ]),
 *   },
 * })
 * ```
 *
 * @see {@link SipSoapArrayValue}
 * @see {@link buildSipSoapEnvelope}
 */
export const createSoapArray = (
  arrayType: string,
  itemType: string,
  items: readonly SipSoapParamValue[],
): SipSoapArrayValue => ({
  arrayType,
  itemType,
  items,
})

const isSoapArray = (value: SipSoapParamValue): value is SipSoapArrayValue =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "arrayType" in value &&
  "itemType" in value &&
  "items" in value

const isSoapStruct = (value: SipSoapParamValue): value is SipSoapStructValue =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isSoapArray(value)

const serializeScalarParam = (name: string, value: SipScalarSoapValue): string => {
  if (value === null || value === undefined || value === "") {
    return `<${name} xsi:nil="true" />`
  }

  const type = typeof value === "number" ? "xsd:long" : "xsd:string"
  return `<${name} xsi:type="${type}">${escapeXml(String(value))}</${name}>`
}

const serializeStructChildren = (value: SipSoapStructValue): string =>
  Object.entries(value)
    .map(([childName, childValue]) => serializeParam(childName, childValue))
    .join("")

const serializeArrayItem = (itemType: string, value: SipSoapParamValue): string => {
  if (isSoapStruct(value)) {
    return `<item xsi:type="${qualifySoapType(itemType)}">${serializeStructChildren(value)}</item>`
  }
  return serializeParam("item", value)
}

const qualifySoapType = (type: string): string => (type.includes(":") ? type : `sip:${type}`)

const serializeArrayParam = (name: string, value: SipSoapArrayValue): string => {
  const items = value.items.map((item) => serializeArrayItem(value.itemType, item)).join("")
  return `<${name} SOAP-ENC:arrayType="${qualifySoapType(value.itemType)}[${value.items.length}]" xsi:type="${qualifySoapType(value.arrayType)}">${items}</${name}>`
}

const serializeParam = (name: string, value: SipSoapParamValue): string => {
  if (isSoapArray(value)) {
    return serializeArrayParam(name, value)
  }
  if (isSoapStruct(value)) {
    return `<${name}>${serializeStructChildren(value)}</${name}>`
  }
  return serializeScalarParam(name, value)
}

/**
 * Monta envelopes SOAP RPC/encoded compatíveis com o WSDL legado do SIP.
 *
 * @remarks
 * O serviço é um PHP SoapServer antigo. Por isso os parâmetros são enviados
 * como filhos diretos da operação, não como um único objeto JSON/XML moderno.
 * Valores `null`/`undefined` são serializados com `xsi:nil="true"`. Strings
 * são escapadas para XML (`&`, `<`, `>`, `"`, `'`).
 *
 * @param options - Operação e parâmetros a serializar.
 * @returns String XML do envelope SOAP completo.
 *
 * @example
 * ```ts
 * import { buildSipSoapEnvelope } from "@anpdgovbr/sip-client"
 *
 * const xml = buildSipSoapEnvelope({
 *   operation: "carregarUsuarios",
 *   params: {
 *     ChaveAcesso: "minha-chave",
 *     IdSistema: 100000100,
 *     SiglaUsuario: "joao&silva", // Escapado para joao&amp;silva
 *     IdUsuario: null,            // Serializado como xsi:nil="true"
 *   },
 * })
 * ```
 *
 * @see {@link callSipSoap}
 * @see {@link createSoapArray}
 */
export const buildSipSoapEnvelope = (options: SipSoapCallOptions): string => {
  const params = Object.entries(options.params).map(([name, value]) => serializeParam(name, value))
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:sip="sipns">
  <soapenv:Body>
    <sip:${options.operation} soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      ${params.join("\n      ")}
    </sip:${options.operation}>
  </soapenv:Body>
</soapenv:Envelope>`
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Normaliza um valor XML parseado pelo fast-xml-parser em {@link SipRawValue}.
 *
 * @remarks
 * O SIP devolve três formatos principais:
 * - arrays SOAP com `<item>`;
 * - mapas PHP `xml-soap` com pares `<key>/<value>`;
 * - objetos nomeados, como `Permissao`.
 *
 * @internal
 */
const normalizeSoapValue = (value: unknown): SipRawValue => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSoapValue)
  }

  // value aqui só pode ser function | symbol | bigint (objetos reais já
  // foram tratados por isRecord), então nenhum dos branches produz "[object Object]".
  if (!isRecord(value)) {
    if (typeof value === "function") {
      return value.toString()
    }
    if (typeof value === "symbol" || typeof value === "bigint") {
      return String(value)
    }
    return null
  }

  if (value.nil === "true") {
    return null
  }

  if ("#text" in value) {
    return normalizeSoapValue(value["#text"])
  }

  if ("arrayType" in value && !("item" in value)) {
    return []
  }

  if ("item" in value && Object.keys(value).length <= 3) {
    return normalizeSoapValue(value.item)
  }

  const entries = Object.entries(value).filter(([key]) => !key.includes(":") && key !== "type")
  return Object.fromEntries(
    entries.map(([key, child]) => [key, normalizeSoapValue(child)]),
  ) as SipRawMap
}

const extractFault = (parsed: unknown): string | undefined => {
  const envelope = isRecord(parsed) ? parsed.Envelope : undefined
  const body = isRecord(envelope) ? envelope.Body : undefined
  const fault = isRecord(body) ? body.Fault : undefined
  const faultString = isRecord(fault) ? fault.faultstring : undefined
  return typeof faultString === "string" ? faultString : undefined
}

const extractResponsePayload = (parsed: unknown, operation: string): SipRawValue => {
  const envelope = isRecord(parsed) ? parsed.Envelope : undefined
  const body = isRecord(envelope) ? envelope.Body : undefined
  const response = isRecord(body) ? body[`${operation}Response`] : undefined
  if (!isRecord(response)) {
    return null
  }

  const payloadKey = Object.keys(response).find((key) => !key.includes(":") && key !== "type")
  return payloadKey ? normalizeSoapValue(response[payloadKey]) : null
}

/**
 * Normaliza XML SOAP do PHP para estruturas JS simples.
 *
 * @remarks
 * O SIP devolve três formatos principais:
 * - **Arrays SOAP** com `<item>` (ex.: lista de órgãos);
 * - **Mapas PHP** `xml-soap` com pares `<key>/<value>` (ex.: usuários);
 * - **Objetos nomeados** como `Permissao` (ex.: lista de permissões).
 *
 * Esta função lida com todos eles, removendo prefixos de namespace, resolvendo
 * `xsi:nil`, extraindo valores de `#text` e descartando atributos SOAP
 * (`type`, prefixados com `:`).
 *
 * @param xml - Resposta XML bruta do SIP.
 * @param operation - Nome da operação SOAP (usado para localizar
 *   `<${operation}Response>` no corpo da resposta).
 * @returns O payload normalizado, ou `null` se o corpo estiver vazio.
 * @throws {@link SipSoapError} quando a resposta contém um elemento `<Fault>`.
 *
 * @example
 * ```ts
 * import { parseSipSoapResponse } from "@anpdgovbr/sip-client"
 *
 * const raw = parseSipSoapResponse(xmlString, "carregarOrgaos")
 * // raw: SipRawValue — string[][], SipRawMap[], etc.
 * ```
 *
 * @see {@link callSipSoap}
 */
export const parseSipSoapResponse = (xml: string, operation: string): SipRawValue => {
  const parsed = parser.parse(xml) as unknown
  const fault = extractFault(parsed)
  if (fault) {
    throw new SipSoapError(fault, operation, 500, fault)
  }
  return extractResponsePayload(parsed, operation)
}

/**
 * Executa uma chamada SOAP ao SIP com suporte a timeout e tratamento de erros.
 *
 * @remarks
 * O envelope SOAP é construído por {@link buildSipSoapEnvelope} e enviado via
 * `fetch` com `Content-Type: text/xml` e `SOAPAction: sipnsAction`. A resposta
 * é processada por {@link parseSipSoapResponse}.
 *
 * O timeout é implementado com `AbortController`; ao expirar,
 * `AbortError` é capturado e relançado como {@link SipSoapError} com
 * `status === 408`.
 *
 * A ordem de prioridade ao tratar a resposta é:
 * 1. SOAP Fault detectado no XML → {@link SipSoapError} com `status` HTTP real.
 * 2. Status HTTP não-ok sem fault → {@link SipSoapError} com o status recebido.
 * 3. Sucesso → retorna o payload normalizado.
 *
 * @param config - Configuração de conexão com o SIP.
 * @param options - Operação e parâmetros da chamada SOAP.
 * @returns Payload normalizado da resposta (`SipRawValue`).
 * @throws {@link SipSoapError} em caso de SOAP Fault, erro HTTP ou timeout.
 *
 * @example
 * ```ts
 * import { callSipSoap } from "@anpdgovbr/sip-client"
 *
 * const payload = await callSipSoap(config, {
 *   operation: "carregarOrgaos",
 *   params: { ChaveAcesso: config.accessKey, IdSistema: 100000100, SinTodos: "S" },
 * })
 * ```
 *
 * @see {@link buildSipSoapEnvelope}
 * @see {@link parseSipSoapResponse}
 * @see {@link SipSoapError}
 */
export const callSipSoap = async (
  config: SipConfig,
  options: SipSoapCallOptions,
): Promise<SipRawValue> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "sipnsAction",
      },
      body: buildSipSoapEnvelope(options),
      signal: controller.signal,
    })
    const text = await response.text()
    try {
      const payload = parseSipSoapResponse(text, options.operation)
      if (!response.ok) {
        throw new SipSoapError(
          `Erro HTTP ${response.status} chamando ${options.operation}.`,
          options.operation,
          response.status,
        )
      }
      return payload
    } catch (error) {
      if (error instanceof SipSoapError) {
        throw new SipSoapError(error.message, options.operation, response.status, error.fault)
      }
      throw error
    }
  } catch (error) {
    if (error instanceof SipSoapError) {
      throw error
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new SipSoapError(
        `Tempo limite excedido chamando ${options.operation}.`,
        options.operation,
        408,
      )
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
