/**
 * Tipos SOAP primitivos compartilhados entre sip-client e sei-client.
 *
 * Os clientes re-exportam esses tipos com seus próprios prefixos
 * (`Sip*` / `Sei*`) para manter APIs públicas distintas.
 *
 * @packageDocumentation
 * @categoryDescription Primitivas SOAP
 * Tipos de baixo nível usados na serialização e desserialização de mensagens SOAP.
 * @categoryDescription Configuração
 * Tipos de configuração de conexão e namespace SOAP.
 */

/**
 * Valor escalar aceito como parâmetro SOAP.
 * @category Primitivas SOAP
 */
export type ScalarSoapValue = string | number | boolean | null | undefined

/**
 * Estrutura SOAP aninhada (objeto literal) sem tipagem de array.
 * @category Primitivas SOAP
 */
export interface SoapStructValue {
  readonly [key: string]: SoapParamValue
}

/**
 * Array SOAP RPC/encoded com arrayType e itemType explícitos.
 * @category Primitivas SOAP
 */
export type SoapArrayValue = Readonly<{
  arrayType: string
  itemType: string
  items: readonly SoapParamValue[]
}>

/**
 * União de todos os valores aceitos como parâmetro em chamadas SOAP.
 * @category Primitivas SOAP
 */
export type SoapParamValue = ScalarSoapValue | SoapStructValue | SoapArrayValue

/**
 * Valor bruto retornado pelo parser XML após normalização.
 * @category Primitivas SOAP
 */
export type RawValue = string | number | boolean | null | RawMap | RawValue[]

/**
 * Mapa de chaves/valores brutos resultante da normalização de um objeto XML.
 * @category Primitivas SOAP
 */
export interface RawMap {
  readonly [key: string]: RawValue
}

/**
 * Opções para uma chamada SOAP genérica.
 * @category Primitivas SOAP
 */
export type SoapCallOptions = Readonly<{
  operation: string
  params: Readonly<Record<string, SoapParamValue>>
}>

/**
 * Campos de configuração comuns a qualquer endpoint SOAP.
 * @category Configuração
 */
export type BaseSoapConfig = Readonly<{
  endpointUrl: string
  requestTimeoutMs: number
}>

/**
 * Configuração de namespace SOAP específica de cada serviço.
 *
 * @example SIP: `{ uri: "sipns", prefix: "sip", action: "sipnsAction" }`
 * @example SEI: `{ uri: "Sei",   prefix: "sei", action: "SeiAction"   }`
 * @category Configuração
 */
export type SoapNamespaceConfig = Readonly<{
  /** Namespace URI (ex.: `"sipns"` ou `"Sei"`). */
  uri: string
  /** Prefixo XML do namespace (ex.: `"sip"` ou `"sei"`). */
  prefix: string
  /** Valor do cabeçalho SOAPAction (ex.: `"sipnsAction"` ou `"SeiAction"`). */
  action: string
}>
