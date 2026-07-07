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

## Quando usar cada pacote

Use `@anpdgovbr/sip-client` quando a aplicação precisa consultar ou replicar
usuários, unidades, perfis, recursos e permissões do sistema cadastrado no SIP.
Esse é o caminho esperado para autorização e sincronização vinculadas ao SIP.

Use `@anpdgovbr/sei-client` somente para integrações diretas com operações do SEI
que não são contrato do SIP. O escopo público desse pacote deve ser definido
antes da implementação, usando o código-fonte do SEI 5.0.4 como referência:
endpoints expostos, autenticação, operações permitidas, tipos de erro e
diferenças explícitas em relação ao SIP.

Use composição própria na aplicação quando a regra depende de produto, banco,
cache, RBAC, auditoria, UI, filas ou orquestração entre múltiplas fontes. Essas
decisões não devem entrar nos clientes base.

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

Documentação de uso e migração:

- [Guia do sip-client](doc/sip-client.md)
- [Migração de consumidores](doc/migracao-consumidores.md)

## CI/CD e ferramental

O repositório segue o padrão das bibliotecas internas ANPD:

- branch de integração: `dev`;
- branch de homologação/release: `main`;
- registry interno: `https://npm.anpd.gov.br`;
- CI por catálogo em `.gitlab-ci.yml`: `ci-gitleaks`, `ci-node`,
  `ci-changeset-monorepo` e `pages-typedoc`;
- SonarQube via componente de catálogo `sonarqube`, herdado pelo `ci-node`, com
  `SONAR_HOST_URL` e `SONAR_TOKEN` definidos como variáveis de CI;
- dependências base centralizadas no `catalog` do `pnpm-workspace.yaml`;
- versionamento via Changesets em modo independente por pacote;
- publicação manual por pacote com `pnpm publish:sip` e `pnpm publish:sei`.
