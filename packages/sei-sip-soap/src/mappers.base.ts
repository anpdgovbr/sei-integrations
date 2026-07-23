/**
 * Helpers de mapeamento compartilhados entre sip-client e sei-client.
 *
 * @packageDocumentation
 * @categoryDescription Auxiliares de Mapeamento
 * Utilitários para extrair e converter valores de respostas SOAP normalizadas.
 */
import type { RawMap, RawValue } from "./types.base"

/**
 * Garante array — trata `null`/valor único transparentemente.
 *
 * O PHP SOAP retorna um único item como valor escalar/objeto e múltiplos
 * itens como array; este helper normaliza os dois casos para sempre
 * trabalhar com array.
 *
 * @param value - Valor bruto normalizado do XML SOAP.
 * @returns `value` se já for array; `[]` se `null`/`undefined`; ou
 *   `[value]` para qualquer outro valor único.
 * @category Auxiliares de Mapeamento
 */
export const asArray = (value: RawValue): RawValue[] => {
  if (Array.isArray(value)) {
    return value
  }
  if (value === null || value === undefined) {
    return []
  }
  return [value]
}

/**
 * Guard: o valor é um `RawMap` (objeto XML normalizado).
 *
 * @param value - Valor bruto normalizado do XML SOAP.
 * @returns `true` se `value` for um objeto (não array, não `null`).
 * @category Auxiliares de Mapeamento
 */
export const isMap = (value: RawValue): value is RawMap =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Extrai string ou retorna `null`.
 *
 * Números e booleanos são convertidos para string; qualquer outro valor
 * (incluindo `RawMap` e arrays) resulta em `null`.
 *
 * @param value - Valor bruto normalizado do XML SOAP.
 * @returns A string extraída, ou `null` se `value` não puder ser
 *   representado como string.
 * @category Auxiliares de Mapeamento
 */
export const stringValue = (value: RawValue): string | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

/**
 * Extrai string obrigatória — lança se ausente, vazia ou não-string.
 *
 * @param value - Valor bruto normalizado do XML SOAP.
 * @param field - Nome do campo, usado apenas na mensagem de erro.
 * @returns A string extraída de `value`.
 * @throws Error se `value` for `null`, `undefined`, string vazia ou um
 *   valor que não pode ser convertido para string (ver {@link stringValue}).
 * @category Auxiliares de Mapeamento
 */
export const requiredString = (value: RawValue, field: string): string => {
  const str = stringValue(value)
  if (!str) {
    throw new Error(`Campo obrigatório ausente: ${field}`)
  }
  return str
}

/**
 * Converte flag `"S"` / `"N"` do SEI/SIP para booleano.
 *
 * Qualquer valor diferente de `"S"` é tratado como `false`.
 *
 * @param value - Valor bruto normalizado do XML SOAP (`"S"`, `"N"` ou outro).
 * @returns `true` somente quando `value` for exatamente `"S"`.
 * @category Auxiliares de Mapeamento
 */
export const boolFromSin = (value: RawValue): boolean => stringValue(value) === "S"
