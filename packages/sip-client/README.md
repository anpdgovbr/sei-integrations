# @anpdgovbr/sip-client

[![npm.anpd.gov.br](https://img.shields.io/badge/npm.anpd.gov.br-1.0.0-CB3837?logo=npm&logoColor=white)](https://npm.anpd.gov.br)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![module](https://img.shields.io/badge/module-ESM%20%2B%20CJS-yellow.svg)](package.json)
[![typescript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](../../tsconfig.base.json)

Cliente TypeScript para chamadas SOAP RPC/encoded ao webservice do SIP —
sem dependência de framework, `.env` ou runtime específico. A aplicação
consumidora resolve configuração, cache, autorização e persistência.

## Sumário

- [Instalação](#instalação)
- [Uso](#uso)
- [Métodos principais](#métodos-principais)
- [Responsabilidades do consumidor](#responsabilidades-do-consumidor)
- [Documentação](#documentação)

## Instalação

```bash
pnpm add @anpdgovbr/sip-client
```

## Uso

```ts
import { createSipClient } from "@anpdgovbr/sip-client"

const sip = createSipClient({
  endpointUrl: "https://sei.anpd.gov.br/sip/ws/SipWS.php",
  accessKey: process.env.SIP_ACCESS_KEY!,
  systemId: "100000100",
  requestTimeoutMs: 30_000,
})

const usuario = await sip.consultas.buscarUsuarioPorSigla("usuario.exemplo")
```

> O pacote não lê variáveis de ambiente. Cada aplicação consumidora deve
> montar a configuração conforme seu ambiente e suas regras de segurança.

## Métodos principais

### Consultas

| Método                                                                                      | Descrição                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `sip.consultas.listarOrgaos({ todos })`                                                     | Lista órgãos cadastrados no SIP            |
| `sip.consultas.listarUnidades({ idUsuario, idUnidade })`                                    | Lista unidades vinculadas                  |
| `sip.consultas.buscarUsuarios({ siglaUsuario, idUsuario, idUnidade, recurso, perfil })`     | Busca usuários por filtros combinados      |
| `sip.consultas.buscarUsuarioPorSigla(siglaUsuario)`                                         | Busca um usuário por sigla                 |
| `sip.consultas.buscarUsuariosSemPermissao({ siglaUsuario, idUsuario })`                     | Usuários sem permissão associada           |
| `sip.consultas.carregarUsuario({ tipoServidorAutenticacao, idOrgaoUsuario, siglaUsuario })` | Carrega dados completos do usuário         |
| `sip.consultas.pesquisarUsuario({ tipoServidorAutenticacao, idOrgao, sigla })`              | Pesquisa usuário por órgão e sigla         |
| `sip.consultas.listarPerfis({ idUsuario, idUnidade, filtroRecursosMenus })`                 | Lista perfis do usuário/unidade            |
| `sip.consultas.listarRecursos({ perfis, recursos })`                                        | Lista recursos vinculados a perfis         |
| `sip.consultas.listarPermissoes({ idUsuario, idUnidade, idPerfil })`                        | Lista permissões do usuário                |
| `sip.consultas.buscarUsuarioComPermissoesPorSigla(siglaUsuario)`                            | Busca usuário já com permissões resolvidas |

### Replicação

| Método                                           | Descrição                            |
| ------------------------------------------------ | ------------------------------------ |
| `sip.replicacao.replicarUsuarios(usuarios)`      | Replica usuários para o SIP          |
| `sip.replicacao.replicarPermissoes(permissoes)`  | Replica permissões para o SIP        |
| `sip.replicacao.validarReplicacao(idReplicacao)` | Valida o resultado de uma replicação |

## Responsabilidades do consumidor

- Carregar e proteger `SIP_ACCESS_KEY` em contexto server-side.
- Definir cache, logging, auditoria e autorização da aplicação.
- Garantir que o sistema consumidor tenha os serviços necessários liberados no
  SIP.

## Documentação

- Repositório: [`gitlab.anpd.gov.br/publico/libs/sei-integrations`](https://gitlab.anpd.gov.br/publico/libs/sei-integrations)
- Guia completo: [`doc/sip-client.md`](../../doc/sip-client.md)
- Contrato WSDL/API pública: [`doc/sip-contrato-wsdl.md`](../../doc/sip-contrato-wsdl.md)
