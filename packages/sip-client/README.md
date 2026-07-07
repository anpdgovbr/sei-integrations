# @anpdgovbr/sip-client

Cliente TypeScript para chamadas SOAP RPC/encoded ao webservice do SIP.

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

O pacote não lê variáveis de ambiente. Cada aplicação consumidora deve montar a
configuração conforme seu ambiente e suas regras de segurança.

## Métodos principais

Consultas:

- `sip.consultas.listarOrgaos({ todos })`
- `sip.consultas.listarUnidades({ idUsuario, idUnidade })`
- `sip.consultas.buscarUsuarios({ siglaUsuario, idUsuario, idUnidade, recurso, perfil })`
- `sip.consultas.buscarUsuarioPorSigla(siglaUsuario)`
- `sip.consultas.buscarUsuariosSemPermissao({ siglaUsuario, idUsuario })`
- `sip.consultas.carregarUsuario({ tipoServidorAutenticacao, idOrgaoUsuario, siglaUsuario })`
- `sip.consultas.pesquisarUsuario({ tipoServidorAutenticacao, idOrgao, sigla })`
- `sip.consultas.listarPerfis({ idUsuario, idUnidade, filtroRecursosMenus })`
- `sip.consultas.listarRecursos({ perfis, recursos })`
- `sip.consultas.listarPermissoes({ idUsuario, idUnidade, idPerfil })`
- `sip.consultas.buscarUsuarioComPermissoesPorSigla(siglaUsuario)`

Replicação:

- `sip.replicacao.replicarUsuarios(usuarios)`
- `sip.replicacao.replicarPermissoes(permissoes)`
- `sip.replicacao.validarReplicacao(idReplicacao)`

## Responsabilidades do consumidor

- Carregar e proteger `SIP_ACCESS_KEY` em contexto server-side.
- Definir cache, logging, auditoria e autorização da aplicação.
- Garantir que o sistema consumidor tenha os serviços necessários liberados no
  SIP.

## Documentação

- Repositório: `https://gitlab.anpd.gov.br/publico/libs/sei-integrations`
- Guia completo: `doc/sip-client.md`
- Contrato WSDL/API pública: `doc/sip-contrato-wsdl.md`
