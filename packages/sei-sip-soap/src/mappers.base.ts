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
 * @category Auxiliares de Mapeamento
 */
export const isMap = (value: RawValue): value is RawMap =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Extrai string ou retorna `null`.
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
 * @category Auxiliares de Mapeamento
 */
export const boolFromSin = (value: RawValue): boolean => stringValue(value) === "S"
