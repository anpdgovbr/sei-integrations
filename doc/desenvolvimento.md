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

## Homologação SIP

A instância HML pode ser usada com:

```env
SIP_SOAP_ENDPOINT=https://hmlsei.anpd.gov.br/sip/ws/SipWS.php
```

Para smoke local, configure `.env` com `SIP_ACCESS_KEY`, `SIP_SYSTEM_ID`,
`SIP_SOAP_ENDPOINT` e, opcionalmente, `SIP_SMOKE_SIGLA_USUARIO`. Depois rode:

```bash
pnpm smoke:sip
```

O smoke deve permanecer somente leitura. Para homologação futura, vale manter
sistemas/personas separados no SIP por perfil de serviço liberado:

- `consulta-minima`: órgãos, unidades, usuários e permissões;
- `consulta-completa`: consultas mais perfis e recursos;
- `replicacao-usuario`: consultas necessárias e replicação de usuários;
- `replicacao-permissao`: consultas necessárias e replicação de permissões;
- `sem-servico`: sistema sem serviços liberados para validar SOAP Faults.

Essas personas evitam que testes de leitura dependam de permissões de escrita e
facilitam validar falhas de autorização sem alterar código da lib.

Se `pnpm smoke:sip` funcionar sem `SIP_SMOKE_SIGLA_USUARIO`, mas falhar ao
buscar usuário, a conectividade e os serviços gerais estão válidos; investigue
especificamente o serviço `Pesquisa de Usuários`, o cadastro do sistema no SIP,
o `IdSistema` consultado e a existência da sigla informada na base de
homologação.

## Próximos passos

1. Consolidar fixtures reais anonimizadas do SIP.
2. Substituir ou complementar as fixtures sintéticas atuais por fixtures reais
   cobrindo sucesso, listas vazias e SOAP Faults reais.
3. Revisar novamente a nomenclatura pública do `@anpdgovbr/sip-client` quando
   as fixtures reais chegarem, antes da primeira versão estável.
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
