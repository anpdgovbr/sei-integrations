# @anpdgovbr/sei-integrations

Monorepo interno de bibliotecas TypeScript para integrações com SIP e SEI.
Os pacotes são desenhados para reuso entre aplicações, sem dependência de
frameworks, bancos de dados, autorização, UI ou runtime específico.

## Pacotes

- `@anpdgovbr/sip-client`: cliente SOAP RPC/encoded para o webservice do SIP.
- `@anpdgovbr/sei-client`: pacote reservado para integração direta com SEI. Ainda não possui contrato operacional.

## Fronteira de responsabilidade

O pacote SIP é agnóstico de aplicação. Ele não lê `.env`, não conhece Next.js,
Prisma, RBAC, UI, auditoria ou regras de produto. A aplicação consumidora deve
resolver configuração, cache, autorização, logging e persistência.

O fluxo funcional coberto pelo pacote SIP é:

```text
aplicação consumidora -> SIP SOAP -> dados do sistema alvo cadastrado no SIP
```

## Desenvolvimento

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## CI/CD e ferramental

O repositório segue o padrão das bibliotecas internas ANPD:

- branch de integração: `dev`;
- branch de homologação/release: `main`;
- registry interno: `https://npm.anpd.gov.br`;
- CI por catálogo em `.gitlab-ci.yml`: `ci-gitleaks`, `ci-node`,
  `ci-changeset-monorepo` e `pages-typedoc`;
- dependências base centralizadas no `catalog` do `pnpm-workspace.yaml`;
- publicação e versionamento via Changesets.

## Próximos passos

1. Confirmar o pipeline inicial na branch `dev`.
2. Definir se a primeira publicação será global do monorepo ou por pacote.
3. Publicar versão inicial `0.1.0` de `@anpdgovbr/sip-client` no registry interno.
4. Revisar nomenclatura pública antes da primeira versão estável.
5. Adicionar testes de contrato com fixtures reais anonimizadas do WSDL SIP, incluindo falhas SOAP e respostas vazias.
6. Definir o escopo do `@anpdgovbr/sei-client` antes de implementar: endpoints diretos do SEI, autenticação, operações permitidas e diferenças em relação ao SIP.
7. Documentar claramente quando uma aplicação deve usar SIP, SEI direto ou uma composição própria da aplicação.
