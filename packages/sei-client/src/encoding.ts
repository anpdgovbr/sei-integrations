/**
 * Utilitários de codificação para campos de conteúdo do SEI.
 *
 * O Web Service do SEI espera `Conteudo` e `ConteudoSecoes[].Conteudo` em
 * Base64.
 *
 * @packageDocumentation
 */

/**
 * Codifica HTML/texto para o formato esperado por `Documento.Conteudo` e
 * `Documento.ConteudoSecoes[].Conteudo` no SEI.
 *
 * @category Encoding
 */
export const encodeSeiBase64 = (content: string): string =>
  Buffer.from(content, "utf8").toString("base64")
