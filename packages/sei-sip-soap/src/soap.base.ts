/**
 * Infraestrutura SOAP compartilhada entre sip-client e sei-client.
 *
 * Expõe primitivas configuráveis por namespace:
 * - {@link SoapError} — classe de erro base
 * - {@link createSoapArray} — constrói arrays RPC/encoded
 * - {@link buildSoapEnvelope} — serializa envelope XML
 * - {@link parseSoapResponse} — normaliza resposta XML
 * - {@link callSoap} — executa chamada com timeout e tratamento de erros
 *
 * Os clientes instanciam wrappers finos que fixam o namespace e fornecem
 * sua própria subclasse de {@link SoapError}.
 *
 * @packageDocumentation
 * @categoryDescription Tratamento de Erros
 * Classe de erro base e tipo de fábrica de erros usados pelos clientes SOAP.
 * @categoryDescription Transporte SOAP
 * Funções para serializar, enviar e desserializar mensagens SOAP.
 */
import { XMLParser } from "fast-xml-parser"

import type {
  BaseSoapConfig,
  RawMap,
  RawValue,
  ScalarSoapValue,
  SoapArrayValue,
  SoapCallOptions,
  SoapNamespaceConfig,
  SoapParamValue,
  SoapStructValue,
} from "./types.base"

// ─── Classe de erro base ──────────────────────────────────────────────────────

/**
 * Erro SOAP base. Cada client estende esta classe com seu próprio nome
 * (`SipSoapError`, `SeiSoapError`) para permitir `instanceof` específico.
 *
 * @category Tratamento de Erros
 */
export class SoapError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly status: number,
    readonly fault?: string,
  ) {
    super(message)
    this.name = "SoapError"
  }
}

/**
 * Função fábrica que produz uma instância de {@link SoapError} (ou subclasse).
 * @category Tratamento de Erros
 */
export type SoapErrorFactory = (
  message: string,
  operation: string,
  status: number,
  fault?: string,
) => SoapError

// ─── Parser XML ───────────────────────────────────────────────────────────────

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
})

// ─── Serialização ─────────────────────────────────────────────────────────────

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const isSoapArray = (value: SoapParamValue): value is SoapArrayValue =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "arrayType" in value &&
  "itemType" in value &&
  "items" in value

const isSoapStruct = (value: SoapParamValue): value is SoapStructValue =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isSoapArray(value)

const serializeScalarParam = (name: string, value: ScalarSoapValue): string => {
  if (value === null || value === undefined || value === "") {
    return `<${name} xsi:nil="true" />`
  }
  const type = typeof value === "number" ? "xsd:long" : "xsd:string"
  return `<${name} xsi:type="${type}">${escapeXml(String(value))}</${name}>`
}

const serializeStructChildren = (value: SoapStructValue, prefix: string): string =>
  Object.entries(value)
    .map(([childName, childValue]) => serializeParam(childName, childValue, prefix))
    .join("")

const qualifyType = (type: string, prefix: string): string =>
  type.includes(":") ? type : `${prefix}:${type}`

const serializeArrayItem = (itemType: string, prefix: string, value: SoapParamValue): string => {
  if (isSoapStruct(value)) {
    return `<item xsi:type="${qualifyType(itemType, prefix)}">${serializeStructChildren(value, prefix)}</item>`
  }
  return serializeParam("item", value, prefix)
}

const serializeArrayParam = (name: string, value: SoapArrayValue, prefix: string): string => {
  const items = value.items.map((item) => serializeArrayItem(value.itemType, prefix, item)).join("")
  return `<${name} SOAP-ENC:arrayType="${qualifyType(value.itemType, prefix)}[${value.items.length}]" xsi:type="${qualifyType(value.arrayType, prefix)}">${items}</${name}>`
}

const serializeParam = (name: string, value: SoapParamValue, prefix: string): string => {
  if (isSoapArray(value)) {
    return serializeArrayParam(name, value, prefix)
  }
  if (isSoapStruct(value)) {
    return `<${name}>${serializeStructChildren(value, prefix)}</${name}>`
  }
  return serializeScalarParam(name, value)
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Constrói um valor de array SOAP RPC/encoded.
 *
 * @param arrayType - Nome do tipo SOAP do array conforme o WSDL.
 * @param itemType  - Nome do tipo SOAP de cada item.
 * @param items     - Itens do array.
 * @returns O {@link SoapArrayValue} pronto para ser usado como parâmetro em
 *   {@link SoapCallOptions}.
 * @category Transporte SOAP
 */
export const createSoapArray = (
  arrayType: string,
  itemType: string,
  items: readonly SoapParamValue[],
): SoapArrayValue => ({ arrayType, itemType, items })

/**
 * Monta um envelope SOAP RPC/encoded para o namespace fornecido.
 *
 * @param options - Operação e parâmetros.
 * @param ns      - Configuração de namespace (URI, prefixo, SOAPAction).
 * @returns O envelope XML completo, pronto para ser enviado no corpo da
 *   requisição HTTP.
 * @category Transporte SOAP
 */
export const buildSoapEnvelope = (options: SoapCallOptions, ns: SoapNamespaceConfig): string => {
  const params = Object.entries(options.params)
    .map(([name, value]) => serializeParam(name, value, ns.prefix))
    .join("\n      ")
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:${ns.prefix}="${ns.uri}">
  <soapenv:Body>
    <${ns.prefix}:${options.operation} soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      ${params}
    </${ns.prefix}:${options.operation}>
  </soapenv:Body>
</soapenv:Envelope>`
}

// ─── Normalização ─────────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const normalizeSoapValue = (value: unknown): RawValue => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSoapValue)
  }

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
  ) as RawMap
}

const extractFault = (parsed: unknown): string | undefined => {
  const envelope = isRecord(parsed) ? parsed.Envelope : undefined
  const body = isRecord(envelope) ? envelope.Body : undefined
  const fault = isRecord(body) ? body.Fault : undefined
  const faultString = isRecord(fault) ? fault.faultstring : undefined
  return typeof faultString === "string" ? faultString : undefined
}

const extractResponsePayload = (parsed: unknown, operation: string): RawValue => {
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
 * Normaliza XML SOAP em estruturas JS simples.
 *
 * @param xml       - Corpo XML bruto da resposta HTTP.
 * @param operation - Nome da operação SOAP chamada (usado para localizar o
 *   payload em `<{operation}Response>` e para compor o erro em caso de Fault).
 * @param makeError - Fábrica do erro específico do client; usa
 *   {@link SoapError} por padrão.
 * @returns O payload normalizado da operação, ou `null` se a resposta não
 *   contiver o elemento esperado.
 * @throws {@link SoapError} (ou subclasse) quando a resposta contém `<Fault>`.
 * @category Transporte SOAP
 */
export const parseSoapResponse = (
  xml: string,
  operation: string,
  makeError: SoapErrorFactory = (msg, op, status, fault) => new SoapError(msg, op, status, fault),
): RawValue => {
  const parsed = parser.parse(xml) as unknown
  const fault = extractFault(parsed)
  if (fault) {
    throw makeError(fault, operation, 500, fault)
  }
  return extractResponsePayload(parsed, operation)
}

/**
 * Executa uma chamada SOAP com timeout via `AbortController`.
 *
 * @param config    - Config com `endpointUrl` e `requestTimeoutMs`.
 * @param options   - Operação e parâmetros.
 * @param ns        - Namespace (URI, prefixo, SOAPAction).
 * @param makeError - Fábrica do erro específico do client.
 *
 * @returns O payload normalizado da resposta SOAP.
 * @throws {@link SoapError} (ou subclasse) em SOAP Fault, erro HTTP ou timeout.
 * @category Transporte SOAP
 */
export const callSoap = async (
  config: BaseSoapConfig,
  options: SoapCallOptions,
  ns: SoapNamespaceConfig,
  makeError: SoapErrorFactory,
): Promise<RawValue> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: ns.action },
      body: buildSoapEnvelope(options, ns),
      signal: controller.signal,
    })
    const text = await response.text()

    let payload: RawValue
    try {
      payload = parseSoapResponse(text, options.operation, makeError)
    } catch (error) {
      if (error instanceof SoapError) {
        throw makeError(error.message, options.operation, response.status, error.fault)
      }
      throw error
    }

    if (!response.ok) {
      throw makeError(
        `Erro HTTP ${response.status} chamando ${options.operation}.`,
        options.operation,
        response.status,
      )
    }
    return payload
  } catch (error) {
    if (error instanceof SoapError) {
      throw error
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw makeError(
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
