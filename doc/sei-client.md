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
- gerenciar blocos de assinatura e acompanhamento;
- registrar andamentos, marcadores e anotações;
- agendar e confirmar publicações;
- enviar e-mails institucionais via SEI;
- registrar dados de ouvidoria.

Para verificar permissões de usuários cadastrados no SIP, use `@anpdgovbr/sip-client`
em vez deste pacote. Veja [sip-client.md](sip-client.md).

## Cadastro e permissões no SEI

A aplicação consumidora deve ser cadastrada como sistema integrador no SEI
(`Administração > Sistemas > Novo`). O cadastro gera a `IdentificacaoServico`
(chave de acesso), que deve ser armazenada em variável de ambiente server-side.

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
const { idProcedimento, procedimentoFormatado } = await sei.operacoes.gerarProcedimento({
  idUnidade: "110000001",
  procedimento: {
    idTipoProcedimento: "100000001",
    descricao: "Solicitação de acesso",
    dataAutuacao: "07/07/2026",
    idUsuario: "100000103",
    sinProcedimentoAberto: true,
    sinResumo: false,
  },
})
```

## Operações de consulta

Subclient `sei.consultas` (`SeiConsultasClient`):

| Método                                    | Descrição                                          |
| ----------------------------------------- | -------------------------------------------------- |
| `listarUnidades(params)`                  | Unidades ativas visíveis pelo sistema              |
| `listarTiposProcedimento(params)`         | Tipos de procedimento (assuntos)                   |
| `listarTiposPrioridade(params)`           | Prioridades disponíveis                            |
| `listarSeries(params)`                    | Séries documentais                                 |
| `listarContatos(params)`                  | Contatos cadastrados                               |
| `consultarProcedimento(params)`           | Dados completos de um processo                     |
| `consultarProcedimentoIndividual(params)` | Dados resumidos de um processo                     |
| `consultarDocumento(params)`              | Dados de um documento                              |
| `consultarBloco(params)`                  | Dados de um bloco                                  |
| `listarExtensoesPermitidas(params)`       | Extensões de arquivo aceitas pelo SEI              |
| `listarUsuarios(params)`                  | Usuários da unidade                                |
| `listarHipotesesLegais(params)`           | Hipóteses legais para restrição                    |
| `listarTiposConferencia(params)`          | Tipos de conferência de documentos                 |
| `listarPaises(params)`                    | Países cadastrados                                 |
| `listarEstados(params)`                   | Estados do Brasil                                  |
| `listarCidades(params)`                   | Cidades por estado                                 |
| `listarTiposProcedimentoOuvidoria()`      | Tipos de procedimento para ouvidoria               |
| `listarCargos(params)`                    | Cargos cadastrados                                 |
| `listarAndamentos(params)`                | Histórico de andamentos de um processo             |
| `listarMarcadoresUnidade(params)`         | Marcadores da unidade                              |
| `listarAndamentosMarcadores(params)`      | Andamentos com marcadores                          |
| `consultarPublicacao(params)`             | Dados de uma publicação                            |
| `listarFeriados(params)`                  | Feriados cadastrados                               |
| `adicionarArquivo(params)`                | Inicia upload de arquivo em partes (retorna token) |
| `adicionarConteudoArquivo(params)`        | Envia parte de arquivo para o SEI                  |

> Observação operacional: `adicionarArquivo` e `adicionarConteudoArquivo`
> aparecem no subclient de consultas para seguir a divisão histórica do WSDL,
> mas gravam anexo temporário no SEI. O hash aceito pelo SEI é MD5 hexadecimal
> do arquivo completo, não SHA-256.

## Operações de escrita

Subclient `sei.operacoes` (`SeiOperacoesClient`):

**Processos:**

| Método                                  | Descrição                             |
| --------------------------------------- | ------------------------------------- |
| `gerarProcedimento(params)`             | Cria um novo processo                 |
| `excluirProcesso(params)`               | Exclui um processo rascunho           |
| `enviarProcesso(params)`                | Envia o processo para outras unidades |
| `atribuirProcesso(params)`              | Atribui o processo a um usuário       |
| `reabrirProcesso(params)`               | Reabre um processo concluído          |
| `concluirProcesso(params)`              | Conclui o processo na unidade         |
| `bloquearProcesso(params)`              | Bloqueia o processo                   |
| `desbloquearProcesso(params)`           | Desbloqueia o processo                |
| `relacionarProcesso(params)`            | Cria relacionamento entre processos   |
| `removerRelacionamentoProcesso(params)` | Remove relacionamento                 |
| `anexarProcesso(params)`                | Anexa um processo a outro             |
| `desanexarProcesso(params)`             | Desanexa um processo                  |
| `sobrestarProcesso(params)`             | Sobrestamento processual              |
| `removerSobrestamentoProcesso(params)`  | Remove sobrestamento                  |

**Documentos:**

| Método                      | Descrição                       |
| --------------------------- | ------------------------------- |
| `incluirDocumento(params)`  | Inclui documento em um processo |
| `cancelarDocumento(params)` | Cancela um documento            |
| `bloquearDocumento(params)` | Bloqueia um documento           |

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
  identificacaoServico: string // chave gerada no cadastro do sistema
  requestTimeoutMs: number // timeout por chamada SOAP em ms
}
```

Tipos de retorno de consultas:

```ts
type SeiRetornoConsultaProcedimento = {
  idProcedimento: string
  procedimentoFormatado: string
  especificacao: string | null
  dataAutuacao: string
  unidadeGeradora: SeiUnidade
  // ... andamentos, documentos, relacionamentos, etc.
}

type SeiRetornoConsultaDocumento = {
  idDocumento: string
  documentoFormatado: string
  idProcedimento: string
  // ... conteúdo, assinaturas, publicações, etc.
}
```

Todos os arrays ausentes no SOAP são normalizados como `[]`.
Campos opcionais ausentes são normalizados como `null`.
Sinalizadores `S/N` são convertidos para `boolean`.

## Tratamento de erros

Falhas SOAP são convertidas em `SeiSoapError`:

```ts
import { createSeiClient, SeiSoapError } from "@anpdgovbr/sei-client"

try {
  const proc = await sei.consultas.consultarProcedimento({ ... })
} catch (error) {
  if (error instanceof SeiSoapError) {
    console.error(error.operation)  // ex.: "consultarProcedimento"
    console.error(error.status)     // status HTTP
    console.error(error.fault)      // mensagem do SOAP Fault
  }
}
```

## Pontos de atenção

- O endpoint SOAP fica em `/sei/ws/SeiWS.php`, não no WSDL. O WSDL pode estar
  em `/sei/ws/SeiWS.php?wsdl` ou `/sei/controlador_ws.php?servico=sei`.
- O SEI usa SOAP RPC/encoded legado. A lib monta envelopes manualmente.
- `siglaSistema` deve corresponder exatamente ao cadastro do SEI (case sensitive).
- `identificacaoServico` é a chave de acesso gerada pelo SEI para o sistema;
  é diferente da chave do SIP.
- Datas vêm e devem ser enviadas no formato `dd/mm/aaaa`.
- Algumas operações retornam `null` quando o registro não existe (ex.:
  `consultarProcedimento` com protocolo inválido), em vez de lançar erro.
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
