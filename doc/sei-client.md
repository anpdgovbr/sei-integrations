---
title: Guia do sei-client
group: Guias
---

# Guia do sei-client

`@anpdgovbr/sei-client` é um cliente TypeScript para o webservice SOAP do SEI.
Ele é agnóstico de aplicação: não lê `.env`, não conhece framework, banco,
cache, auditoria, autorização, UI ou regras de produto.

## Quando usar

Use este pacote quando uma aplicação precisa interagir diretamente com o SEI:

- consultar unidades, usuários, tipos de procedimento e tabelas de referência;
- criar e gerenciar processos (procedimentos) e documentos;
- enviar processos entre unidades;
- gerenciar blocos de assinatura, reunião e internos;
- registrar andamentos, marcadores e anotações;
- agendar e confirmar publicações;
- enviar e-mails institucionais via SEI;
- registrar dados de ouvidoria.

Para verificar permissões de usuários cadastrados no SIP, use `@anpdgovbr/sip-client`
em vez deste pacote. Veja [sip-client.md](sip-client.md).

## Capacidades e limites do contrato

A lib serializa chamadas, transporta SOAP e normaliza respostas. As operações,
os critérios de acesso e os dados disponíveis são definidos pelo WS liberado
pelo SEI. Uma funcionalidade da interface web pode usar regras internas sem
estar disponível no WSDL.

**Não há listagem geral de processos por unidade no SOAP base examinado.**
`idUnidade` é contexto da operação, não um filtro de pesquisa que dispense o
protocolo. É possível acompanhar protocolos conhecidos ou consultar um bloco
interno conhecido, com cobertura limitada a esse conjunto.

Veja [Capacidades e contrato SEI](sei-contrato-wsdl.md) para matriz de recursos,
combinações com exemplos, limites de completude e evidências no código base.
A separação entre limites do servidor, implementação do cliente e composição
na aplicação está em [Integração e diagnóstico](integracao-e-diagnostico.md).

## Cadastro e permissões no SEI

A aplicação consumidora deve ser cadastrada como sistema integrador no SEI
(`Administração > Sistemas`) e ter um serviço configurado com as operações e
unidades autorizadas. Use a sigla do sistema e a identificação/chave do serviço
conforme o cadastro e a configuração da instalação. Proteja a identificação do
serviço em contexto server-side; ela não é a chave do SIP.

Libere apenas as operações SOAP necessárias para o sistema registrado.
Não libere operações de escrita para integrações somente leitura.

## Configuração

```ts
import { createSeiClient, type SeiConfig } from "@anpdgovbr/sei-client"

const config: SeiConfig = {
  endpointUrl: process.env.SEI_SOAP_ENDPOINT!, // .../sei/ws/SeiWS.php
  siglaSistema: process.env.SEI_SIGLA_SISTEMA!, // ex.: "SGI"
  identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
  requestTimeoutMs: Number(process.env.SEI_REQUEST_TIMEOUT_MS ?? 30_000),
}
```

Variáveis de ambiente sugeridas:

```dotenv
SEI_SOAP_ENDPOINT=https://sei.orgao.gov.br/sei/ws/SeiWS.php
SEI_SIGLA_SISTEMA=SGI
SEI_IDENTIFICACAO_SERVICO=chave-gerada-no-sei
SEI_REQUEST_TIMEOUT_MS=30000
```

`SEI_IDENTIFICACAO_SERVICO` deve existir apenas em contexto server-side.

## Uso básico

```ts
import { createSeiClient } from "@anpdgovbr/sei-client"

const sei = createSeiClient({
  endpointUrl: process.env.SEI_SOAP_ENDPOINT!,
  siglaSistema: process.env.SEI_SIGLA_SISTEMA!,
  identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
  requestTimeoutMs: 30_000,
})

// Consultas
const unidades = await sei.consultas.listarUnidades()
const proc = await sei.consultas.consultarProcedimento({
  idUnidade: "110000001",
  protocoloProcedimento: "00000.000001/2026-01",
})

// Operações de escrita
const retorno = await sei.operacoes.gerarProcedimento({
  idUnidade: "110000001",
  procedimento: {
    idTipoProcedimento: "100000001",
    especificacao: "Solicitação de acesso",
    assuntos: [{ codigoEstruturado: "06.01.01" }],
    interessados: [],
    nivelAcesso: "0",
    dataAutuacao: "07/07/2026",
  },
})

if (retorno === null) throw new Error("Criação sem DTO de retorno; reconcilie antes de repetir")
const { idProcedimento, procedimentoFormatado } = retorno
```

## Operações de consulta

Subclient `sei.consultas` (`SeiConsultasClient`):

| Método                                    | Descrição                                             |
| ----------------------------------------- | ----------------------------------------------------- |
| `listarUnidades(params)`                  | Unidades ativas visíveis pelo sistema                 |
| `listarTiposProcedimento(params)`         | Tipos de processo; distintos dos assuntos             |
| `listarTiposPrioridade(params)`           | Prioridades disponíveis                               |
| `listarSeries(params)`                    | Séries documentais                                    |
| `listarContatos(params)`                  | Contatos cadastrados                                  |
| `consultarProcedimento(params)`           | Processo conhecido por protocolo e blocos solicitados |
| `consultarProcedimentoIndividual(params)` | Processo de autuação individual por usuário e tipo    |
| `consultarDocumento(params)`              | Dados de um documento                                 |
| `consultarBloco(params)`                  | Dados de um bloco                                     |
| `listarExtensoesPermitidas(params)`       | Extensões de arquivo aceitas pelo SEI                 |
| `listarUsuarios(params)`                  | Usuários da unidade                                   |
| `listarHipotesesLegais(params)`           | Hipóteses legais para restrição                       |
| `listarTiposConferencia(params)`          | Tipos de conferência de documentos                    |
| `listarPaises(params)`                    | Países cadastrados                                    |
| `listarEstados(params)`                   | Estados do Brasil                                     |
| `listarCidades(params)`                   | Cidades por estado                                    |
| `listarTiposProcedimentoOuvidoria()`      | Tipos de procedimento para ouvidoria                  |
| `listarCargos(params)`                    | Cargos cadastrados                                    |
| `listarAndamentos(params)`                | Histórico de andamentos de um processo                |
| `listarMarcadoresUnidade(params)`         | Marcadores da unidade                                 |
| `listarAndamentosMarcadores(params)`      | Histórico de marcadores de um processo conhecido      |
| `consultarPublicacao(params)`             | Dados de uma publicação                               |
| `listarFeriados(params)`                  | Feriados cadastrados                                  |
| `adicionarArquivo(params)`                | Inicia upload de arquivo em partes (retorna token)    |
| `adicionarConteudoArquivo(params)`        | Envia parte de arquivo para o SEI                     |

> Observação operacional: `adicionarArquivo` e `adicionarConteudoArquivo`
> aparecem no subclient de consultas para seguir a divisão histórica do WSDL,
> mas gravam anexo temporário no SEI. O hash aceito pelo SEI é MD5 hexadecimal
> do arquivo completo, não SHA-256.

## Operações de escrita

Subclient `sei.operacoes` (`SeiOperacoesClient`):

**Processos:**

| Método                                  | Descrição                              |
| --------------------------------------- | -------------------------------------- |
| `gerarProcedimento(params)`             | Cria um novo processo                  |
| `excluirProcesso(params)`               | Exclui processo conforme regras do SEI |
| `enviarProcesso(params)`                | Envia o processo para outras unidades  |
| `atribuirProcesso(params)`              | Atribui o processo a um usuário        |
| `reabrirProcesso(params)`               | Reabre um processo concluído           |
| `concluirProcesso(params)`              | Conclui o processo na unidade          |
| `bloquearProcesso(params)`              | Bloqueia o processo                    |
| `desbloquearProcesso(params)`           | Desbloqueia o processo                 |
| `relacionarProcesso(params)`            | Cria relacionamento entre processos    |
| `removerRelacionamentoProcesso(params)` | Remove relacionamento                  |
| `anexarProcesso(params)`                | Anexa um processo a outro              |
| `desanexarProcesso(params)`             | Desanexa um processo                   |
| `sobrestarProcesso(params)`             | Sobrestamento processual               |
| `removerSobrestamentoProcesso(params)`  | Remove sobrestamento                   |

**Documentos:**

| Método                      | Descrição                               |
| --------------------------- | --------------------------------------- |
| `incluirDocumento(params)`  | Inclui documento em um processo         |
| `excluirDocumento(params)`  | Exclui documento conforme regras do SEI |
| `cancelarDocumento(params)` | Cancela um documento                    |
| `bloquearDocumento(params)` | Bloqueia edição do documento            |

**Blocos:**

| Método                                  | Descrição                                  |
| --------------------------------------- | ------------------------------------------ |
| `gerarBloco(params)`                    | Cria um novo bloco                         |
| `alterarBloco(params)`                  | Altera dados de um bloco                   |
| `excluirBloco(params)`                  | Exclui um bloco                            |
| `disponibilizarBloco(params)`           | Disponibiliza bloco para assinatura/acesso |
| `cancelarDisponibilizacaoBloco(params)` | Cancela disponibilização                   |
| `concluirBloco(params)`                 | Conclui um bloco                           |
| `reabrirBloco(params)`                  | Reabre um bloco concluído                  |
| `devolverBloco(params)`                 | Devolve um bloco                           |
| `incluirDocumentoBloco(params)`         | Inclui documento em bloco                  |
| `retirarDocumentoBloco(params)`         | Retira documento de bloco                  |
| `incluirProcessoBloco(params)`          | Inclui processo em bloco                   |
| `retirarProcessoBloco(params)`          | Retira processo de bloco                   |

> Observação operacional: o SEI diferencia os tipos de bloco. Em HML,
> `incluirDocumentoBloco`/`retirarDocumentoBloco` foram validados em bloco de
> assinatura (`Tipo=A`), mas `incluirProcessoBloco`/`retirarProcessoBloco`
> falharam nesse tipo com a mensagem de que não é possível adicionar processo em
> bloco de assinatura. Para processos, use bloco interno ou outro tipo de bloco
> compatível; o par de processo foi validado com bloco interno.

**Andamentos e marcadores:**

| Método                          | Descrição                      |
| ------------------------------- | ------------------------------ |
| `lancarAndamento(params)`       | Lança andamento em um processo |
| `definirMarcador(params)`       | Registra marcador em processo  |
| `definirControlePrazo(params)`  | Define controle de prazo       |
| `concluirControlePrazo(params)` | Conclui controle de prazo      |
| `removerControlePrazo(params)`  | Remove controle de prazo       |
| `registrarAnotacao(params)`     | Registra anotação em processo  |

> Observação operacional: `definirMarcador` registra um andamento de marcador
> no processo. O Web Service do SEI não expõe uma operação par para remover esse
> marcador, então testes automatizados dessa chamada deixam rastro funcional no
> processo usado como massa.

**Publicações:**

| Método                                        | Descrição                     |
| --------------------------------------------- | ----------------------------- |
| `agendarPublicacao(params)`                   | Agenda publicação na imprensa |
| `alterarPublicacao(params)`                   | Altera publicação agendada    |
| `cancelarAgendamentoPublicacao(params)`       | Cancela agendamento           |
| `confirmarDisponibilizacaoPublicacao(params)` | Confirma disponibilização     |

**Contatos e outros:**

| Método                       | Descrição                          |
| ---------------------------- | ---------------------------------- |
| `atualizarContatos(params)`  | Atualiza contatos vinculados       |
| `enviarEmail(params)`        | Envia e-mail institucional via SEI |
| `registrarOuvidoria(params)` | Registra dados de ouvidoria        |

> Observação operacional: em `atualizarContatos`, `StaOperacao=A` cria/altera e
> exige cadastro completo do contato; `E`, `D` e `R` exercem exclusão,
> desativação e reativação. `enviarEmail` produz efeito externo real e gera
> documento de e-mail no processo.

## DTOs principais

`SeiConfig` — configuração do cliente:

```ts
type SeiConfig = {
  endpointUrl: string // https://.../sei/ws/SeiWS.php
  siglaSistema: string // sigla do sistema integrador cadastrado no SEI
  identificacaoServico: string // identificação/chave do serviço configurado
  requestTimeoutMs: number // timeout por chamada SOAP em ms
}
```

Tipos de retorno são exportados pelo pacote. Para selecionar campos sem criar
uma cópia divergente do contrato, use os tipos reais:

```ts
import type { SeiRetornoConsultaProcedimento } from "@anpdgovbr/sei-client"

type ResumoProcesso = Pick<
  SeiRetornoConsultaProcedimento,
  "idProcedimento" | "procedimentoFormatado" | "especificacao" | "unidadesProcedimentoAberto"
>
```

`consultarProcedimento` não retorna a árvore de documentos nem seu conteúdo.
Os blocos retornados dependem dos sinalizadores `sinRetornar*`. A lib envia
`"S"` por padrão para todos esses sinalizadores nessa consulta. Em
`consultarDocumento`, `sinRetornarBlocos` tem padrão `"N"`; em
`consultarBloco`, `sinRetornarProtocolos` tem padrão `"S"`.

Os mappers normalizam coleções ausentes como `[]`. Outros campos podem ter
`null`, string vazia, `false` ou um objeto com valores padrão conforme seu tipo
e mapper; não existe regra universal de que todo campo ausente vira `null`.
Sinalizadores de saída são convertidos conforme o DTO; na entrada, vários
parâmetros continuam exigindo texto `"S"`/`"N"`. IDs são strings, não números.
Datas e horários permanecem texto, sem conversão automática para `Date` ou fuso.

## Tratamento de erros

SOAP Faults, falhas HTTP e timeout são representados por `SeiSoapError`.
Falhas de rede do `fetch` e erros de parsing/mapeamento também podem propagar
outros tipos de erro. Trate ambos os caminhos:

```ts
import { SeiSoapError } from "@anpdgovbr/sei-client"

try {
  const proc = await sei.consultas.consultarProcedimento({
    idUnidade: "110000001",
    protocoloProcedimento: "00000.000001/2026-01",
  })
  if (proc === null) {
    console.log("Consulta sem DTO de retorno")
  }
} catch (error) {
  if (error instanceof SeiSoapError) {
    console.error(error.operation) // ex.: "consultarProcedimento"
    console.error(error.status) // status HTTP
    console.error(error.fault) // mensagem do SOAP Fault, quando presente
  } else {
    throw error
  }
}
```

## Pontos de atenção

- O endpoint SOAP fica em `/sei/ws/SeiWS.php`, não no WSDL. O WSDL pode estar
  em `/sei/ws/SeiWS.php?wsdl` ou `/sei/controlador_ws.php?servico=sei`.
- O SEI usa SOAP RPC/encoded legado. A lib monta envelopes manualmente.
- `siglaSistema` deve corresponder exatamente ao cadastro do SEI (case sensitive).
- `identificacaoServico` corresponde à identificação/chave do serviço conforme
  o cadastro do SEI; é diferente da chave do SIP.
- Datas de negócio usam `dd/mm/aaaa`; campos de data/hora também contêm horário.
  Consulte o tipo da operação e preserve o formato esperado pelo SEI.
- Retorno `null` significa que a lib não produziu um DTO a partir do payload;
  não é garantia de registro inexistente. No SEI base 5.1.0 consultado, processo
  não informado ou não encontrado gera exceção no servidor e pode chegar como
  SOAP Fault. Trate tanto `null` quanto erros.
- Não monte XML manualmente fora da lib.
- Operações e tipos marcados como **Experimental** na referência de API
  (TypeDoc) têm serialização/desserialização implementada e cobertura de
  testes unitários, mas ainda não foram validados de ponta a ponta contra um
  ambiente SEI real. Valide em homologação antes de usar em produção.

## Fora do escopo

Estas capacidades não fazem parte do `@anpdgovbr/sei-client`:

- login unificado e SSO;
- assinatura digital de documentos;
- cache e persistência;
- auditoria e rastreamento de operações;
- autorização de usuário final;
- telas administrativas;
- leitura de variáveis de ambiente;
- coordenação de fluxos de negócio.

Cache, auditoria, autorização e fluxos são responsabilidades da aplicação
consumidora.
