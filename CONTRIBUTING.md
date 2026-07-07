# Contribuindo

Este repositório interno reúne bibliotecas TypeScript para integrações SEI/SIP
da ANPD.

## Fluxo de trabalho

1. Crie branch a partir de `dev`.
2. Faça commits pequenos usando Conventional Commits.
3. Atualize documentação quando houver mudança de API, configuração ou
   comportamento.
4. Inclua changeset para alterações publicáveis.
5. Abra MR de `dev` para `main` para validar o pipeline completo antes da
   publicação.

## Qualidade

Antes de submeter um MR, execute:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

## Changesets

Para pacotes publicados:

```bash
pnpm changeset
pnpm changeset:version
pnpm changeset:publish
```

Use bump `patch` para correções compatíveis, `minor` para novas funcionalidades
compatíveis e `major` para breaking changes.

## Segurança

- Não commitar secrets.
- Manter `.env` local ignorado.
- Usar `.env.example` apenas com valores vazios ou exemplos não sensíveis.
- Chaves de acesso SIP devem existir apenas em contexto server-side.

## Documentação

- `README.md`: visão geral do monorepo.
- `doc/sip-client.md`: guia de uso do cliente SIP.
- `doc/desenvolvimento.md`: decisões de desenvolvimento, fixtures e smoke HML.
- `doc/sei-sip-inconsistencias-para-dev-sei.md`: evidências para avaliação da
  equipe SEI/SIP.
