---
title: Capacidades e contrato SEI
group: Guias
---

# Capacidades e contrato SEI

Este guia separa o que o Web Service base do SEI expõe, o que o cliente
TypeScript implementa e o que pode ser composto pela aplicação consumidora.
Parâmetros completos e retornos estão na referência de API gerada dos tipos.

## Referência e compatibilidade

A implementação do cliente tem como referência o contrato SEI 5.0.4. Esta
revisão também examinou o código base identificado por `SEI_VERSAO = '5.1.0'`
em `sei/web/SEI.php`. A inspeção de código não certifica compatibilidade integral
com toda instalação 5.1.0 nem substitui homologação por operação.

Arquivos da distribuição SEI usados como evidência (caminhos relativos a `src/`):

| Fonte                                | Evidência                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `sei/web/ws/sei.wsdl`                | Operações publicadas, parâmetros e tipos SOAP                               |
| `sei/web/ws/SeiWS.php`               | Métodos SOAP e encaminhamento para as regras de negócio                     |
| `sei/web/rn/SeiRN.php`               | Validações, consulta de processo, blocos e marcadores                       |
| `sei/web/procedimento_controlar.php` | Controle de Processos usa `PesquisaPendenciaDTO` e `listarPendenciasRN0754` |
| `sei/web/rn/AtividadeRN.php`         | Listagem interna de pendências por unidade e atividades abertas             |

O endpoint de execução é `/sei/ws/SeiWS.php`; o contrato é disponibilizado por
`/sei/controlador_ws.php?servico=sei`. O cliente monta SOAP RPC/encoded e não
carrega WSDL dinamicamente. Alterar a URL não descobre nem adiciona métodos.
Instalações com módulos podem ter outros serviços; eles não são presumidos
neste guia.

## Matriz de capacidades

Nas operações da tabela, o método TypeScript tem o mesmo nome da operação SOAP.
A classificação descreve a possibilidade funcional, não uma garantia de acesso:
o servidor aplica os critérios do serviço e da unidade.

| Necessidade                                 | API disponível                                                                                            | Pré-requisito e alcance                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Identificar unidades disponíveis ao serviço | `consultas.listarUnidades`                                                                                | Cadastro e critérios do serviço; não retorna processos                               |
| Consultar usuários da unidade               | `consultas.listarUsuarios`                                                                                | ID da unidade; não retorna processos atribuídos                                      |
| Consultar tipos de processo e de documento  | `consultas.listarTiposProcedimento`, `listarSeries`                                                       | Tabelas de referência; tipos de processo não são assuntos                            |
| Consultar processo                          | `consultas.consultarProcedimento`                                                                         | Protocolo conhecido; blocos opcionais controlados por sinalizadores                  |
| Descobrir onde um processo está aberto      | `consultas.consultarProcedimento`                                                                         | Solicitar `sinRetornarUnidadesProcedimentoAberto: "S"`                               |
| Consultar processo de autuação individual   | `consultas.consultarProcedimentoIndividual`                                                               | Órgão, tipo e identificação do usuário; não é busca geral por usuário                |
| Consultar documento                         | `consultas.consultarDocumento`                                                                            | Protocolo conhecido; não equivale a baixar seu conteúdo                              |
| Consultar integrantes de bloco              | `consultas.consultarBloco`                                                                                | ID conhecido e `sinRetornarProtocolos: "S"`; itens podem ser processos ou documentos |
| Consultar histórico de tramitação           | `consultas.listarAndamentos`                                                                              | Protocolo do processo conhecido                                                      |
| Consultar catálogo de marcadores            | `consultas.listarMarcadoresUnidade`                                                                       | Unidade; não retorna processos por marcador                                          |
| Consultar histórico de marcadores           | `consultas.listarAndamentosMarcadores`                                                                    | Protocolo conhecido; filtro opcional de marcadores                                   |
| Consultar publicação                        | `consultas.consultarPublicacao`                                                                           | Identificador de publicação ou documento conforme parâmetros                         |
| Criar processo ou documento                 | `operacoes.gerarProcedimento`, `incluirDocumento`                                                         | Cadastros válidos e operação liberada; persistir identificadores retornados          |
| Tramitar, concluir, reabrir e atribuir      | `operacoes.enviarProcesso`, `concluirProcesso`, `reabrirProcesso`, `atribuirProcesso`                     | Processo conhecido e regras de acesso; conclusão é por unidade                       |
| Organizar blocos                            | `operacoes.gerarBloco`, `incluirProcessoBloco`, `incluirDocumentoBloco` e respectivos métodos de retirada | Tipo de bloco compatível e IDs conhecidos                                            |
| Registrar marcador, prazo ou anotação       | `operacoes.definirMarcador`, `definirControlePrazo`, `registrarAnotacao`                                  | Processos conhecidos; escrita mesmo quando usada para acompanhamento                 |
| Carregar arquivo temporário                 | `consultas.adicionarArquivo`, `adicionarConteudoArquivo`                                                  | Tamanho, MD5 e partes Base64; são operações de escrita                               |
| Enviar e-mail                               | `operacoes.enviarEmail`                                                                                   | Efeito externo e documento gerado no processo                                        |

As demais tabelas de referência, operações de relacionamento, anexação,
publicação, contatos e ouvidoria estão enumeradas no [guia SEI](sei-client.md).

## Capacidades não expostas no SOAP base examinado

| Necessidade                                                      | Limite do servidor e alternativa                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Listar todos os processos por unidade, usuário, tipo ou marcador | Não há operação geral de pesquisa; consultar um conjunto prévio de protocolos                      |
| Listar blocos de uma unidade                                     | Não há operação de listagem; manter os IDs conhecidos ou retornados por `gerarBloco`               |
| Obter a árvore completa de documentos do processo                | `consultarProcedimento` não fornece essa lista; manter referências obtidas pelo fluxo da aplicação |
| Baixar conteúdo por `consultarDocumento`                         | O retorno é de metadados; `linkAcesso` não constitui uma API de download autenticado pelo cliente  |
| Remover marcador com uma operação específica                     | Não há operação par de remoção no contrato examinado                                               |
| Impedir assinatura por meio de bloqueio de edição                | Bloqueio do documento não representa proibição de assinatura                                       |

Essas ausências não são funcionalidades que o cliente deixou de implementar
nesses métodos. Uma composição só consegue trabalhar com as informações que o
servidor fornece; não amplia a abrangência do contrato.

## Processos por unidade: combinações disponíveis

Defina primeiro o significado de “da unidade”: aberto atualmente, gerado nela,
com passagem histórica ou integrante de um bloco. Esses conjuntos diferem.
Um processo pode estar aberto simultaneamente em várias unidades.

### Protocolos conhecidos → processos abertos na unidade

O exemplo abaixo é código da aplicação consumidora, não um helper exportado
pela lib. `protocolosConhecidos` é a lista previamente mantida pela aplicação.
A execução sequencial evita uma chamada simultânea por protocolo; volumes
maiores podem usar concorrência limitada conforme a capacidade do ambiente.

```ts
import type { SeiClient, SeiRetornoConsultaProcedimento } from "@anpdgovbr/sei-client"

async function consultarAbertosNaUnidade(
  sei: SeiClient,
  idUnidade: string,
  protocolosConhecidos: readonly string[],
) {
  const processos: SeiRetornoConsultaProcedimento[] = []
  const semRetorno: string[] = []
  const falhas: { protocolo: string; erro: unknown }[] = []

  for (const protocolo of new Set(protocolosConhecidos)) {
    try {
      const processo = await sei.consultas.consultarProcedimento({
        idUnidade,
        protocoloProcedimento: protocolo,
        sinRetornarUnidadesProcedimentoAberto: "S",
        sinRetornarAssuntos: "N",
        sinRetornarInteressados: "N",
        sinRetornarObservacoes: "N",
        sinRetornarAndamentoGeracao: "N",
        sinRetornarAndamentoConclusao: "N",
        sinRetornarUltimoAndamento: "N",
        sinRetornarProcedimentosRelacionados: "N",
        sinRetornarProcedimentosAnexados: "N",
      })
      if (processo === null) {
        semRetorno.push(protocolo)
      } else if (
        processo.unidadesProcedimentoAberto.some((item) => item.unidade.idUnidade === idUnidade)
      ) {
        processos.push(processo)
      }
    } catch (erro) {
      falhas.push({ protocolo, erro })
    }
  }

  return { processos, semRetorno, falhas }
}
```

A cobertura fica limitada à lista de entrada e ao acesso do serviço. `falhas` e
`semRetorno` precisam ser tratados; não significam processo concluído ou ausente.
As consultas ocorrem em momentos distintos, sem snapshot transacional da unidade.

### Bloco interno conhecido → protocolos → consulta dos processos

```ts
const bloco = await sei.consultas.consultarBloco({
  idUnidade,
  idBloco, // ID previamente conhecido
  sinRetornarProtocolos: "S",
})

if (bloco === null) throw new Error("Bloco sem DTO de retorno")
if (bloco.tipo !== "I") throw new Error("Este fluxo espera um bloco interno")

const protocolos = bloco.protocolos.map((item) => item.protocoloFormatado)
// Use consultarAbertosNaUnidade do exemplo anterior para consultar esse conjunto.
```

O bloco não é sincronizado automaticamente com todos os processos abertos na
unidade. Para adotá-lo como carteira de acompanhamento, a unidade ou a aplicação
precisa manter sua composição. `incluirProcessoBloco` altera o SEI; uma integração
somente leitura depende de um bloco já organizado. Blocos de assinatura contêm
documentos e não substituem essa carteira de processos.

### Índice mantido pela integração

Persista `idProcedimento` e `procedimentoFormatado` retornados por
`gerarProcedimento`, além das referências recebidas por outros fluxos autorizados.
Esse índice permite acompanhamento posterior com `consultarProcedimento`.
Ele não descobre automaticamente processos anteriores, criados por usuários ou
por outros sistemas.

`listarAndamentos` pode identificar passagem histórica pela unidade de um
processo conhecido. Já `listarMarcadoresUnidade` seguido de
`listarAndamentosMarcadores` continua exigindo conhecer o processo. Nenhuma
dessas combinações produz uma lista inicial completa.

## Por que a interface consegue listar

A tela de Controle de Processos chama internamente
`AtividadeRN::listarPendenciasRN0754` com `PesquisaPendenciaDTO`, incluindo
unidade, usuário, filtros e paginação. A regra pesquisa atividades da unidade
com conclusão nula no fluxo padrão. Essa regra interna não é uma operação
publicada por `SeiWS.php`/`sei.wsdl`.

Sem extensão do servidor, partindo somente de `idUnidade`, não há combinação das
operações examinadas que reproduza integralmente essa descoberta. Helpers no
consumidor podem reduzir trabalho de consulta e filtragem, mas não recuperar
processos para os quais não existe uma referência inicial.
