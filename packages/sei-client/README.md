# @anpdgovbr/sei-client

[![npm](https://img.shields.io/npm/v/%40anpdgovbr%2Fsei-client)](https://www.npmjs.com/package/@anpdgovbr/sei-client)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![module](https://img.shields.io/badge/module-ESM%20%2B%20CJS-yellow.svg)](package.json)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](../../tsconfig.base.json)

Cliente TypeScript para chamadas SOAP RPC/encoded ao Web Service do SEI
(`SeiWS.php`) — sem dependência de framework, `.env` ou runtime específico
além de Node.js 22+. A aplicação consumidora resolve configuração, cache,
autorização, logging e persistência.

A API segue o contrato do SEI 5.0.4 e cobre consultas, criação de processos e
documentos, tramitação, blocos, marcadores, controle de prazo, anotações,
publicações, e-mail e ouvidoria.

O guia operacional fica em [`../../doc/sei-client.md`](../../doc/sei-client.md).

## Sumário

- [Instalação](#instalação)
- [Uso](#uso)
- [Métodos principais](#métodos-principais)
- [Tratamento de erros](#tratamento-de-erros)
- [Conteúdo de documentos](#conteúdo-de-documentos)
- [Blocos](#blocos)
- [Marcadores e controle de prazo](#marcadores-e-controle-de-prazo)
- [Upload em partes](#upload-em-partes)
- [Responsabilidades do consumidor](#responsabilidades-do-consumidor)

## Instalação

```bash
npm install @anpdgovbr/sei-client
# ou
yarn add @anpdgovbr/sei-client
# ou
pnpm add @anpdgovbr/sei-client
```

## Uso

```ts
import { createSeiClient } from "@anpdgovbr/sei-client"

const sei = createSeiClient({
  endpointUrl: "https://sei.orgao.gov.br/sei/ws/SeiWS.php",
  siglaSistema: process.env.SEI_SIGLA_SISTEMA!,
  identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
  requestTimeoutMs: 30_000,
})

// Consultas (somente leitura)
const unidades = await sei.consultas.listarUnidades()
const proc = await sei.consultas.consultarProcedimento({
  idUnidade: "110000001",
  protocoloProcedimento: "00000.000001/2026-01",
})

// Operações (alteram estado)
const retorno = await sei.operacoes.gerarProcedimento({
  idUnidade: "110000001",
  procedimento: {
    idTipoProcedimento: "100000101",
    especificacao: "Integração via sei-client",
    assuntos: [{ codigoEstruturado: "06.01.01" }],
    interessados: [],
    nivelAcesso: "0",
  },
})
```

> O pacote não lê variáveis de ambiente. `SiglaSistema` e
> `IdentificacaoServico` são cadastrados no SEI (Administração → Sistemas) e
> devem ser tratados como segredos server-side.

## Métodos principais

A fachada `SeiClient` agrupa dois subclients: `consultas`
(`SeiConsultasClient`, somente leitura) e `operacoes` (`SeiOperacoesClient`,
escrita). Os métodos mais comuns também existem como atalhos na raiz.

### Consultas (`sei.consultas.*`)

| Método                             | Descrição                                    |
| ---------------------------------- | -------------------------------------------- |
| `listarUnidades`                   | Unidades liberadas para o sistema integrador |
| `listarUsuarios`                   | Usuários com acesso à unidade                |
| `listarTiposProcedimento`          | Tipos de processo disponíveis                |
| `listarSeries`                     | Séries (tipos de documento)                  |
| `listarContatos`                   | Contatos, com filtros e paginação            |
| `consultarProcedimento`            | Dados completos de um processo               |
| `consultarDocumento`               | Dados completos de um documento              |
| `consultarBloco`                   | Dados de um bloco e seus protocolos          |
| `consultarPublicacao`              | Publicação oficial de um documento           |
| `listarAndamentos`                 | Histórico de andamentos de um processo       |
| `listarMarcadoresUnidade`          | Marcadores configurados na unidade           |
| `listarHipotesesLegais`            | Hipóteses legais de restrição de acesso      |
| `listarExtensoesPermitidas`        | Extensões de arquivo aceitas                 |
| `listarFeriados`                   | Feriados do órgão/unidade                    |
| `adicionarArquivo`                 | Inicia upload de arquivo em partes           |
| `listarTiposProcedimentoOuvidoria` | Tipos de processo habilitados para ouvidoria |

### Operações (`sei.operacoes.*`)

| Método                                     | Descrição                                |
| ------------------------------------------ | ---------------------------------------- |
| `gerarProcedimento`                        | Cria processo (com documentos opcionais) |
| `incluirDocumento`                         | Inclui documento em processo             |
| `enviarProcesso`                           | Tramita processo entre unidades          |
| `concluirProcesso` / `reabrirProcesso`     | Conclui/reabre processo na unidade       |
| `atribuirProcesso`                         | Atribui processo a usuário               |
| `lancarAndamento`                          | Registra andamento                       |
| `anexarProcesso` / `desanexarProcesso`     | Anexação de processos                    |
| `relacionarProcesso`                       | Relacionamento entre processos           |
| `sobrestarProcesso`                        | Sobrestamento                            |
| `gerarBloco` / `incluirDocumentoBloco` ... | Ciclo completo de blocos                 |
| `definirMarcador`                          | Marcadores em lote                       |
| `definirControlePrazo` ...                 | Ciclo de controle de prazo               |
| `registrarAnotacao`                        | Anotações (post-its) em lote             |
| `agendarPublicacao` ...                    | Ciclo de publicação oficial              |
| `enviarEmail`                              | E-mail com documento gerado no processo  |
| `registrarOuvidoria`                       | Manifestação de ouvidoria                |

A lista completa, com parâmetros e tipos, está na documentação TypeDoc do
monorepo.

## Tratamento de erros

Todas as falhas de comunicação viram `SeiSoapError`, com `operation`, `status`
HTTP (408 em timeout) e `fault` quando o SEI retorna SOAP Fault:

```ts
import { SeiSoapError } from "@anpdgovbr/sei-client"

try {
  await sei.consultas.consultarProcedimento({ ... })
} catch (error) {
  if (error instanceof SeiSoapError) {
    console.error(error.operation, error.status, error.fault)
  }
}
```

## Conteúdo de documentos

O SEI espera `Documento.Conteudo` e `Documento.ConteudoSecoes[].Conteudo` em
Base64. Use `encodeSeiBase64` para HTML/texto:

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

## Blocos

O SEI diferencia tipos de bloco: `A` (assinatura), `R` (reunião) e `I`
(interno). Documento pode ser incluído em bloco de assinatura (`Tipo=A`), mas
processo não: para `incluirProcessoBloco`/`retirarProcessoBloco`, use bloco
interno ou outro tipo compatível. Essa restrição vem do SEI e não do cliente
TypeScript.

## Marcadores e controle de prazo

`definirMarcador` registra marcador em processo e não possui operação par de
remoção no Web Service do SEI. Já controles de prazo têm ciclo explícito:
`definirControlePrazo`, `concluirControlePrazo` e `removerControlePrazo`.

## Upload em partes

`adicionarArquivo` inicia um anexo temporário usando tamanho total em bytes,
MD5 hexadecimal do arquivo completo e a primeira parte em Base64.
`adicionarConteudoArquivo` envia partes adicionais em Base64 até completar o
tamanho declarado. O ID retornado é usado em `documento.idArquivo`.

## Responsabilidades do consumidor

- Carregar e proteger `siglaSistema`/`identificacaoServico` (segredos).
- Definir timeout, retry e circuit breaker conforme o ambiente.
- Tratar `SeiSoapError` e mapear mensagens para o usuário final.
- Cache, auditoria, autorização e persistência ficam na aplicação.
