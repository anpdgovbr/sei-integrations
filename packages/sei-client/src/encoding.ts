/**
 * Utilitários de codificação para campos de conteúdo do SEI.
 *
 * O Web Service do SEI, de modo geral, opera em Latin-1 (ISO-8859-1) como
 * charset legado. A exceção conhecida são os campos de conteúdo de documento
 * — `Documento.Conteudo` e `Documento.ConteudoSecoes[].Conteudo` — que devem
 * ser enviados em Base64 UTF-8 (não Latin-1) para que acentuação em
 * português seja preenchida corretamente. Use {@link encodeSeiBase64} para
 * codificar esses campos.
 *
 * @packageDocumentation
 */

/**
 * Codifica HTML/texto UTF-8 em Base64, formato esperado por
 * `Documento.Conteudo` e `Documento.ConteudoSecoes[].Conteudo` no SEI.
 *
 * @remarks
 * Usa `Buffer`, portanto requer runtime Node.js (>= 22, conforme `engines`
 * do pacote). Para conteúdo binário (PDF, imagens), codifique os bytes
 * diretamente com `buffer.toString("base64")` em vez desta função.
 *
 * @param content - HTML ou texto puro a codificar.
 * @returns O conteúdo codificado em Base64.
 *
 * @example
 * ```ts
 * import { encodeSeiBase64 } from "@anpdgovbr/sei-client"
 *
 * const conteudo = encodeSeiBase64("<p>Conteúdo do documento</p>")
 * ```
 *
 * @see {@link SeiDocumentoInput}
 * @category Codificação
 */
export const encodeSeiBase64 = (content: string): string =>
  Buffer.from(content, "utf8").toString("base64")
