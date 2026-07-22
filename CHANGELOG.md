# Changelog - @anpdgovbr/sei-integrations

Este monorepo usa [Changesets](https://github.com/changesets/changesets) para
controle de versão semântico. Cada pacote publicado mantém seu próprio
`CHANGELOG.md`.

## Pacotes

- [`@anpdgovbr/sip-client`](packages/sip-client/CHANGELOG.md): cliente
  TypeScript para integração SOAP com o SIP.
- `@anpdgovbr/sei-client`: pacote reservado para integração direta com SEI.

## 0.1.0

### Initial release

- Publicação inicial do `@anpdgovbr/sip-client`.
- Cliente SOAP RPC/encoded para consultas centrais do SIP.
- DTOs TypeScript para órgãos, unidades, usuários, perfis, recursos e
  permissões.
- Suporte a SOAP Faults, respostas vazias e fixtures reais anonimizadas.
