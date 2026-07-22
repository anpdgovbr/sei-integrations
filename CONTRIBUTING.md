# Contribuindo

Este repositório reúne bibliotecas TypeScript para integrações SEI/SIP da
ANPD.

## Fluxo de trabalho

1. Crie branch a partir de `dev`.
2. Faça commits pequenos usando Conventional Commits.
3. Atualize documentação quando houver mudança de API, configuração ou
   comportamento.
4. Inclua changeset para alterações publicáveis.
5. Abra Pull Request para `dev`. A validação completa do pipeline acontece na
   promoção de `dev` para `main`.

## Qualidade

Antes de submeter um Pull Request, execute:

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
- Vulnerabilidades devem ser reportadas conforme [SECURITY.md](.github/SECURITY.md),
  não em issues públicas.

## Documentação

- `README.md`: visão geral do monorepo.
- `doc/sip-client.md`: guia de uso do cliente SIP.
- `doc/sei-client.md`: guia de uso do cliente SEI.
- `doc/sip-contrato-wsdl.md`: mapeamento da API pública ao contrato WSDL do SIP.
- `doc/migracao-consumidores.md`: passo a passo para adotar os pacotes em uma
  aplicação consumidora.
