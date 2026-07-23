---
title: Guia do sip-client
group: Guias
---

# Guia do sip-client

`@anpdgovbr/sip-client` é um cliente TypeScript para o webservice SOAP do SIP.
Ele é agnóstico de aplicação: não lê `.env`, não conhece framework, banco,
cache, auditoria, autorização, UI ou regras de produto.

## Quando usar

Use este pacote quando uma aplicação precisa consultar ou sincronizar dados do
sistema cadastrado no SIP:

- órgãos;
- unidades;
- usuários;
- perfis;
- recursos;
- permissões;
- operações de replicação liberadas explicitamente no SIP.

Para permissões do SEI, o fluxo esperado é consultar o SIP com o `IdSistema` do
SEI cadastrado no SIP:

```text
aplicação consumidora -> SIP SOAP -> permissões do sistema SEI no SIP
```

Isso não é integração direta com o SEI. Integrações diretas com operações do SEI
(geração de processos, inclusão de documentos, envio e outras operações) pertencem
ao `@anpdgovbr/sei-client`. Veja [sei-client.md](sei-client.md).

## Cadastro e permissões no SIP

A aplicação consumidora deve ser cadastrada como sistema próprio no SIP e deve
receber uma chave de acesso própria.

Para consultas de acesso, libere apenas os serviços necessários:

- Pesquisa de Órgãos;
- Pesquisa de Unidades;
- Pesquisa de Usuários;
- Pesquisa de Perfis;
- Pesquisa de Recursos, quando for necessário inspecionar recursos por perfil;
- Pesquisa de Permissões.

Não libere serviços de replicação para integrações somente leitura.

## Configuração

A aplicação consumidora decide como carregar configuração. Um padrão simples é:

```dotenv
SIP_ACCESS_KEY=chave-gerada-no-sip-para-a-aplicacao
SIP_SYSTEM_ID=100000100
SIP_SOAP_ENDPOINT=https://sei.exemplo.gov.br/sip/ws/SipWS.php
SIP_REQUEST_TIMEOUT_MS=30000
```

`SIP_ACCESS_KEY` deve existir apenas em contexto server-side. Não use variáveis
públicas de frontend para chave de acesso.

## Uso básico

```ts
import { createSipClient } from "@anpdgovbr/sip-client"

const sip = createSipClient({
  endpointUrl: process.env.SIP_SOAP_ENDPOINT!,
  accessKey: process.env.SIP_ACCESS_KEY!,
  systemId: process.env.SIP_SYSTEM_ID!,
  requestTimeoutMs: Number(process.env.SIP_REQUEST_TIMEOUT_MS ?? 30_000),
})

const usuario = await sip.consultas.buscarUsuarioPorSigla("usuario.exemplo")
const permissoes = usuario ? await sip.consultas.listarPermissoes({ idUsuario: usuario.id }) : []
```

Também há um helper composto:

```ts
const result = await sip.consultas.buscarUsuarioComPermissoesPorSigla("usuario.exemplo")

if (result) {
  console.log(result.usuario.id)
  console.log(result.permissoes)
}
```

## Métodos disponíveis

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

Os métodos de consulta na raiz do cliente continuam disponíveis como atalhos de
compatibilidade. Código novo deve preferir `consultas` e `replicacao`.

O mapa detalhado entre API pública, WSDL e `SipWS.php` fica em
[sip-contrato-wsdl.md](sip-contrato-wsdl.md).

## DTOs retornados

O pacote não entrega XML SOAP nem arrays posicionais do PHP para consumidores.
Ele normaliza os retornos do SIP para DTOs TypeScript, preservando os campos do
contrato `InfraSip::$WS_*`.

`SipUnidade` inclui a hierarquia retornada por `carregarUnidades`:

```ts
type SipUnidade = {
  id: string
  idOrgao: string | null
  sigla: string
  descricao: string
  ativo: boolean
  subunidades: string[]
  unidadesSuperiores: string[]
  idOrigem: string | null
}
```

`SipPerfil` inclui grupos, recursos e menus quando `carregarPerfis` retorna
esses blocos, especialmente com `filtroRecursosMenus` igual a `R`, `M` ou `T`:

```ts
type SipPerfil = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  grupos: SipGrupoPerfil[]
  recursos: SipRecurso[]
  menus: SipMenu[]
}
```

Arrays opcionais ausentes no SOAP são normalizados como `[]`, não como `null`.

## Permissões por sigla

`listarPermissao` não aceita filtro por sigla de usuário no WSDL. O fluxo em
duas etapas é obrigatório:

```ts
const usuario = await sip.consultas.buscarUsuarioPorSigla("usuario.exemplo")

if (!usuario) {
  return null
}

return sip.consultas.listarPermissoes({ idUsuario: usuario.id })
```

## Perfis de um usuário em uma unidade

```ts
const perfis = await sip.consultas.listarPerfis({
  idUsuario: "100000103",
  idUnidade: "110000075",
})
```

## Replicação

Replicação no SIP significa escrita/sincronização. Use apenas quando o serviço
correspondente estiver liberado no SIP e quando a aplicação consumidora tiver
fluxo administrativo, autorização e auditoria próprios.

Replicar usuário:

```ts
const ok = await sip.replicacao.replicarUsuarios([
  {
    operacao: "C",
    idOrigem: "ad:usuario.exemplo",
    idOrgao: "0",
    sigla: "usuario.exemplo",
    nome: "Usuario Exemplo",
    cpf: "00000000000",
    email: "usuario.exemplo@example.gov.br",
  },
])
```

Replicar permissão:

```ts
const ok = await sip.replicacao.replicarPermissoes([
  {
    operacao: "A",
    idUsuario: "100000103",
    idUnidade: "110000075",
    idPerfil: "100000940",
    dataInicial: "07/07/2026",
    sinSubunidades: false,
  },
])
```

`idSistema` é opcional em `replicarPermissoes`; se omitido, a lib usa
`config.systemId`.

## Fora do escopo

Estas capacidades existem no WSDL ou no ecossistema SIP/SEI, mas não fazem
parte do escopo inicial do `@anpdgovbr/sip-client`:

- coordenação de perfil;
- SSO interno/externo;
- login unificado;
- assinatura SSO;
- cache;
- auditoria;
- telas administrativas;
- leitura de variáveis de ambiente;
- autorização de usuário final.

Cache, auditoria, autorização e telas são responsabilidades da aplicação
consumidora.

## Pontos de atenção

- O WSDL pode ficar em `/sip/controlador_ws.php?servico=sip`, mas as chamadas
  SOAP são enviadas para `/sip/ws/SipWS.php`.
- O SIP usa SOAP RPC/encoded legado.
- A lib monta envelopes manualmente e normaliza arrays/maps do PHP.
- Operações de replicação usam arrays SOAP tipados, como `ArrayOfUsuarios` e
  `ArrayOfPermissoes`.
- Não monte XML manualmente fora da lib.
- Datas vêm como texto no padrão usado pelo SIP, normalmente `dd/mm/aaaa`.
- `SinSubunidades` e outros sinalizadores `S/N` são convertidos para boolean.
- Falhas SOAP são convertidas em `SipSoapError`, preservando operação, status
  HTTP e mensagem de fault.
