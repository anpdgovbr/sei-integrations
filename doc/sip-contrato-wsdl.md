# Contrato SIP WSDL

Este documento mapeia a API pública do `@anpdgovbr/sip-client` para o WSDL e o
código-fonte do SIP 5.0.4.

Fontes usadas: WSDL público do serviço (`sip/web/ws/sip.wsdl`) e código-fonte
de referência do SIP (`sip/web/ws/SipWS.php`) da versão 5.0.4.

## Endpoint e SOAP

- WSDL público: normalmente `/sip/controlador_ws.php?servico=sip`
- Endpoint SOAP: `/sip/ws/SipWS.php`
- Service WSDL: `sipService`
- Port WSDL: `sipPortType`
- Binding WSDL: `sipBinding`
- Namespace SOAP body: `sipns`
- Binding style: `rpc`
- Encoding: `http://schemas.xmlsoap.org/soap/encoding/`
- SOAPAction: `sipnsAction`

## Observação sobre IdSistema

O WSDL do SIP 5.0.4 não usa um único tipo para `IdSistema`.

- `carregarOrgaos`, `carregarUnidades`, `carregarUsuarios`,
  `carregarUsuariosSemPermissao` e `carregarPerfis` declaram `IdSistema` como
  `xsd:long`;
- `carregarUsuario`, `carregarRecursos` e `listarPermissao` declaram
  `IdSistema` como `xsd:string`;
- estruturas de replicação e retorno também usam `IdSistema` como string em
  alguns pontos.

Por isso o cliente serializa `IdSistema` conforme a operação, em vez de assumir
um tipo global único.

## Consultas implementadas

| API pública                                    | Operação SOAP                          | Método PHP                                           | Serviço liberado esperado                     | Partes WSDL                                                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consultas.listarOrgaos`                       | `carregarOrgaos`                       | `SipWS::carregarOrgaos`                              | Pesquisa de Órgãos                            | `ChaveAcesso`, `IdSistema`, `SinTodos`                                                                                                                                           |
| `consultas.listarUnidades`                     | `carregarUnidades`                     | `SipWS::carregarUnidades`                            | Pesquisa de Unidades                          | `ChaveAcesso`, `IdSistema`, `IdUsuario`, `IdUnidade`                                                                                                                             |
| `consultas.buscarUsuarios`                     | `carregarUsuarios`                     | `SipWS::carregarUsuarios`                            | Pesquisa de Usuários                          | `ChaveAcesso`, `IdSistema`, `IdUnidade`, `Recurso`, `Perfil`, `IdOrgaoUsuario`, `IdUsuario`, `IdOrigemUsuario`, `SiglaUsuario`                                                   |
| `consultas.buscarUsuarioPorSigla`              | `carregarUsuarios`                     | `SipWS::carregarUsuarios`                            | Pesquisa de Usuários                          | Usa `SiglaUsuario` e demais filtros nulos                                                                                                                                        |
| `consultas.buscarUsuariosSemPermissao`         | `carregarUsuariosSemPermissao`         | `SipWS::carregarUsuariosSemPermissao`                | Pesquisa de Usuários                          | `ChaveAcesso`, `IdSistema`, `IdOrgaoUsuario`, `IdUsuario`, `IdOrigemUsuario`, `SiglaUsuario`                                                                                     |
| `consultas.carregarUsuario`                    | `carregarUsuario`                      | `SipWS::carregarUsuario`                             | Pesquisa de Usuários                          | `ChaveAcesso`, `IdSistema`, `TipoServidorAutenticacao`, `IdOrgaoUsuario`, `SiglaUsuario`                                                                                         |
| `consultas.pesquisarUsuario`                   | `pesquisarUsuario`                     | `SipWS::pesquisarUsuario`                            | Pesquisa de Usuários                          | `ChaveAcesso`, `TipoServidorAutenticacao`, `IdOrgao`, `Sigla`                                                                                                                    |
| `consultas.listarPerfis`                       | `carregarPerfis`                       | `SipWS::carregarPerfis`                              | Pesquisa de Perfis                            | `ChaveAcesso`, `IdSistema`, `IdUsuario`, `IdUnidade`, `IdPerfil`, `IdGruposPerfil`, `NomeGruposPerfil`, `StaFiltroRecursosMenus`                                                 |
| `consultas.listarRecursos`                     | `carregarRecursos`                     | `SipWS::carregarRecursos`                            | Pesquisa de Recursos                          | `ChaveAcesso`, `IdSistema`, `Perfis`, `Recursos`                                                                                                                                 |
| `consultas.listarPermissoes`                   | `listarPermissao`                      | `SipWS::listarPermissao`                             | Pesquisa de Permissões                        | `ChaveAcesso`, `IdSistema`, `IdOrgaoUsuario`, `IdUsuario`, `IdOrigemUsuario`, `IdOrgaoUnidade`, `IdUnidade`, `IdOrigemUnidade`, `IdPerfil`, `IdGruposPerfil`, `NomeGruposPerfil` |
| `consultas.buscarUsuarioComPermissoesPorSigla` | `carregarUsuarios` + `listarPermissao` | `SipWS::carregarUsuarios` + `SipWS::listarPermissao` | Pesquisa de Usuários + Pesquisa de Permissões | Primeiro busca por `SiglaUsuario`; depois usa `IdUsuario`                                                                                                                        |

## Replicação implementada

| API pública                     | Operação SOAP       | Método PHP                 | Serviço liberado esperado | Partes WSDL                                                           |
| ------------------------------- | ------------------- | -------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `replicacao.replicarUsuarios`   | `replicarUsuario`   | `SipWS::replicarUsuario`   | Replicação de Usuários    | `ChaveAcesso`, `Usuarios`, `SinConsiderarOrgao`, `SistemasReplicacao` |
| `replicacao.replicarPermissoes` | `replicarPermissao` | `SipWS::replicarPermissao` | Replicação de Permissões  | `ChaveAcesso`, `Permissoes`                                           |
| `replicacao.validarReplicacao`  | `validarReplicacao` | `SipWS::validarReplicacao` | Replicação                | `ChaveAcesso`, `IdReplicacao`                                         |

## Operações de replicação

`replicarUsuario` aceita, conforme `SipWS.php`:

- `C`: cadastrar;
- `A`: alterar;
- `E`: excluir;
- `D`: desativar;
- `R`: reativar.

`replicarPermissao` aceita:

- `A`: cadastrar ou alterar;
- `E`: excluir.

## Operações fora do escopo inicial

Existem no WSDL, mas não foram expostas no pacote:

- `validarLogin`
- `validarLoginSso`
- `obterLoginSso`
- `obterUrlAssinaturaSso`
- `obterLogoutSso`
- `loginUnificado`
- `removerLogin`
- `listarAcessos`
- `autenticar`
- `autenticarCompleto`
- `replicarCoordenacaoPerfil`
- `listarCoordenacaoPerfil`

Essas operações envolvem SSO, autenticação, histórico de acesso ou coordenação
de perfil. Elas devem ser avaliadas separadamente antes de entrar na API
pública.

## Validação de carregarUsuarios

O contrato implementado para `carregarUsuarios` usa a mesma ordem e os mesmos
nomes do WSDL:

1. `ChaveAcesso`
2. `IdSistema`
3. `IdUnidade`
4. `Recurso`
5. `Perfil`
6. `IdOrgaoUsuario`
7. `IdUsuario`
8. `IdOrigemUsuario`
9. `SiglaUsuario`

O cliente possui fixture real anonimizada de sucesso para `carregarUsuarios` e
fixture real anonimizada de SOAP Fault de autorização quando o serviço
`Pesquisa de Usuários` não está liberado para o sistema consumidor.

Observação de comportamento do serviço: se houver permissão com
`sin_subunidades='S'` apontando para uma unidade fora da hierarquia ativa do
sistema, o SIP responde com SOAP Fault genérico (HTTP 500) em vez de uma
mensagem diagnóstica. Isso é comportamento interno do serviço, não erro de
serialização do `sip-client`; se a operação retornar Fault inesperado, vale
conferir o cadastro de hierarquia/permissão do sistema integrador antes de
investigar o cliente.
