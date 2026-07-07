/**
 * Contratos públicos de cliente SIP.
 *
 * O SIP conhece usuários, unidades, perfis e permissões de cada sistema
 * cadastrado. O consumidor informa o id do sistema alvo no SIP.
 */
export type SipConfig = Readonly<{
  /** Endpoint SOAP real. O WSDL aponta para este arquivo em /sip/ws/SipWS.php. */
  endpointUrl: string
  /** Chave de acesso gerada no cadastro do sistema consumidor dentro do SIP. */
  accessKey: string
  /** IdSistema alvo no SIP. */
  systemId: string
  /** Tempo máximo de cada chamada SOAP. */
  requestTimeoutMs: number
}>

export type SipScalarSoapValue = string | number | boolean | null | undefined

export interface SipSoapStructValue {
  readonly [key: string]: SipSoapParamValue
}

/**
 * Representa um array SOAP RPC/encoded.
 *
 * Evitamos inferência mágica aqui porque o SIP é um serviço PHP legado e cada
 * operação espera nomes de tipos específicos do WSDL (`ArrayOfPermissoes`,
 * `Usuario`, `Permissao` etc.). Esse shape deixa a intenção explícita e torna a
 * futura extração para um pacote independente previsível.
 */
export type SipSoapArrayValue = Readonly<{
  arrayType: string
  itemType: string
  items: readonly SipSoapParamValue[]
}>

export type SipSoapParamValue = SipScalarSoapValue | SipSoapStructValue | SipSoapArrayValue

export type SipRawValue = string | number | boolean | null | SipRawMap | SipRawValue[]

export interface SipRawMap {
  readonly [key: string]: SipRawValue
}

export type SipSoapCallOptions = Readonly<{
  operation: string
  params: Readonly<Record<string, SipSoapParamValue>>
}>

export type SipOperacaoReplicacao = "I" | "A" | "E"

export type SipFiltroRecursosMenus = "N" | "R" | "M" | "T"

export type SipOrgao = Readonly<{
  id: string
  sigla: string
  descricao: string
  ativo: boolean
}>

export type SipUnidade = Readonly<{
  /**
   * Algumas operações do SIP devolvem unidades apenas como
   * [sigla, descrição, ativo]. Quando isso ocorrer, o id fica nulo.
   */
  id: string | null
  sigla: string
  descricao: string
  ativo: boolean
}>

export type SipUsuario = Readonly<{
  id: string
  idOrigem: string | null
  idOrgao: string | null
  sigla: string
  nome: string
  nomeSocial: string | null
  cpf: string | null
  email: string | null
  ativo: boolean
  /** IDs de unidades retornados por `carregarUsuarios` para o filtro aplicado. */
  unidades: string[]
}>

export type SipUsuarioDiretorio = Readonly<{
  idOrgao: string | null
  sigla: string
  nome: string
  nomeSocial: string | null
  cpf: string | null
  email: string | null
}>

export type SipPerfil = Readonly<{
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
}>

export type SipPermissao = Readonly<{
  idSistema: string
  idOrgaoUsuario: string | null
  idUsuario: string
  idOrigemUsuario: string | null
  idOrgaoUnidade: string | null
  idUnidade: string
  idOrigemUnidade: string | null
  idPerfil: string
  /** Data em formato textual do SIP, normalmente dd/mm/aaaa. */
  dataInicial: string
  /** Nulo significa permissão sem data final definida. */
  dataFinal: string | null
  sinSubunidades: boolean
}>

export type SipUsuarioComPermissoes = Readonly<{
  usuario: SipUsuario
  permissoes: SipPermissao[]
}>

export type SipListarOrgaosParams = Readonly<{
  todos?: boolean
}>

export type SipListarUnidadesParams = Readonly<{
  idUsuario?: string | null
  idUnidade?: string | null
}>

export type SipBuscarUsuariosParams = Readonly<{
  siglaUsuario?: string | null
  idUsuario?: string | null
  idUnidade?: string | null
  recurso?: string | null
  perfil?: string | null
  idOrgaoUsuario?: string | null
  idOrigemUsuario?: string | null
}>

export type SipBuscarUsuariosSemPermissaoParams = Readonly<{
  idOrgaoUsuario?: string | null
  idUsuario?: string | null
  idOrigemUsuario?: string | null
  siglaUsuario?: string | null
}>

export type SipCarregarUsuarioParams = Readonly<{
  tipoServidorAutenticacao: string
  idOrgaoUsuario: string
  siglaUsuario: string
}>

export type SipPesquisarUsuarioParams = Readonly<{
  tipoServidorAutenticacao: string
  idOrgao: string
  sigla: string
}>

export type SipListarPerfisParams = Readonly<{
  idUsuario?: string | null
  idUnidade?: string | null
  filtroRecursosMenus?: SipFiltroRecursosMenus
}>

export type SipListarRecursosParams = Readonly<{
  perfis?: readonly string[] | null
  recursos?: readonly string[] | null
}>

export type SipListarPermissoesParams = Readonly<{
  idUsuario?: string | null
  idUnidade?: string | null
  idPerfil?: string | null
  idOrgaoUsuario?: string | null
  idOrigemUsuario?: string | null
  idOrgaoUnidade?: string | null
  idOrigemUnidade?: string | null
}>

export type SipReplicarUsuario = Readonly<{
  operacao: SipOperacaoReplicacao
  idOrigem: string
  idOrgao: string
  sigla: string
  nome: string
  nomeSocial?: string | null
  cpf?: string | null
  email?: string | null
}>

export type SipReplicarPermissao = Readonly<{
  operacao?: SipOperacaoReplicacao | null
  idSistema?: string | null
  idOrgaoUsuario?: string | null
  idUsuario?: string | null
  idOrigemUsuario?: string | null
  idOrgaoUnidade?: string | null
  idUnidade?: string | null
  idOrigemUnidade?: string | null
  idPerfil: string
  dataInicial: string
  dataFinal?: string | null
  sinSubunidades: boolean
}>
