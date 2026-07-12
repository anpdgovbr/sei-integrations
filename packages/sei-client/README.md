# @anpdgovbr/sei-client

Cliente TypeScript para integração SOAP direta com o SEI.

Este pacote expõe uma API inicial para consultas, criação de processos,
documentos, blocos, andamentos, marcadores, publicações, e-mail e ouvidoria.
Ele é agnóstico de aplicação: não lê `.env`, não conhece framework, banco,
cache, auditoria, autorização, UI ou regras de produto.

O guia operacional fica em [`../../doc/sei-client.md`](../../doc/sei-client.md).

## Blocos

O SEI diferencia tipos de bloco. Documento pode ser incluído em bloco de
assinatura (`Tipo=A`), mas processo não: para
`incluirProcessoBloco`/`retirarProcessoBloco`, use bloco interno ou outro tipo
compatível. Essa restrição vem do SEI e não do cliente TypeScript.

## Marcadores e controle de prazo

`definirMarcador` registra marcador em processo e não possui operação par de
remoção no Web Service do SEI. Já controles de prazo têm ciclo explícito:
`definirControlePrazo`, `concluirControlePrazo` e `removerControlePrazo`.

## Upload em partes

`adicionarArquivo` inicia um anexo temporário usando tamanho total em bytes,
MD5 hexadecimal do arquivo completo e a primeira parte em Base64.
`adicionarConteudoArquivo` envia partes adicionais em Base64 até completar o
tamanho declarado.

## Conteúdo de documentos

O SEI espera `Documento.Conteudo` e `Documento.ConteudoSecoes[].Conteudo` em
Base64.

```ts
import { encodeSeiBase64 } from "@anpdgovbr/sei-client"

await sei.operacoes.incluirDocumento({
  idUnidade: "110000036",
  documento: {
    tipo: "G",
    protocoloProcedimento: "00261.000000/2026-00",
    idSerie: "5",
    nivelAcesso: "0",
    conteudoSecoes: [
      {
        nome: "Corpo do Texto",
        conteudo: encodeSeiBase64("<p>Conteúdo do documento</p>"),
      },
    ],
  },
})
```
