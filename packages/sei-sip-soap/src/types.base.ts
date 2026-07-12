/**
 * Tipos SOAP primitivos compartilhados entre sip-client e sei-client.
 *
 * Os clientes re-exportam esses tipos com seus próprios prefixos
 * (`Sip*` / `Sei*`) para manter APIs públicas distintas.
 *
 * @packageDocumentation
 * @categoryDescription SOAP Primitives
 * Tipos de baixo nível usados na serialização e desserialização de mensagens SOAP.
 * @categoryDescription Configuration
 * Tipos de configuração de conexão e namespace SOAP.
 */

/**
 * Valor escalar aceito como parâmetro SOAP.
 * @category SOAP Primitives
 */
export type ScalarSoapValue = string | number | boolean | null | undefined

/**
 * Estrutura SOAP aninhada (objeto literal) sem tipagem de array.
 * @category SOAP Primitives
 */
export interface SoapStructValue {
  readonly [key: string]: SoapParamValue
}

/**
 * Array SOAP RPC/encoded com arrayType e itemType explícitos.
 * @category SOAP Primitives
 */
export type SoapArrayValue = Readonly<{
  arrayType: string
  itemType: string
  items: readonly SoapParamValue[]
}>

/**
 * União de todos os valores aceitos como parâmetro em chamadas SOAP.
 * @category SOAP Primitives
 */
export type SoapParamValue = ScalarSoapValue | SoapStructValue | SoapArrayValue

/**
 * Valor bruto retornado pelo parser XML após normalização.
 * @category SOAP Primitives
 */
export type RawValue = string | number | boolean | null | RawMap | RawValue[]

/**
 * Mapa de chaves/valores brutos resultante da normalização de um objeto XML.
 * @category SOAP Primitives
 */
export interface RawMap {
  readonly [key: string]: RawValue
}

/**
 * Opções para uma chamada SOAP genérica.
 * @category SOAP Primitives
 */
export type SoapCallOptions = Readonly<{
  operation: string
  params: Readonly<Record<string, SoapParamValue>>
}>

/**
 * Campos de configuração comuns a qualquer endpoint SOAP.
 * @category Configuration
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
 * @category Configuration
 */
export type SoapNamespaceConfig = Readonly<{
  /** Namespace URI (ex.: `"sipns"` ou `"Sei"`). */
  uri: string
  /** Prefixo XML do namespace (ex.: `"sip"` ou `"sei"`). */
  prefix: string
  /** Valor do cabeçalho SOAPAction (ex.: `"sipnsAction"` ou `"SeiAction"`). */
  action: string
}>
