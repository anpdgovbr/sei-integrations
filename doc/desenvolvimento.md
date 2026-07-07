# Desenvolvimento

Este documento concentra decisões e pendências de desenvolvimento do monorepo.
O README raiz deve permanecer como visão geral para consumo e operação.

## Estado atual

- `@anpdgovbr/sip-client` já possui base funcional validada para envelopes SOAP,
  parsing de respostas e mapeamento de entidades centrais do SIP.
- A revisão de nomenclatura pública do SIP foi alinhada ao WSDL/fonte local do
  SEI 5.0.4 em `/home/luciano/anpdgovbr/sei/src/sip/web/ws/sip.wsdl` e
  `/home/luciano/anpdgovbr/sei/src/sip/web/ws/SipWS.php`.
- Os aliases públicos `SeiSip*` foram removidos para não confundir o cliente SIP
  com integração direta ao SEI.
- As operações de replicação foram separadas por contrato:
  `SipOperacaoReplicacaoUsuario` (`C`, `A`, `E`, `D`, `R`) e
  `SipOperacaoReplicacaoPermissao` (`A`, `E`).
- `@anpdgovbr/sei-client` ainda é um pacote reservado. O contrato público deve
  ser definido antes da implementação, usando o código-fonte do SEI 5.0.4 como
  referência.
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

## Próximos passos

1. Capturar fixtures reais anonimizadas restantes do SIP, priorizando órgãos,
   unidades, perfis com recursos e listas vazias.
2. Complementar as fixtures sintéticas restantes por fixtures reais onde isso
   reduzir risco de divergência com o SIP HML.
3. Revisar novamente a nomenclatura pública do `@anpdgovbr/sip-client` antes da
   primeira versão estável, especialmente se novas fixtures indicarem campos
   ainda não mapeados.
4. Definir o escopo inicial do `@anpdgovbr/sei-client`.
5. Mapear no SEI 5.0.4 os pontos de integração direta permitidos:
   autenticação, endpoints, operações, tipos de erro e diferenças em relação ao
   SIP.
6. Implementar o primeiro contrato mínimo do `@anpdgovbr/sei-client` somente
   depois de documentar esse escopo.
7. Publicar manualmente os pacotes necessários no registry interno.

## Critérios para iniciar o sei-client

Antes de implementar código no `@anpdgovbr/sei-client`, precisamos fechar:

- quais operações diretas do SEI serão expostas;
- qual mecanismo de autenticação será usado;
- quais endpoints são estáveis e permitidos para uso por biblioteca;
- como erros do SEI serão normalizados;
- quais responsabilidades ficam fora da lib e pertencem à aplicação consumidora;
- como a integração direta se diferencia de consultar dados via SIP.
