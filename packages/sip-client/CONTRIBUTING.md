# Contribuindo com @anpdgovbr/sip-client

## Escopo

Este pacote deve permanecer agnóstico de aplicação. Ele não deve conhecer
framework, banco, cache, UI, autorização de produto ou leitura direta de `.env`.

## Antes de alterar API pública

1. Conferir o WSDL e o código-fonte do SIP 5.0.4.
2. Atualizar DTOs e documentação quando novos campos forem expostos.
3. Adicionar ou ajustar fixtures SOAP reais anonimizadas quando possível.
4. Criar changeset com o bump correspondente.

## Validação

```bash
pnpm --filter @anpdgovbr/sip-client test
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
```

## Publicação

Publicação é manual e por pacote, para o registry público (`npmjs.org`):

```bash
pnpm --filter @anpdgovbr/sip-client publish --access public --registry https://registry.npmjs.org --no-git-checks
```

A ANPD também mantém um espelho interno publicado em paralelo, para uso
institucional.

Use `changeset version` antes de publicar novas versões.
