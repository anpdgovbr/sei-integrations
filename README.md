# @anpdgovbr/sei-integrations

[![CI](https://github.com/anpdgovbr/sei-integrations/actions/workflows/ci.yml/badge.svg)](https://github.com/anpdgovbr/sei-integrations/actions/workflows/ci.yml)
[![npm sip-client](https://img.shields.io/npm/v/%40anpdgovbr%2Fsip-client?label=sip-client)](https://www.npmjs.com/package/@anpdgovbr/sip-client)
[![npm sei-client](https://img.shields.io/npm/v/%40anpdgovbr%2Fsei-client?label=sei-client)](https://www.npmjs.com/package/@anpdgovbr/sei-client)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-F69220?logo=pnpm&logoColor=white)](pnpm-workspace.yaml)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.base.json)

Monorepo de bibliotecas TypeScript para integrações com **SIP** e **SEI**,
mantido pela ANPD. Os pacotes são desenhados para reuso entre aplicações, sem
dependência de frameworks, bancos de dados, autorização, UI ou runtime
específico.

## Sumário

- [Pacotes](#pacotes)
- [Uso rápido](#uso-rápido)
- [Fronteira de responsabilidade](#fronteira-de-responsabilidade)
- [Quando usar cada pacote](#quando-usar-cada-pacote)
- [Desenvolvimento](#desenvolvimento)
- [Documentação](#documentação)
- [CI/CD e ferramental](#cicd-e-ferramental)
- [Segurança](#segurança)
- [Contribuindo](#contribuindo)

## Pacotes

| Pacote                                             | Status       | Descrição                                                            |
| -------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| [`@anpdgovbr/sip-client`](packages/sip-client)     | 🟢 publicado | Cliente SOAP RPC/encoded para o webservice do SIP.                   |
| [`@anpdgovbr/sei-client`](packages/sei-client)     | 🟢 publicado | Cliente SOAP RPC/encoded para o webservice do SEI (`SeiWS.php`).     |
| [`@anpdgovbr/sei-sip-soap`](packages/sei-sip-soap) | 🟢 publicado | Infraestrutura SOAP compartilhada pelos clientes (uso interno/base). |

## Uso rápido

Instale o(s) pacote(s) que precisar com o gerenciador de sua preferência:

```bash
npm install @anpdgovbr/sip-client @anpdgovbr/sei-client
# ou
yarn add @anpdgovbr/sip-client @anpdgovbr/sei-client
# ou
pnpm add @anpdgovbr/sip-client @anpdgovbr/sei-client
```

Consultar permissões/usuários no SIP:

```ts
import { createSipClient } from "@anpdgovbr/sip-client"

const sip = createSipClient({
  endpointUrl: process.env.SIP_SOAP_ENDPOINT!,
  accessKey: process.env.SIP_ACCESS_KEY!,
  systemId: process.env.SIP_SYSTEM_ID!,
  requestTimeoutMs: 30_000,
})

const usuario = await sip.consultas.buscarUsuarioPorSigla("joao.silva")
```

Consultar ou operar processos/documentos no SEI:

```ts
import { createSeiClient } from "@anpdgovbr/sei-client"

const sei = createSeiClient({
  endpointUrl: process.env.SEI_SOAP_ENDPOINT!,
  siglaSistema: process.env.SEI_SIGLA_SISTEMA!,
  identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
  requestTimeoutMs: 30_000,
})

const proc = await sei.consultas.consultarProcedimento({
  idUnidade: "110000001",
  protocoloProcedimento: "00000.000001/2026-01",
})
```

Nenhum dos dois pacotes lê `.env` — a aplicação consumidora monta a
configuração e decide como carregá-la. Veja os guias completos em
[Documentação](#documentação) para autenticação, tratamento de erros e a API
completa de cada pacote.

## Fronteira de responsabilidade

Os clientes são agnósticos de aplicação. Eles não leem `.env`, não conhecem
Next.js, Prisma, RBAC, UI, auditoria ou regras de produto. A aplicação
consumidora deve resolver configuração, cache, autorização, logging e
persistência.

O fluxo funcional coberto pelos pacotes é:

```text
aplicação consumidora ──▶ sip-client ──▶ SIP SOAP (usuários, unidades, perfis, permissões)
aplicação consumidora ──▶ sei-client ──▶ SEI SOAP (processos, documentos, blocos, publicações, ...)
```

## Quando usar cada pacote

**`@anpdgovbr/sip-client`** — quando a aplicação precisa consultar ou
replicar usuários, unidades, perfis, recursos e permissões do sistema
cadastrado no SIP. Esse é o caminho esperado para autorização e sincronização
vinculadas ao SIP.

**`@anpdgovbr/sei-client`** — para integrações diretas com o Web Service do
SEI (`SeiWS.php`): consulta e criação de processos e documentos, tramitação,
blocos, marcadores, controle de prazo, anotações, publicações, e-mail e
ouvidoria. A API segue o contrato do SEI 5.0.4 e foi validada contra o
código-fonte oficial e em ambiente de homologação.

**`@anpdgovbr/sei-sip-soap`** — não consuma diretamente em aplicações finais.
É a base compartilhada de transporte SOAP (envelope, parsing, erros) publicada
para resolver a dependência de runtime dos dois clientes.

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

## Documentação

Referência completa da API (classes, tipos e funções dos três pacotes),
gerada com TypeDoc: **https://anpdgovbr.github.io/sei-integrations/**

Guias de uso, também disponíveis na própria referência acima (seção
"Guias"):

| Documento                                                | Conteúdo                          |
| -------------------------------------------------------- | --------------------------------- |
| [Guia do sip-client](doc/sip-client.md)                  | Uso detalhado do cliente SIP      |
| [Guia do sei-client](doc/sei-client.md)                  | Uso detalhado do cliente SEI      |
| [Contrato SIP WSDL](doc/sip-contrato-wsdl.md)            | Contrato público do webservice    |
| [Migração de consumidores](doc/migracao-consumidores.md) | Passo a passo de adoção do pacote |

## CI/CD e ferramental

- branch de integração: `dev`;
- branch de homologação/release: `main`;
- pacotes publicados em `npmjs.org` sob o escopo `@anpdgovbr`; a ANPD também
  mantém um espelho interno em registry próprio para uso institucional;
- CI em GitHub Actions: lint, typecheck, testes com cobertura, build e
  verificação de changesets a cada push/PR
  ([`ci.yml`](.github/workflows/ci.yml)), documentação de API publicada via
  TypeDoc/GitHub Pages ([`docs.yml`](.github/workflows/docs.yml)) e release
  automatizado por Changesets ([`release.yml`](.github/workflows/release.yml));
- a ANPD mantém em paralelo um pipeline interno no GitLab
  ([`.gitlab-ci.yml`](.gitlab-ci.yml)) com SonarQube, detecção de segredos e
  publicação no registry institucional;
- dependências base centralizadas no `catalog` do `pnpm-workspace.yaml`;
- versionamento via [Changesets](https://github.com/changesets/changesets) em
  modo global entre os pacotes;
- documentação de API gerada com TypeDoc via `pnpm run docs` (saída em
  `docs/`).

## Segurança

Para relatar vulnerabilidades, siga as instruções em
[SECURITY.md](.github/SECURITY.md). Não abra issues públicas para problemas de
segurança.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de contribuição, padrões
de commit e requisitos antes de abrir um Pull Request.
