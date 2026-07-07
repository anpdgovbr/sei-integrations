# Integrações SEI e SIP

Monorepo de bibliotecas TypeScript internas para integrações com SIP e SEI.

## Pacotes

- `@anpdgovbr/sip-client`: cliente SOAP RPC/encoded para o webservice do SIP.
- `@anpdgovbr/sei-client`: pacote reservado para integração direta com SEI. Ainda não possui contrato operacional.

## Fronteira de responsabilidade

O pacote SIP é agnóstico de aplicação. Ele não lê `.env`, não conhece Next.js,
Prisma, RBAC, UI, auditoria ou regras do SGI. A aplicação consumidora deve
resolver configuração, cache, autorização, logging e persistência.

Para o caso atual do SGI, o fluxo funcional continua sendo:

```text
SGI -> SIP SOAP -> permissões do sistema SEI cadastrado no SIP
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

## LPA - próximos passos

1. Inicializar o repositório Git remoto em `ddss/libs/sei-integrations` ou nome equivalente aprovado.
2. Rodar `pnpm install` no monorepo e commitar o `pnpm-lock.yaml`.
3. Publicar versão inicial `0.1.0` de `@anpdgovbr/sip-client` no registry interno.
4. Trocar o SGI de dependência `workspace:`/local para versão publicada quando o pacote estiver disponível no registry.
5. Revisar nomenclatura pública antes da primeira versão estável: manter aliases `SeiSip*` apenas se forem úteis para compatibilidade.
6. Adicionar testes de contrato com fixtures reais anonimizadas do WSDL SIP, incluindo falhas SOAP e respostas vazias.
7. Definir o escopo do `@anpdgovbr/sei-client` antes de implementar: endpoints diretos do SEI, autenticação, operações permitidas e diferenças em relação ao SIP.
8. Documentar claramente quando uma aplicação deve usar SIP, SEI direto ou uma composição própria da aplicação.
