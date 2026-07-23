/**
 * @packageDocumentation
 *
 * Camada de transporte SOAP do cliente SEI.
 *
 * Este módulo é responsável por:
 *
 * 1. **Serialização** — converter parâmetros TypeScript em envelopes XML SOAP
 *    RPC/encoded compatíveis com o WSDL do SEI (PHP SoapServer).
 *    Função: {@link buildSeiSoapEnvelope}.
 *
 * 2. **Transporte** — enviar o envelope via `fetch` com suporte a timeout e
 *    cancelamento por `AbortController`. Função: {@link callSeiSoap}.
 *
 * 3. **Deserialização** — normalizar a resposta XML SOAP em estruturas JS
 *    simples consumíveis pelos mappers. Função: {@link parseSeiSoapResponse}.
 *
 * 4. **Erros** — encapsular falhas HTTP e SOAP Fault em {@link SeiSoapError}.
 *
 * A infraestrutura genérica (parser XML, serialização, normalização) é
 * compartilhada com sip-client via `@anpdgovbr/sei-sip-soap`.
 *
 * @see {@link SeiClient}
 * @see {@link callSeiSoap}
 * @see {@link buildSeiSoapEnvelope}
 */
import {
  SoapError,
  buildSoapEnvelope,
  callSoap,
  createSoapArray as baseSoapArray,
  parseSoapResponse,
} from "@anpdgovbr/sei-sip-soap"

import type {
  SeiConfig,
  SeiRawValue,
  SeiSoapArrayValue,
  SeiSoapCallOptions,
  SeiSoapParamValue,
} from "./types"

// ─── Configuração de namespace SEI ───────────────────────────────────────────

const SEI_NS = { uri: "Sei", prefix: "sei", action: "SeiAction" } as const

// ─── Classe de erro ───────────────────────────────────────────────────────────

/**
 * Erro lançado quando uma chamada SOAP ao SEI falha.
 *
 * Pode representar três casos:
 * - **SOAP Fault** — o servidor retornou `<Fault>` (`status` é o HTTP real).
 * - **Erro HTTP** — resposta fora da faixa 2xx.
 * - **Timeout** — `AbortController` cancelou após `requestTimeoutMs` (`status === 408`).
 *
 * @example
 * ```ts
 * import { SeiSoapError, createSeiClient } from "@anpdgovbr/sei-client"
 *
 * try {
 *   const proc = await sei.consultarProcedimento({ ... })
 * } catch (error) {
 *   if (error instanceof SeiSoapError) {
 *     console.error(`Operação: ${error.operation}`)
 *     console.error(`HTTP status: ${error.status}`)
 *     if (error.fault) console.error(`SOAP fault: ${error.fault}`)
 *   }
 * }
 * ```
 *
 * @see {@link callSeiSoap}
 * @category Tratamento de Erros
 */
export class SeiSoapError extends SoapError {
  constructor(message: string, operation: string, status: number, fault?: string) {
    super(message, operation, status, fault)
    this.name = "SeiSoapError"
  }
}

const makeSeiError = (
  msg: string,
  operation: string,
  status: number,
  fault?: string,
): SeiSoapError => new SeiSoapError(msg, operation, status, fault)

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Cria um valor de array SOAP RPC/encoded para uso em {@link buildSeiSoapEnvelope}.
 *
 * @param arrayType - Nome do tipo SOAP do array conforme o WSDL (ex.: `"ArrayOfUnidade"`).
 * @param itemType  - Nome do tipo SOAP de cada item (ex.: `"Unidade"`, `"xsd:string"`).
 * @param items     - Itens do array.
 * @returns O {@link SeiSoapArrayValue} pronto para ser usado como parâmetro
 *   em {@link SeiSoapCallOptions}.
 *
 * @see {@link SeiSoapArrayValue}
 * @see {@link buildSeiSoapEnvelope}
 * @category Transporte SOAP
 */
export const createSeiSoapArray = (
  arrayType: string,
  itemType: string,
  items: readonly SeiSoapParamValue[],
): SeiSoapArrayValue => baseSoapArray(arrayType, itemType, items)

/**
 * Monta envelopes SOAP RPC/encoded compatíveis com o WSDL do SEI.
 *
 * @param options - Operação e parâmetros a serializar.
 * @returns String XML do envelope SOAP completo.
 *
 * @see {@link callSeiSoap}
 * @see {@link createSeiSoapArray}
 * @category Transporte SOAP
 */
export const buildSeiSoapEnvelope = (options: SeiSoapCallOptions): string =>
  buildSoapEnvelope(options, SEI_NS)

/**
 * Normaliza XML SOAP do SEI para estruturas JS simples.
 *
 * @param xml       - Resposta XML bruta do SEI.
 * @param operation - Nome da operação SOAP.
 * @returns O payload normalizado, ou `null` se o corpo estiver vazio.
 * @throws {@link SeiSoapError} quando a resposta contém um elemento `<Fault>`.
 *
 * @see {@link callSeiSoap}
 * @category Transporte SOAP
 */
export const parseSeiSoapResponse = (xml: string, operation: string): SeiRawValue =>
  parseSoapResponse(xml, operation, makeSeiError)

/**
 * Executa uma chamada SOAP ao SEI com suporte a timeout e tratamento de erros.
 *
 * @param config  - Configuração de conexão com o SEI.
 * @param options - Operação e parâmetros da chamada SOAP.
 * @returns Payload normalizado da resposta.
 * @throws {@link SeiSoapError} em caso de SOAP Fault, erro HTTP ou timeout.
 *
 * @see {@link buildSeiSoapEnvelope}
 * @see {@link parseSeiSoapResponse}
 * @see {@link SeiSoapError}
 * @category Transporte SOAP
 */
export const callSeiSoap = (config: SeiConfig, options: SeiSoapCallOptions): Promise<SeiRawValue> =>
  callSoap(config, options, SEI_NS, makeSeiError)
