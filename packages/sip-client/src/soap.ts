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
 * A infraestrutura genérica (parser XML, serialização, normalização) é
 * compartilhada com sei-client via `@anpdgovbr/sei-sip-soap`.
 *
 * @see {@link SipClient}
 * @see {@link callSipSoap}
 * @see {@link buildSipSoapEnvelope}
 */
import {
  SoapError,
  createSoapArray as baseSoapArray,
  buildSoapEnvelope,
  callSoap,
  parseSoapResponse,
} from "@anpdgovbr/sei-sip-soap"

import type {
  SipConfig,
  SipRawValue,
  SipSoapArrayValue,
  SipSoapCallOptions,
  SipSoapParamValue,
} from "./types"

// ─── Configuração de namespace SIP ───────────────────────────────────────────

const SIP_NS = { uri: "sipns", prefix: "sip", action: "sipnsAction" } as const

// ─── Classe de erro ───────────────────────────────────────────────────────────

/**
 * Erro lançado quando uma chamada SOAP ao SIP falha.
 *
 * Pode representar três casos:
 * - **SOAP Fault** — o servidor retornou `<Fault>` (`status` é o HTTP real).
 * - **Erro HTTP** — resposta fora da faixa 2xx.
 * - **Timeout** — `AbortController` cancelou após `requestTimeoutMs` (`status === 408`).
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
 * @category Tratamento de Erros
 */
export class SipSoapError extends SoapError {
  constructor(message: string, operation: string, status: number, fault?: string) {
    super(message, operation, status, fault)
    this.name = "SipSoapError"
  }
}

const makeSipError = (
  msg: string,
  operation: string,
  status: number,
  fault?: string,
): SipSoapError => new SipSoapError(msg, operation, status, fault)

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Cria um valor de array SOAP RPC/encoded para uso como parâmetro em
 * {@link buildSipSoapEnvelope}.
 *
 * @param arrayType - Nome do tipo SOAP do array conforme o WSDL.
 * @param itemType  - Nome do tipo SOAP de cada item.
 * @param items     - Itens do array.
 * @returns O {@link SipSoapArrayValue} pronto para ser usado como parâmetro
 *   em {@link SipSoapCallOptions}.
 *
 * @see {@link SipSoapArrayValue}
 * @see {@link buildSipSoapEnvelope}
 * @category Transporte SOAP
 */
export const createSoapArray = (
  arrayType: string,
  itemType: string,
  items: readonly SipSoapParamValue[],
): SipSoapArrayValue => baseSoapArray(arrayType, itemType, items)

/**
 * Monta envelopes SOAP RPC/encoded compatíveis com o WSDL legado do SIP.
 *
 * @param options - Operação e parâmetros a serializar.
 * @returns String XML do envelope SOAP completo.
 *
 * @see {@link callSipSoap}
 * @see {@link createSoapArray}
 * @category Transporte SOAP
 */
export const buildSipSoapEnvelope = (options: SipSoapCallOptions): string =>
  buildSoapEnvelope(options, SIP_NS)

/**
 * Normaliza XML SOAP do PHP para estruturas JS simples.
 *
 * @param xml       - Resposta XML bruta do SIP.
 * @param operation - Nome da operação SOAP.
 * @returns O payload normalizado, ou `null` se o corpo estiver vazio.
 * @throws {@link SipSoapError} quando a resposta contém um elemento `<Fault>`.
 *
 * @see {@link callSipSoap}
 * @category Transporte SOAP
 */
export const parseSipSoapResponse = (xml: string, operation: string): SipRawValue =>
  parseSoapResponse(xml, operation, makeSipError)

/**
 * Executa uma chamada SOAP ao SIP com suporte a timeout e tratamento de erros.
 *
 * @param config  - Configuração de conexão com o SIP.
 * @param options - Operação e parâmetros da chamada SOAP.
 * @returns Payload normalizado da resposta.
 * @throws {@link SipSoapError} em caso de SOAP Fault, erro HTTP ou timeout.
 *
 * @see {@link buildSipSoapEnvelope}
 * @see {@link parseSipSoapResponse}
 * @see {@link SipSoapError}
 * @category Transporte SOAP
 */
export const callSipSoap = (config: SipConfig, options: SipSoapCallOptions): Promise<SipRawValue> =>
  callSoap(config, options, SIP_NS, makeSipError)
