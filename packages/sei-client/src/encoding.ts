/**
 * Utilitários de codificação para campos de conteúdo do SEI.
 *
 * O Web Service do SEI espera `Conteudo` e `ConteudoSecoes[].Conteudo` em
 * Base64. Em instalações legadas, o conteúdo textual do editor é armazenado em
 * ISO-8859-1/Latin-1, não em UTF-8.
 *
 * @packageDocumentation
 */

/**
 * Codifica HTML/texto para o formato esperado por `Documento.Conteudo` e
 * `Documento.ConteudoSecoes[].Conteudo` no SEI.
 *
 * @remarks
 * Caracteres fora do repertório Latin-1 são substituídos por `?`, seguindo a
 * limitação prática do SEI legado.
 *
 * @category Encoding
 */
export const encodeSeiLatin1Base64 = (content: string): string =>
  Buffer.from(content, "latin1").toString("base64")
