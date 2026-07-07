# @anpdgovbr/sei-integrations

[![pipeline status](https://gitlab.anpd.gov.br/publico/libs/sei-integrations/badges/dev/pipeline.svg)](https://gitlab.anpd.gov.br/publico/libs/sei-integrations/-/commits/dev)
[![coverage report](https://gitlab.anpd.gov.br/publico/libs/sei-integrations/badges/dev/coverage.svg)](https://gitlab.anpd.gov.br/publico/libs/sei-integrations/-/commits/dev)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-F69220?logo=pnpm&logoColor=white)](pnpm-workspace.yaml)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.base.json)

Monorepo interno de bibliotecas TypeScript para integrações com **SIP** e
**SEI**. Os pacotes são desenhados para reuso entre aplicações, sem
dependência de frameworks, bancos de dados, autorização, UI ou runtime
específico.

## Sumário

- [Pacotes](#pacotes)
- [Fronteira de responsabilidade](#fronteira-de-responsabilidade)
- [Quando usar cada pacote](#quando-usar-cada-pacote)
- [Desenvolvimento](#desenvolvimento)
- [Documentação](#documentação)
- [CI/CD e ferramental](#cicd-e-ferramental)

## Pacotes

| Pacote                                         | Status       | Descrição                                                  |
| ---------------------------------------------- | ------------ | ---------------------------------------------------------- |
| [`@anpdgovbr/sip-client`](packages/sip-client) | 🟢 publicado | Cliente SOAP RPC/encoded para o webservice do SIP.         |
| [`@anpdgovbr/sei-client`](packages/sei-client) | ⚪ reservado | Integração direta com SEI. Ainda sem contrato operacional. |

## Fronteira de responsabilidade

O pacote SIP é agnóstico de aplicação. Ele não lê `.env`, não conhece Next.js,
Prisma, RBAC, UI, auditoria ou regras de produto. A aplicação consumidora deve
resolver configuração, cache, autorização, logging e persistência.

O fluxo funcional coberto pelo pacote SIP é:

```text
aplicação consumidora ──▶ SIP SOAP ──▶ dados do sistema alvo cadastrado no SIP
```

## Quando usar cada pacote

**`@anpdgovbr/sip-client`** — quando a aplicação precisa consultar ou
replicar usuários, unidades, perfis, recursos e permissões do sistema
cadastrado no SIP. Esse é o caminho esperado para autorização e sincronização
vinculadas ao SIP.

**`@anpdgovbr/sei-client`** — somente para integrações diretas com operações
do SEI que não são contrato do SIP. O escopo público desse pacote deve ser
definido antes da implementação, usando o código-fonte do SEI 5.0.4 como
referência: endpoints expostos, autenticação, operações permitidas, tipos de
erro e diferenças explícitas em relação ao SIP.

**Composição própria na aplicação** — quando a regra depende de produto,
banco, cache, RBAC, auditoria, UI, filas ou orquestração entre múltiplas
fontes. Essas decisões não devem entrar nos clientes base.

## Desenvolvimento

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

Notas de desenvolvimento, fixtures de contrato e próximos passos ficam em
[doc/desenvolvimento.md](doc/desenvolvimento.md).

## Documentação

| Documento                                                                | Conteúdo                                   |
| ------------------------------------------------------------------------ | ------------------------------------------ |
| [Guia do sip-client](doc/sip-client.md)                                  | Uso detalhado do cliente SIP               |
| [Contrato SIP WSDL](doc/sip-contrato-wsdl.md)                            | Contrato público do webservice             |
| [Migração de consumidores](doc/migracao-consumidores.md)                 | Passo a passo de adoção do pacote          |
| [Inconsistências SEI × SIP](doc/sei-sip-inconsistencias-para-dev-sei.md) | Divergências relevantes para o time do SEI |

## CI/CD e ferramental

O repositório segue o padrão das bibliotecas internas ANPD:

- branch de integração: `dev`;
- branch de homologação/release: `main`;
- registry interno: `https://npm.anpd.gov.br`;
- CI por catálogo em [`.gitlab-ci.yml`](.gitlab-ci.yml): `ci-gitleaks`,
  `ci-node`, `sonarqube`, `ci-changeset-monorepo` e `pages-typedoc`;
- SonarQube via componente de catálogo `sonarqube@v6.3.0`, com projeto
  definido em [`sonar-project.properties`](sonar-project.properties) e
  `SONAR_HOST_URL`/`SONAR_TOKEN` definidos como variáveis de CI;
- dependências base centralizadas no `catalog` do `pnpm-workspace.yaml`;
- versionamento via [Changesets](https://github.com/changesets/changesets) em
  modo global entre os pacotes;
- publicação manual por pacote com `pnpm publish:sip` e `pnpm publish:sei`.
