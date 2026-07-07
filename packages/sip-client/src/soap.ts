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

export class SipSoapError extends Error {
  constructor(
    message: string,
    readonly operation: string,
    readonly status: number,
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
 * O serviço é PHP SoapServer antigo. Por isso os parâmetros são enviados como
 * filhos diretos da operação, não como um único objeto JSON/XML moderno.
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
 * Normaliza XML SOAP do PHP para estruturas JS simples.
 *
 * O SIP devolve três formatos principais:
 * - arrays SOAP com `<item>`;
 * - mapas PHP `xml-soap` com pares `<key>/<value>`;
 * - objetos nomeados, como `Permissao`.
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

  if (!isRecord(value)) {
    return String(value)
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

export const parseSipSoapResponse = (xml: string, operation: string): SipRawValue => {
  const parsed = parser.parse(xml) as unknown
  const fault = extractFault(parsed)
  if (fault) {
    throw new SipSoapError(fault, operation, 500, fault)
  }
  return extractResponsePayload(parsed, operation)
}

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
