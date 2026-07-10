# Desenvolvimento

Este documento concentra decisões e pendências de desenvolvimento do monorepo.
O README raiz deve permanecer como visão geral para consumo e operação.

## Estado atual

### sip-client

- `@anpdgovbr/sip-client` possui base funcional validada para envelopes SOAP,
  parsing de respostas e mapeamento de entidades centrais do SIP.
- A nomenclatura pública foi alinhada ao WSDL/fonte local do SEI 5.0.4 em
  `/home/luciano/anpdgovbr/sei/src/sip/web/ws/sip.wsdl` e
  `/home/luciano/anpdgovbr/sei/src/sip/web/ws/SipWS.php`.
- Os aliases públicos `SeiSip*` foram removidos para não confundir o cliente SIP
  com integração direta ao SEI.
- As operações de replicação foram separadas por contrato:
  `SipOperacaoReplicacaoUsuario` (`C`, `A`, `E`, `D`, `R`) e
  `SipOperacaoReplicacaoPermissao` (`A`, `E`).

### sei-client

- `@anpdgovbr/sei-client` tem uma primeira implementação ampla, mas ainda deve
  ser tratado como API em validação operacional até passar por smoke tests em
  HML serviço a serviço.
- O levantamento no código base local do SEI
  `/home/luciano/anpdgovbr/sei/src/sei/web/ws/SeiWS.php` identificou 68
  operações SOAP expostas pelo `SeiWS`. Todas já possuem método público
  correspondente no `sei-client`.
- A API está organizada em dois subclientes:
  - `SeiConsultasClient` — 25 operações de leitura, referência, consulta e
    upload em partes.
  - `SeiOperacoesClient` — 43 operações que alteram estado ou produzem efeitos
    no SEI.
- Infraestrutura SOAP compartilhada em `@anpdgovbr/soap-base` (privado),
  reutilizada por ambos os clientes.
- Testes automatizados iniciais cobrem envelope SOAP, parsing, mappers, SOAP
  Fault e chamadas básicas da fachada do `sei-client`; falta validação com SOAP
  real de HML para cada operação.

## Inventário SEI

Fonte de verdade do levantamento: métodos `*Monitorado` em
`/home/luciano/anpdgovbr/sei/src/sei/web/ws/SeiWS.php`. A coluna "ciclo"
indica a ordem recomendada para liberar e validar no `sei-client`, não uma
ordem imposta pelo SEI.

### Ciclos de disponibilização do sei-client

| Ciclo | Objetivo                                              | Critério de saída                                                                                       |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0     | Infraestrutura de smoke e fixtures                    | `scripts/smoke-sei.ts`, variáveis `.env`, mascaramento de segredo e execução seletiva por ciclo         |
| 1     | Consultas básicas e tabelas de referência             | Autenticação, envelope, parser, arrays e mappers validados com operações somente leitura                |
| 2     | Consulta de processo, documento e histórico           | Fluxo de leitura de protocolo real validado com fixtures HML anonimizadas                               |
| 3     | Escrita mínima controlada                             | Geração de processo e inclusão de documento em unidade de teste, com limpeza/identificação operacional  |
| 4     | Tramitação e ciclo de vida de processo/documento      | Envio, atribuição, conclusão/reabertura, bloqueios e exclusões validados em massa pequena               |
| 5     | Blocos                                                | Criação, consulta e operações de bloco validadas com documentos/processos de teste                      |
| 6     | Marcadores, anotações, andamentos e controle de prazo | Operações auxiliares de gestão processual validadas contra processos de teste                           |
| 7     | Cadastros, arquivos, e-mail e ouvidoria               | Operações com payloads maiores, anexos ou efeitos externos validadas com isolamento explícito           |
| 8     | Publicações                                           | Operações de publicação validadas por último por dependência de veículo, agenda e regras institucionais |

### Operações por ciclo

#### Ciclo 1 - Consultas básicas e tabelas de referência

Primeiro bloco de HML. Serve para confirmar conectividade, autenticação,
permissões do sistema integrador, serialização de parâmetros simples e
normalização de listas.

| Operação SOAP                      | Método público                                   | Observação                                         |
| ---------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `listarUnidades`                   | `sei.consultas.listarUnidades`                   | Base para descobrir unidades permitidas ao sistema |
| `listarTiposProcedimento`          | `sei.consultas.listarTiposProcedimento`          | Necessária antes de gerar procedimento             |
| `listarSeries`                     | `sei.consultas.listarSeries`                     | Necessária antes de incluir documento              |
| `listarTiposPrioridade`            | `sei.consultas.listarTiposPrioridade`            | Complementa criação/classificação de processo      |
| `listarHipotesesLegais`            | `sei.consultas.listarHipotesesLegais`            | Necessária para níveis de acesso restritos         |
| `listarTiposConferencia`           | `sei.consultas.listarTiposConferencia`           | Necessária para documentos externos                |
| `listarUsuarios`                   | `sei.consultas.listarUsuarios`                   | Necessária para atribuição e validação de unidade  |
| `listarPaises`                     | `sei.consultas.listarPaises`                     | Tabela de referência de contatos/ouvidoria         |
| `listarEstados`                    | `sei.consultas.listarEstados`                    | Tabela de referência de contatos/ouvidoria         |
| `listarCidades`                    | `sei.consultas.listarCidades`                    | Tabela de referência de contatos/ouvidoria         |
| `listarCargos`                     | `sei.consultas.listarCargos`                     | Tabela de referência de contatos                   |
| `listarFeriados`                   | `sei.consultas.listarFeriados`                   | Útil para controle de prazo e retorno programado   |
| `listarExtensoesPermitidas`        | `sei.consultas.listarExtensoesPermitidas`        | Pré-requisito para upload/anexos                   |
| `listarTiposProcedimentoOuvidoria` | `sei.consultas.listarTiposProcedimentoOuvidoria` | Pré-requisito para `registrarOuvidoria`            |

#### Ciclo 2 - Consulta de processo, documento, bloco e histórico

Segundo bloco. Usa protocolos já existentes em HML e deve gerar fixtures reais
anonimizadas, porque os retornos são compostos e mais propensos a divergência.

| Operação SOAP                     | Método público                                  | Observação                                   |
| --------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| `consultarProcedimento`           | `sei.consultas.consultarProcedimento`           | Consulta central de processo                 |
| `consultarProcedimentoIndividual` | `sei.consultas.consultarProcedimentoIndividual` | Consulta resumida por órgão/tipo/usuário     |
| `consultarDocumento`              | `sei.consultas.consultarDocumento`              | Consulta central de documento                |
| `listarAndamentos`                | `sei.consultas.listarAndamentos`                | Histórico de processo                        |
| `consultarBloco`                  | `sei.consultas.consultarBloco`                  | Leitura antes das operações de bloco         |
| `listarMarcadoresUnidade`         | `sei.consultas.listarMarcadoresUnidade`         | Pré-requisito para marcador                  |
| `listarAndamentosMarcadores`      | `sei.consultas.listarAndamentosMarcadores`      | Validação de marcador/histórico              |
| `consultarPublicacao`             | `sei.consultas.consultarPublicacao`             | Leitura antes do ciclo de publicações        |
| `listarContatos`                  | `sei.consultas.listarContatos`                  | Consulta pesada; validar paginação e filtros |

#### Ciclo 3 - Escrita mínima controlada

Primeiro bloco com alteração de estado. Deve rodar apenas em unidade de teste,
com tipo de procedimento, série, usuário e dados definidos no `.env` do smoke.

| Operação SOAP       | Método público                    | Observação                                             |
| ------------------- | --------------------------------- | ------------------------------------------------------ |
| `gerarProcedimento` | `sei.operacoes.gerarProcedimento` | Primeira escrita a validar; base para ciclos seguintes |
| `incluirDocumento`  | `sei.operacoes.incluirDocumento`  | Validar documento interno simples e externo mínimo     |
| `lancarAndamento`   | `sei.operacoes.lancarAndamento`   | Escrita leve em processo de teste                      |
| `registrarAnotacao` | `sei.operacoes.registrarAnotacao` | Escrita auxiliar reversível/baixa criticidade          |

#### Ciclo 4 - Tramitação e ciclo de vida de processo/documento

Operações de negócio comuns, mas com maior efeito operacional. Devem usar
processos criados pelo ciclo 3.

| Operação SOAP                   | Método público                                | Observação                                       |
| ------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `enviarProcesso`                | `sei.operacoes.enviarProcesso`                | Exige unidade destino conhecida                  |
| `atribuirProcesso`              | `sei.operacoes.atribuirProcesso`              | Exige usuário válido na unidade                  |
| `concluirProcesso`              | `sei.operacoes.concluirProcesso`              | Altera estado do processo na unidade             |
| `reabrirProcesso`               | `sei.operacoes.reabrirProcesso`               | Par da conclusão                                 |
| `bloquearProcesso`              | `sei.operacoes.bloquearProcesso`              | Validar somente em processo de teste             |
| `desbloquearProcesso`           | `sei.operacoes.desbloquearProcesso`           | Par do bloqueio                                  |
| `bloquearDocumento`             | `sei.operacoes.bloquearDocumento`             | Validar com documento criado no ciclo 3          |
| `cancelarDocumento`             | `sei.operacoes.cancelarDocumento`             | Operação sensível; deixar após inclusão validada |
| `excluirDocumento`              | `sei.operacoes.excluirDocumento`              | Rascunhos/documentos de teste apenas             |
| `excluirProcesso`               | `sei.operacoes.excluirProcesso`               | Rascunhos/processos de teste apenas              |
| `relacionarProcesso`            | `sei.operacoes.relacionarProcesso`            | Exige dois processos de teste                    |
| `removerRelacionamentoProcesso` | `sei.operacoes.removerRelacionamentoProcesso` | Par do relacionamento                            |
| `anexarProcesso`                | `sei.operacoes.anexarProcesso`                | Exige dois processos compatíveis                 |
| `desanexarProcesso`             | `sei.operacoes.desanexarProcesso`             | Par da anexação                                  |
| `sobrestarProcesso`             | `sei.operacoes.sobrestarProcesso`             | Depende de motivo e estado processual            |
| `removerSobrestamentoProcesso`  | `sei.operacoes.removerSobrestamentoProcesso`  | Par do sobrestamento                             |

#### Ciclo 5 - Blocos

Blocos dependem de documentos/processos criados previamente e de unidades para
disponibilização. Validar criação e consulta antes das demais transições.

| Operação SOAP                   | Método público                                | Observação                        |
| ------------------------------- | --------------------------------------------- | --------------------------------- |
| `gerarBloco`                    | `sei.operacoes.gerarBloco`                    | Primeira operação de bloco        |
| `alterarBloco`                  | `sei.operacoes.alterarBloco`                  | Alteração de descrição/unidades   |
| `disponibilizarBloco`           | `sei.operacoes.disponibilizarBloco`           | Exige unidade de disponibilização |
| `cancelarDisponibilizacaoBloco` | `sei.operacoes.cancelarDisponibilizacaoBloco` | Par da disponibilização           |
| `incluirDocumentoBloco`         | `sei.operacoes.incluirDocumentoBloco`         | Exige documento de teste          |
| `retirarDocumentoBloco`         | `sei.operacoes.retirarDocumentoBloco`         | Par da inclusão de documento      |
| `incluirProcessoBloco`          | `sei.operacoes.incluirProcessoBloco`          | Exige processo de teste           |
| `retirarProcessoBloco`          | `sei.operacoes.retirarProcessoBloco`          | Par da inclusão de processo       |
| `concluirBloco`                 | `sei.operacoes.concluirBloco`                 | Transição de estado               |
| `reabrirBloco`                  | `sei.operacoes.reabrirBloco`                  | Par da conclusão                  |
| `devolverBloco`                 | `sei.operacoes.devolverBloco`                 | Depende do tipo/estado do bloco   |
| `excluirBloco`                  | `sei.operacoes.excluirBloco`                  | Última operação do ciclo          |

#### Ciclo 6 - Marcadores, controle de prazo e gestão auxiliar

Operações úteis para fluxos administrativos. Validar depois que processo,
andamento e usuário/unidade estiverem estáveis.

| Operação SOAP           | Método público                        | Observação                           |
| ----------------------- | ------------------------------------- | ------------------------------------ |
| `definirMarcador`       | `sei.operacoes.definirMarcador`       | Depende de `listarMarcadoresUnidade` |
| `definirControlePrazo`  | `sei.operacoes.definirControlePrazo`  | Depende de datas e calendário        |
| `concluirControlePrazo` | `sei.operacoes.concluirControlePrazo` | Par de `definirControlePrazo`        |
| `removerControlePrazo`  | `sei.operacoes.removerControlePrazo`  | Limpeza de prazo                     |

#### Ciclo 7 - Cadastros, arquivos, e-mail e ouvidoria

Operações com payload mais volumoso ou efeitos externos. Devem ter massa de
teste e critérios de isolamento antes de entrar no smoke padrão.

| Operação SOAP              | Método público                           | Observação                                                         |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `atualizarContatos`        | `sei.operacoes.atualizarContatos`        | Cadastro sensível; usar contatos de teste                          |
| `adicionarArquivo`         | `sei.consultas.adicionarArquivo`         | Inicia upload em partes, apesar de estar no subclient de consultas |
| `adicionarConteudoArquivo` | `sei.consultas.adicionarConteudoArquivo` | Depende do token de `adicionarArquivo`                             |
| `enviarEmail`              | `sei.operacoes.enviarEmail`              | Produz efeito externo; usar destinatário controlado                |
| `registrarOuvidoria`       | `sei.operacoes.registrarOuvidoria`       | Payload composto, anexos e regras próprias                         |

#### Ciclo 8 - Publicações

Último bloco recomendado. Publicação tem dependência de veículo, agenda,
documento e regras institucionais; deve ficar fora do smoke padrão até haver
massa HML e procedimento operacional claro.

| Operação SOAP                         | Método público                                      | Observação                           |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| `agendarPublicacao`                   | `sei.operacoes.agendarPublicacao`                   | Cria agendamento                     |
| `alterarPublicacao`                   | `sei.operacoes.alterarPublicacao`                   | Altera agendamento existente         |
| `cancelarAgendamentoPublicacao`       | `sei.operacoes.cancelarAgendamentoPublicacao`       | Cancela agendamento                  |
| `confirmarDisponibilizacaoPublicacao` | `sei.operacoes.confirmarDisponibilizacaoPublicacao` | Confirma disponibilização/publicação |

### Infraestrutura

- O pipeline local e de CI já roda build, lint, typecheck, testes e cobertura.
- O SonarQube usa `coverage/lcov.info` gerado por `pnpm test:coverage`.

## Fixtures SIP necessárias

Para ampliar os testes de contrato do `@anpdgovbr/sip-client`, precisamos de
fixtures SOAP reais anonimizadas para cada operação coberta. Cada fixture deve
preservar estrutura XML, namespaces, nomes de tags, tipos `xsi:type`,
`SOAP-ENC:Array`, mapas `ns2:Map`, campos `xsi:nil` e formato de datas.

Dados mínimos por operação:

- requisição SOAP montada ou parâmetros de entrada usados;
- resposta SOAP de sucesso com um item;
- resposta SOAP de sucesso com múltiplos itens;
- resposta SOAP vazia ou sem registros;
- SOAP Fault real retornado pelo SIP;
- descrição curta do cenário e da operação;
- valores anonimizados consistentes entre usuário, unidade, perfil e permissão.

O WSDL e o código-fonte local permitem validar nomes de operações, tipos SOAP e
operações aceitas. Eles não substituem fixtures reais, porque não contêm os
formatos exatos emitidos pelo ambiente ANPD para todos os cenários de negócio.

Fixtures reais anonimizadas já incorporadas:

- `packages/sip-client/test/fixtures/sip/carregar-usuarios-sucesso.xml`;
- `packages/sip-client/test/fixtures/sip/listar-permissao-sucesso.xml`;
- `packages/sip-client/test/fixtures/sip/carregar-usuarios-fault-servico-nao-liberado.xml`.

Essas fixtures nasceram da validação HML de `carregarUsuarios` e
`listarPermissao`, com dados pessoais substituídos e estrutura SOAP preservada.

## Homologação SIP

A instância HML pode ser usada com:

```env
SIP_SOAP_ENDPOINT=https://hmlsei.anpd.gov.br/sip/ws/SipWS.php
```

Sistemas relevantes observados na instância:

- `100000100` - `SEI` - Sistema Eletrônico de Informações
- `100000099` - `SIP` - Sistema de Permissões

Para smoke local, configure `.env` com `SIP_ACCESS_KEY`, `SIP_SYSTEM_ID`,
`SIP_SOAP_ENDPOINT` e, opcionalmente, `SIP_SMOKE_SIGLA_USUARIO`. Depois rode:

```bash
pnpm smoke:sip
```

O smoke também aceita personas via `SIP_SMOKE_PERSONA`. A persona
`consulta-completa` usa o sistema HML já validado; as demais devem ser
preenchidas quando os sistemas de teste existirem:

```env
SIP_SMOKE_PERSONA=consulta-completa

SIP_PERSONA_CONSULTA_COMPLETA_SYSTEM_ID=100000100
SIP_PERSONA_CONSULTA_COMPLETA_ACCESS_KEY=
SIP_PERSONA_CONSULTA_COMPLETA_SIGLA_USUARIO=usuario.com.permissao
SIP_PERSONA_CONSULTA_COMPLETA_EXPECTED=success

SIP_PERSONA_CONSULTA_VAZIA_SYSTEM_ID=
SIP_PERSONA_CONSULTA_VAZIA_ACCESS_KEY=
SIP_PERSONA_CONSULTA_VAZIA_SIGLA_USUARIO=
SIP_PERSONA_CONSULTA_VAZIA_EXPECTED=empty

SIP_PERSONA_SEM_SERVICO_SYSTEM_ID=
SIP_PERSONA_SEM_SERVICO_ACCESS_KEY=
SIP_PERSONA_SEM_SERVICO_SIGLA_USUARIO=
SIP_PERSONA_SEM_SERVICO_EXPECTED=fault
```

Se `ACCESS_KEY` da persona ficar vazio, o smoke usa `SIP_ACCESS_KEY` como
fallback. Isso permite reaproveitar a chave atual na `consulta-completa` sem
duplicar segredo no `.env`.

Para diagnosticar uma operação SOAP específica, habilite o debug do envelope:

```env
SIP_SMOKE_DEBUG_SOAP=1
SIP_SMOKE_DEBUG_OPERATION=carregarUsuarios
```

O script imprime o XML enviado no `stderr` e mascara `ChaveAcesso`.

O smoke deve permanecer somente leitura. Para homologação futura, vale manter
sistemas/personas separados no SIP por perfil de serviço liberado:

- `consulta-completa`: serviços de consulta usados pelo smoke atual;
- `consulta-vazia`: mesma base de consulta, mas com usuário inexistente ou sem
  retorno esperado;
- `sem-servico`: sistema sem `Pesquisa de Usuários` liberado para validar SOAP
  Faults de autorização.

Essas personas evitam que testes de leitura dependam de permissões de escrita e
facilitam validar falhas de autorização sem alterar código da lib.

Se `pnpm smoke:sip` funcionar sem `SIP_SMOKE_SIGLA_USUARIO`, mas falhar ao
buscar usuário, a conectividade e os serviços gerais estão válidos; investigue
especificamente o serviço `Pesquisa de Usuários`, o cadastro do sistema no SIP,
o `IdSistema` consultado e a existência da sigla informada na base de
homologação.

Em 2026-07-07, após ajuste do parser de arrays SOAP planos, o smoke HML sem
`SIP_SMOKE_SIGLA_USUARIO` retornou:

- órgãos: 1;
- perfis: 16;
- recursos: 2126.

Antes desse ajuste, o cliente mostrava `órgãos: 4` porque interpretava os quatro
campos de um único órgão como quatro registros.

Durante a validação de HML, `carregarUsuarios` retornou temporariamente SOAP
Fault 500 com mensagem `Erro processando operação carregarUsuarios.`. O log HML
registrou:

```text
Data: 07/07/2026 15:20:49
Tipo: Erro
Web Service: Erro processando operação carregarUsuarios.
Detalhes: SipWS

Error: Call to a member function getArrUnidadesInferiores() on null
Arquivo: /opt/sip/web/bd/PermissaoBD.php:414

Stack:
PermissaoBD->carregarUsuarios(Object(PermissaoDTO))
PermissaoRN->carregarUsuariosConectado(Object(PermissaoDTO))
SipWS->carregarUsuarios('', '', NULL, NULL, NULL, NULL, NULL, NULL, '')
```

O stack indicou permissão com subunidades apontando para unidade fora da
hierarquia ativa. Após ajuste de permissões/hierarquia no HML, a operação foi
validada com sucesso pelo smoke real. Esse caso permanece documentado como
evidência de comportamento interno do SIP diante de dado inconsistente, mas não
como erro do cliente TypeScript.
O mapa WSDL/API pública está em [sip-contrato-wsdl.md](sip-contrato-wsdl.md).
As inconsistências e pontos de atenção levantados para eventual encaminhamento à
equipe SEI/SIP estão em
[sei-sip-inconsistencias-para-dev-sei.md](sei-sip-inconsistencias-para-dev-sei.md).

## Achados HML SEI

Em 2026-07-08, o ciclo 1 do `sei-client` foi validado contra
`https://hmlsei.anpd.gov.br/sei/ws/SeiWS.php` com sucesso em 14/14 operações de
leitura.

Configuração HML usada para a validação:

- Sistema SEI integrador: `SEI-INTEGRATIONS-HML`.
- Serviço SEI integrador: `SEI-INTEGRATIONS-HML-CICLO1`.
- Unidade usada nas operações configuráveis: `110000001` (`TESTE`).
- Órgão disponível no HML: `0` (`ANPD`).
- País usado para `listarEstados`: `76` (`Brasil`).
- Período usado para `listarFeriados`: `01/01/2025` a `31/12/2025`.

Observações operacionais:

- O HML está defasado em relação à realidade atual; para smoke de feriados, o
  ano de 2025 é a massa estável conhecida. Com 2026 a operação é válida, mas
  retornou lista vazia.
- As operações `listarUnidades`, `listarTiposProcedimento` e `listarSeries` não
  aparecem na interface de cadastro de operações do serviço porque são
  operações não configuráveis no SEI (`TS_LISTAR_UNIDADES`,
  `TS_LISTAR_TIPOS_PROCEDIMENTO`, `TS_LISTAR_SERIES`).
- `SEI_IDENTIFICACAO_SERVICO` deve receber a chave de acesso gerada do serviço
  quando a autenticação estiver por chave, não apenas a identificação textual do
  serviço.
- `listarExtensoesPermitidas` precisou ser adicionada ao serviço SEI; depois da
  configuração com todas as unidades, passou no smoke e retornou 38 registros.

Resultado do ciclo 1 em HML:

| Operação                           | Resultado |
| ---------------------------------- | --------- |
| `listarUnidades`                   | 66        |
| `listarTiposProcedimento`          | 373       |
| `listarSeries`                     | 340       |
| `listarTiposPrioridade`            | 0         |
| `listarHipotesesLegais`            | 30        |
| `listarTiposConferencia`           | 4         |
| `listarUsuarios`                   | 5         |
| `listarPaises`                     | 204       |
| `listarEstados`                    | 27        |
| `listarCidades`                    | 5564      |
| `listarCargos`                     | 83        |
| `listarFeriados`                   | 17        |
| `listarExtensoesPermitidas`        | 38        |
| `listarTiposProcedimentoOuvidoria` | 6         |

Para o ciclo 2, a unidade `TESTE` não deve ser usada como massa principal,
porque tem pouco uso histórico no HML. As unidades com melhor chance de massa
real são:

| Unidade | ID        | Evidência inicial                                |
| ------- | --------- | ------------------------------------------------ |
| `CGA`   | 110000018 | Unidade real com chance de massa histórica       |
| `CGTI`  | 110000029 | Unidade real adicionada ao serviço do ciclo 2    |
| `FIS`   | 110000036 | Massa usada no ciclo 2; marcadores retornaram 16 |
| `GABPR` | 110000005 | `listarMarcadoresUnidade` retornou 11 marcadores |

`FIS` foi adotada como unidade padrão local do ciclo 2 com o processo
`00261.001688/2022-98`, documento `0176343` e tipo de processo `100000429`
(`ANPD: Procedimento de Fiscalização`). Nesse contexto:

- `SEI_SMOKE_PROTOCOLO_DOCUMENTO` é o protocolo/número do documento SEI, por
  exemplo `0176343`; não é o ID da série/tipo documental.
- O tipo documental `Despacho` (`idSerie=5`) é relevante para inclusão de
  documentos em ciclos de escrita, não para consulta do documento existente.
- `listarAndamentos` exige ao menos um critério (`Andamentos`, `Tarefas` ou
  `TarefasModulos`); para essa massa, `SEI_SMOKE_TAREFAS=1` valida a geração do
  processo.
- `consultarProcedimentoIndividual` exige tipo de processo individual; o tipo
  `100000429` não é individual e, por isso, a operação usa a variável separada
  `SEI_SMOKE_ID_TIPO_PROCEDIMENTO_INDIVIDUAL`.
- Nas unidades candidatas testadas (`CGA`, `CGTI`, `FIS` e `GABPR`),
  `listarTiposProcedimento` com `SinIndividual=S` retornou 0 tipos disponíveis.
  Para validar `consultarProcedimentoIndividual` será necessário localizar ou
  configurar um tipo de processo com `SinIndividual=S` e massa associada ao
  usuário do smoke.
- `consultarPublicacao` está autorizada no serviço e passou usando o protocolo
  do documento, mas o HML pode não ter massa de publicação facilmente
  localizável; se necessário, ela deve ficar como validação separada contra
  produção ou contra uma massa HML dirigida.
- `consultarBloco` foi validada com blocos `1410` e `1379` na FIS. O bloco
  interno `308` também passou na CGTI (`110000029`).

Regra observada no fonte local do SEI para `consultarProcedimentoIndividual`:

- O tipo de processo precisa estar marcado como individual.
- O serviço precisa ter a operação `Consultar Processo Individual` autorizada
  para a unidade/tipo.
- O usuário informado por `SEI_SMOKE_SIGLA_USUARIO` precisa existir no órgão
  `SEI_SMOKE_ID_ORGAO_USUARIO`.
- O processo precisa ter esse usuário como interessado, considerando o contato
  do usuário ou contatos com o mesmo `IdOrigem`.
- A operação retorna o processo individual mais recente do tipo/órgão/usuário,
  desde que a unidade do serviço tenha acesso ao processo e ele não seja
  sigiloso no contexto de serviço.

Resultado do ciclo 2 em HML com FIS:

| Operação                          | Resultado                                |
| --------------------------------- | ---------------------------------------- |
| `consultarProcedimento`           | OK                                       |
| `consultarDocumento`              | OK                                       |
| `listarAndamentos`                | OK, 1 registro com `SEI_SMOKE_TAREFAS=1` |
| `consultarBloco`                  | OK                                       |
| `listarMarcadoresUnidade`         | OK, 16 registros                         |
| `listarAndamentosMarcadores`      | OK, 1 registro                           |
| `consultarPublicacao`             | OK, retorno sem resumo no smoke          |
| `listarContatos`                  | OK, 10 registros com paginação padrão    |
| `consultarProcedimentoIndividual` | OK                                       |

O ciclo 3 está automatizado no runner, mas protegido por
`SEI_SMOKE_ALLOW_WRITE=1`. Sem essa variável, todas as operações de escrita são
puladas. O fluxo padrão do ciclo 3 é encadeado: `gerarProcedimento` cria um
processo de teste e o runner usa o protocolo retornado para `incluirDocumento`,
`lancarAndamento` e `registrarAnotacao`.

Variáveis específicas do ciclo 3:

- `SEI_SMOKE_WRITE_ID_TIPO_PROCEDIMENTO`: tipo de processo usado para criar o
  processo de teste.
- `SEI_SMOKE_WRITE_CODIGO_ASSUNTO`: código estruturado de assunto válido para o
  processo.
- `SEI_SMOKE_WRITE_INTERESSADO_NOME`: interessado textual do processo de teste.
- `SEI_SMOKE_WRITE_ID_SERIE`: tipo documental usado para incluir documento.
- `SEI_SMOKE_WRITE_NIVEL_ACESSO`: nível de acesso; padrão `0` (público).
- `SEI_SMOKE_WRITE_ID_TAREFA_ANDAMENTO`: tarefa usada em `lancarAndamento`;
  padrão `65` (`Atualização de Andamento`), porque o SEI rejeita tarefas
  reservadas menores que `1000`, exceto a `65`.
- `SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO`: opcional para rodar operações do
  ciclo 3 isoladamente em um processo de teste já existente. No ciclo completo,
  o valor é preenchido em memória a partir de `gerarProcedimento`.

Para o Serviço SEI, o ciclo 3 exige liberar as operações `Gerar Processo`,
`Incluir Documento`, `Lançar Andamento` e `Registrar Anotação` na unidade de
teste escolhida e nos tipos usados pela massa do smoke.

Massa inicial sugerida para HML/FIS:

- Unidade: `110000036` (`FIS`).
- Tipo de processo: `100000429` (`ANPD: Procedimento de Fiscalização`).
- Assunto: `100` (`Atividade Finalística`).
- Tipo documental/série: `5` (`Despacho`).
- Interessado textual: `SEI Client Smoke`.

Em 2026-07-08, após liberação do serviço no SEI, o ciclo 3 foi executado com
`SEI_SMOKE_ALLOW_WRITE=1` e passou em 4/4 operações:

| Operação            | Resultado |
| ------------------- | --------- |
| `gerarProcedimento` | OK        |
| `incluirDocumento`  | OK        |
| `lancarAndamento`   | OK        |
| `registrarAnotacao` | OK        |

Achado sobre conteúdo de documento:

- O Web Service do SEI exige `Conteudo` e `ConteudoSecoes[].Conteudo` em Base64 UTF-8. O helper foi corrigido e renomeado para `encodeSeiBase64`.
- A acentuação em português (ex: "Eletrônico", "áéíóúçãõâêô") funciona perfeitamente ao codificar com UTF-8 em Base64, resolvendo problemas anteriores de caracteres inválidos (ex: "Eletr?nico") originados por encoding incorreto.
- No HML, a inclusão de documento com acentos em Base64 UTF-8 foi validada no processo do ciclo 3 (`00261.000004/2026-64`) para `Recibo Eletrônico de Protocolo` (`idSerie=283`, documento `0178401`, id `196903`) e anteriormente no processo de referência para `Despacho` (`idSerie=5`, documento `0178397`).
- Comportamento de `SinBloqueado='S'` e `SinAssinado='N'` via SOAP:
  - **Edição**: Fica bloqueada na interface do SEI (o botão de editar conteúdo desaparece), pois a barra de ações verifica se `$strSinDocBloqueado === 'N'`.
  - **Assinatura**: O botão de assinar continua disponível na interface do SEI. A verificação do botão de assinar em `ProtocoloINT.php` valida apenas se a série permite assinatura e se o tipo de documento é `TD_EDITOR_INTERNO` ('G') ou `TD_FORMULARIO_GERADO` ('F'), não checando `SinBloqueado`.
  - Como o Web Service do SEI não aceita o parâmetro `SubTipo` ou `StaDocumento` (e força a criação como `TD_EDITOR_INTERNO` ou `TD_FORMULARIO_GERADO`), é impossível via SOAP puro criar um documento interno comum que não seja editável mas que impeça a assinatura na interface do usuário (o que exigiria o tipo `TD_FORMULARIO_AUTOMATICO` ou `TD_EXTERNO`).
- Criação de Documento com Série de Aplicabilidade Formulário ('F'):
  - Executamos com sucesso um teste utilizando a série documental `Teste_Form_CONT` (`idSerie=320`), que possui aplicabilidade `F` (Formulário).
  - A API do SEI criou o documento `0178402` (ID `196904`) no processo do ciclo 3 (`00261.000004/2026-64`).
  - Internamente, o SEI mapeou este documento com status `TD_FORMULARIO_GERADO` ('F') ao invés do padrão `TD_EDITOR_INTERNO` ('I'). Isso demonstra que a API respeita a aplicabilidade da série configurada para o tipo de documento, mas em ambos os casos (`TD_FORMULARIO_GERADO` e `TD_EDITOR_INTERNO`) a interface web do SEI mantém o documento como assinável, confirmando a impossibilidade de torná-lo não assinável sem recorrer ao status `TD_FORMULARIO_AUTOMATICO` (o que requer update direto de banco).

Em 2026-07-10, o ciclo 4 foi preparado no runner com pares reversíveis e testado
em HML usando o processo principal `00261.000004/2026-64` e o processo
relacionado `00261.001688/2022-98`. A execução com `SEI_SMOKE_ALLOW_WRITE=1`
chegou ao SEI. Na primeira tentativa, as 10 operações automatizadas falharam
porque ainda não estavam configuradas no serviço ativo
(`SEI-INTEGRATIONS-HML-CICLO1`) para o tipo `ANPD: Procedimento de Fiscalização`
na unidade `FIS`. Após liberação do serviço, as 10 operações automatizadas
passaram.

Resultado do ciclo 4 em HML após liberação do serviço:

| Operação                        | Resultado |
| ------------------------------- | --------- |
| `concluirProcesso`              | OK        |
| `reabrirProcesso`               | OK        |
| `bloquearProcesso`              | OK        |
| `desbloquearProcesso`           | OK        |
| `relacionarProcesso`            | OK        |
| `removerRelacionamentoProcesso` | OK        |
| `anexarProcesso`                | OK        |
| `desanexarProcesso`             | OK        |
| `sobrestarProcesso`             | OK        |
| `removerSobrestamentoProcesso`  | OK        |

As operações `enviarProcesso`, `atribuirProcesso`, `bloquearDocumento`,
`cancelarDocumento`, `excluirDocumento` e `excluirProcesso` continuam
catalogadas como `planned` no runner até haver roteiro de massa/limpeza HML
específico.

Em 2026-07-10, o ciclo 5 foi preparado no runner para operações de bloco usando
bloco de assinatura (`SEI_SMOKE_BLOCO_TIPO=A`), unidade `FIS`, destino `CGTI`
(`110000029`), processo `00261.000004/2026-64`, documento `0176343` e bloco
disponibilizado `1417` para `devolverBloco`. A primeira execução após a
liberação mostrou que `gerarBloco` exige `SinDisponibilizar` válido; o runner foi
ajustado para enviar `N` por padrão.

Após o ajuste, `gerarBloco` isolado passou e criou o bloco `1414`, removido em
seguida por `excluirBloco` para limpeza. Com a ordem do runner ajustada para
manter o documento no bloco até a disponibilização/cancelamento, a execução
completa criou o bloco `1419` e validou 9/12 operações automatizadas.

Resultado do ciclo 5 em HML após liberação parcial:

| Operação                        | Resultado                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `gerarBloco`                    | OK, criou bloco `1419` no ciclo completo                                        |
| `alterarBloco`                  | OK                                                                              |
| `incluirDocumentoBloco`         | OK com documento `0176343`                                                      |
| `incluirProcessoBloco`          | OK isolado com bloco interno `1420`; falha no fluxo completo com bloco `A`      |
| `retirarProcessoBloco`          | OK isolado com bloco interno `1420`; retirada limpou a massa após a inclusão    |
| `disponibilizarBloco`           | OK com destino `CGTI`                                                           |
| `cancelarDisponibilizacaoBloco` | OK                                                                              |
| `retirarDocumentoBloco`         | OK                                                                              |
| `concluirBloco`                 | OK                                                                              |
| `reabrirBloco`                  | OK                                                                              |
| `excluirBloco`                  | OK para o bloco gerado `1419`                                                   |
| `devolverBloco`                 | OK isolado com bloco `1417`; falha no ciclo completo se usar bloco `865` da FIS |

Também foi testada a exclusão isolada do bloco `1410`, autorizada para limpeza,
mas o SEI recusou porque o bloco possui documentos.

O par `incluirProcessoBloco`/`retirarProcessoBloco` foi validado isoladamente
com o bloco interno `1420`, usando o processo `00261.000004/2026-64`. Para
repetir `devolverBloco`, informar um bloco disponibilizado por outra unidade
para a `FIS`, como foi feito com o bloco `1417`.

Em 2026-07-10, o ciclo 6 foi automatizado no runner para marcador e controle de
prazo. O smoke usa um processo de teste (`SEI_SMOKE_WRITE_PROTOCOLO_PROCEDIMENTO`),
um marcador ativo da unidade (`SEI_SMOKE_ID_MARCADOR`) e prazo relativo por
padrão (`SEI_SMOKE_CYCLE6_CONTROLE_PRAZO_DIAS=1`,
`SEI_SMOKE_CYCLE6_CONTROLE_PRAZO_SIN_DIAS_UTEIS=S`). A primeira tentativa em
HML usou o marcador `140` (`Em Análise`) e chegou ao SEI, mas as quatro
operações foram barradas por configuração de serviço na unidade `FIS`.

Resultado do ciclo 6 em HML antes da liberação do serviço:

| Operação                | Resultado                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `definirMarcador`       | Falha: operação não configurada no serviço `SEI-INTEGRATIONS-HML-CICLO1` para a unidade `FIS`      |
| `definirControlePrazo`  | Falha: operação não configurada no serviço `SEI-INTEGRATIONS-HML-CICLO1` para a unidade `FIS`      |
| `concluirControlePrazo` | Falha: operação não configurada no serviço `SEI-INTEGRATIONS-HML-CICLO1` para a unidade `FIS`      |
| `removerControlePrazo`  | Falha: o SEI retornou bloqueio de configuração para `definirControlePrazo` ao remover prazo em FIS |

Após liberação das permissões no serviço, a execução
`SEI_SMOKE_ALLOW_WRITE=1 SEI_SMOKE_ID_MARCADOR=140 pnpm smoke:sei -- --cycle 6`
passou integralmente em HML.

Resultado do ciclo 6 em HML após liberação do serviço:

| Operação                | Resultado |
| ----------------------- | --------- |
| `definirMarcador`       | OK        |
| `definirControlePrazo`  | OK        |
| `concluirControlePrazo` | OK        |
| `removerControlePrazo`  | OK        |

Observação sobre marcadores: `definirMarcador` registra um andamento de marcador
no processo, mas o Web Service do SEI não expõe operação par de remoção. Esse
comportamento foi documentado no TypeDoc e no guia do `sei-client` para evitar
interpretação como falha da lib.

Em 2026-07-10, o ciclo 7 começou pelo par de upload em partes, que é o trecho
mais isolado do ciclo porque grava anexo temporário e não altera processo nem
envia e-mail. O runner foi preparado para `adicionarArquivo` e
`adicionarConteudoArquivo`, usando conteúdo pequeno em Base64, tamanho total em
bytes e hash MD5 hexadecimal do arquivo completo, conforme validação nativa do
SEI (`AnexoRN`).

Resultado inicial do ciclo 7 em HML antes da liberação de upload:

| Operação                   | Resultado                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `adicionarArquivo`         | Falha: operação não configurada no serviço `SEI-INTEGRATIONS-HML-CICLO1` para a unidade `FIS` |
| `adicionarConteudoArquivo` | Não chegou ao SEI; depende do `IdArquivo` retornado por `adicionarArquivo`                    |
| `atualizarContatos`        | `planned`; requer massa de contato de teste                                                   |
| `enviarEmail`              | `planned`; requer destinatário controlado por produzir efeito externo                         |
| `registrarOuvidoria`       | `planned`; requer massa específica de ouvidoria                                               |

Após liberação das permissões do ciclo 7, o runner foi expandido para contato,
e-mail e ouvidoria. A massa validada usou `SEI_SMOKE_CONTATO_ID=100000196`,
destinatário `lucianoedipo@gmail.com` e remetente institucional
`sei@anpd.gov.br`. Para contato, o smoke usa `StaOperacao=R` por padrão para
exercitar a operação sem sobrescrever o cadastro completo.

Resultado do ciclo 7 em HML após liberação:

| Operação                   | Resultado                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `adicionarArquivo`         | OK, retornou `IdArquivo=140563` no ciclo completo                                          |
| `adicionarConteudoArquivo` | OK, completou o upload em partes                                                           |
| `atualizarContatos`        | OK com `idContato=100000196` e `StaOperacao=R`                                             |
| `enviarEmail`              | OK com remetente `sei@anpd.gov.br`; gerou documento `0178406` (`idDocumento=196908`)       |
| `registrarOuvidoria`       | Bloqueado por configuração: `Tipo do Contato não informado.` ao criar contato de ouvidoria |

Observações do ciclo 7:

- O SMTP recusou `lucianoedipo@gmail.com` como remetente, mas aceitou
  `sei@anpd.gov.br` como remetente e `lucianoedipo@gmail.com` como
  destinatário.
- Todos os tipos retornados por `listarTiposProcedimentoOuvidoria` em HML estão
  com `sinOuvidoriaAnonimo=false`; portanto, o smoke de ouvidoria deve ser
  não-anônimo.
- A falha restante de `registrarOuvidoria` indica configuração faltante no SEI,
  provavelmente o parâmetro `ID_TIPO_CONTATO_OUVIDORIA`, e não falha de
  serialização do `sei-client`.

## Próximos passos

### sip-client

1. Capturar fixtures reais anonimizadas restantes do SIP, priorizando órgãos,
   unidades, perfis com recursos e listas vazias.
2. Complementar as fixtures sintéticas restantes por fixtures reais onde isso
   reduzir risco de divergência com o SIP HML.
3. Revisar a nomenclatura pública do `@anpdgovbr/sip-client` antes da primeira
   versão estável, especialmente se novas fixtures indicarem campos não mapeados.

### sei-client

4. Capturar fixtures SOAP reais anonimizadas dos ciclos 1, 2 e 3 do SEI para
   travar mappers de listas, consultas compostas e escritas mínimas já validadas
   em HML.
5. Configurar no SEI HML o tipo de contato de ouvidoria usado por
   `registrarOuvidoria` (parâmetro `ID_TIPO_CONTATO_OUVIDORIA`) ou confirmar
   outro ajuste equivalente para permitir cadastro/reuso de contato de
   ouvidoria.
6. Reexecutar `SEI_SMOKE_ALLOW_WRITE=1 SEI_SMOKE_CONTATO_ID=100000196 SEI_SMOKE_EMAIL_DESTINATARIO=lucianoedipo@gmail.com pnpm smoke:sei -- --cycle 7`
   após o ajuste de ouvidoria.
7. Manter `enviarProcesso`, `atribuirProcesso`, operações de documento e
   exclusões do ciclo 4 como `planned` até haver roteiro de massa/limpeza HML
   específico.

O ciclo 0 do SEI já está preparado em `scripts/smoke-sei.ts` e registrado como
`pnpm smoke:sei`. O runner carrega `.env`, mascara `IdentificacaoServico` no
debug SOAP, permite `--plan`, `--cycle` e `--operation`, e reaproveita
configuração compartilhável do SIP quando possível:

- `SEI_SOAP_ENDPOINT` pode ficar vazio se `SIP_SOAP_ENDPOINT` terminar em
  `/sip/ws/SipWS.php`; nesse caso o smoke deriva `/sei/ws/SeiWS.php` no mesmo
  host.
- `SEI_SMOKE_SIGLA_USUARIO` pode ficar vazia se `SIP_SMOKE_SIGLA_USUARIO` ou a
  sigla da persona SIP ativa estiver preenchida.

### Publicação

9. Publicar manualmente `@anpdgovbr/sip-client` e `@anpdgovbr/sei-client` no
   registry interno quando os pacotes estiverem prontos para consumo.
