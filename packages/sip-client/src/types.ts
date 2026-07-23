/**
 * @packageDocumentation
 *
 * Contratos públicos do cliente SIP.
 *
 * Este módulo declara todos os tipos de configuração, entrada e saída
 * expostos pelo pacote `@anpdgovbr/sip-client`. Os tipos estão agrupados em:
 *
 * - **Configuração** — {@link SipConfig}
 * - **SOAP de baixo nível** — {@link SipSoapParamValue}, {@link SipSoapArrayValue},
 *   {@link SipSoapStructValue}, {@link SipScalarSoapValue}, {@link SipSoapCallOptions},
 *   {@link SipRawValue}, {@link SipRawMap}
 * - **Entidades de domínio** — {@link SipOrgao}, {@link SipUnidade}, {@link SipUsuario},
 *   {@link SipUsuarioDiretorio}, {@link SipPerfil}, {@link SipGrupoPerfil},
 *   {@link SipRecurso}, {@link SipMenu}, {@link SipItemMenu}, {@link SipPermissao},
 *   {@link SipUsuarioComPermissoes}
 * - **Parâmetros de consulta** — {@link SipListarOrgaosParams}, {@link SipListarUnidadesParams},
 *   {@link SipBuscarUsuariosParams}, {@link SipBuscarUsuariosSemPermissaoParams},
 *   {@link SipCarregarUsuarioParams}, {@link SipPesquisarUsuarioParams},
 *   {@link SipListarPerfisParams}, {@link SipListarRecursosParams},
 *   {@link SipListarPermissoesParams}
 * - **Parâmetros de replicação** — {@link SipReplicarUsuario}, {@link SipReplicarPermissao},
 *   {@link SipOperacaoReplicacaoUsuario}, {@link SipOperacaoReplicacaoPermissao}
 * - **Auxiliares** — {@link SipFiltroRecursosMenus}
 */

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Parâmetros de conexão com o webservice SOAP do SIP.
 *
 * @remarks
 * A chave de acesso (`accessKey`) é gerada no cadastro do sistema consumidor
 * dentro do SIP e deve ser tratada como segredo — nunca exposta em contextos
 * públicos ou client-side.
 *
 * @example
 * ```ts
 * import { createSipClient } from "@anpdgovbr/sip-client"
 *
 * const sip = createSipClient({
 *   endpointUrl: process.env.SIP_SOAP_ENDPOINT!,
 *   accessKey:   process.env.SIP_ACCESS_KEY!,
 *   systemId:    process.env.SIP_SYSTEM_ID!,
 *   requestTimeoutMs: 30_000,
 * })
 * ```
 *
 * @see {@link createSipClient}
 * @category Configuração
 */
export type SipConfig = Readonly<{
  /**
   * URL do endpoint SOAP do SIP.
   *
   * O WSDL do SIP aponta para `/sip/ws/SipWS.php` na raiz da instalação.
   *
   * @example `"https://sei.orgao.gov.br/sip/ws/SipWS.php"`
   */
  endpointUrl: string
  /**
   * Chave de acesso gerada no cadastro do sistema consumidor dentro do SIP.
   *
   * Deve ser carregada de variável de ambiente server-side. Não utilize
   * variáveis públicas de frontend para este valor.
   */
  accessKey: string
  /**
   * Identificador do sistema alvo cadastrado no SIP (`IdSistema`).
   *
   * Armazenado como `string` porque o WSDL PHP espera texto em algumas
   * operações e `long` em outras; a conversão é feita internamente.
   *
   * @example `"100000100"`
   */
  systemId: string
  /**
   * Tempo máximo de espera para cada chamada SOAP, em milissegundos.
   *
   * Após esse prazo a requisição é abortada e um {@link SipSoapError} com
   * `status` 408 é lançado.
   *
   * @example `30_000`
   */
  requestTimeoutMs: number
}>

// ─── Tipos SOAP de baixo nível (re-exportados de @anpdgovbr/sei-sip-soap) ────────

/**
 * @see {@link import("@anpdgovbr/sei-sip-soap").ScalarSoapValue}
 */
export type {
  RawMap as SipRawMap,
  RawValue as SipRawValue,
  ScalarSoapValue as SipScalarSoapValue,
  SoapArrayValue as SipSoapArrayValue,
  SoapCallOptions as SipSoapCallOptions,
  SoapParamValue as SipSoapParamValue,
  SoapStructValue as SipSoapStructValue,
} from "@anpdgovbr/sei-sip-soap"

// ─── Enumerações auxiliares ───────────────────────────────────────────────────

/**
 * Operações aceitas pelo serviço `replicarUsuario` do SIP 5.0.4.
 *
 * | Código | Significado                  |
 * |--------|------------------------------|
 * | `"C"`  | Cadastrar (criar)            |
 * | `"A"`  | Alterar dados cadastrais     |
 * | `"E"`  | Excluir permanentemente      |
 * | `"D"`  | Desativar (soft delete)      |
 * | `"R"`  | Reativar usuário desativado  |
 *
 * @see {@link SipReplicarUsuario}
 * @category Enumerações
 */
export type SipOperacaoReplicacaoUsuario = "C" | "A" | "E" | "D" | "R"

/**
 * Operações aceitas pelo serviço `replicarPermissao` do SIP 5.0.4.
 *
 * | Código | Significado                      |
 * |--------|----------------------------------|
 * | `"A"`  | Cadastrar ou alterar permissão   |
 * | `"E"`  | Excluir permissão                |
 *
 * @see {@link SipReplicarPermissao}
 * @category Enumerações
 */
export type SipOperacaoReplicacaoPermissao = "A" | "E"

/**
 * Controla quais sub-recursos são incluídos na resposta de `carregarPerfis`.
 *
 * | Código | Comportamento                                |
 * |--------|----------------------------------------------|
 * | `"N"`  | Nenhum filtro adicional (padrão)             |
 * | `"R"`  | Inclui apenas recursos do perfil             |
 * | `"M"`  | Inclui apenas menus do perfil                |
 * | `"T"`  | Inclui recursos e menus do perfil            |
 *
 * @see {@link SipListarPerfisParams}
 * @category Enumerações
 */
export type SipFiltroRecursosMenus = "N" | "R" | "M" | "T"

// ─── Entidades de domínio ─────────────────────────────────────────────────────

/**
 * Órgão cadastrado no SIP.
 *
 * @see {@link SipConsultasClient.listarOrgaos}
 * @category Entidades de Domínio
 */
export type SipOrgao = Readonly<{
  /** Identificador interno do órgão no SIP. */
  id: string
  /** Sigla do órgão (ex.: `"ANPD"`). */
  sigla: string
  /** Nome completo do órgão. */
  descricao: string
  /** Indica se o órgão está ativo. */
  ativo: boolean
}>

/**
 * Unidade organizacional cadastrada no SIP.
 *
 * @remarks
 * `subunidades` e `unidadesSuperiores` são populadas apenas quando o SIP
 * devolve esses dados (depende da versão e dos filtros aplicados).
 *
 * @see {@link SipConsultasClient.listarUnidades}
 * @category Entidades de Domínio
 */
export type SipUnidade = Readonly<{
  /** Identificador interno da unidade no SIP. */
  id: string
  /** Identificador do órgão pai, ou `null` quando não informado. */
  idOrgao: string | null
  /** Identificador de origem (diretório externo), ou `null`. */
  idOrigem: string | null
  /** IDs das unidades diretamente subordinadas a esta. */
  subunidades: string[]
  /** IDs das unidades hierarquicamente superiores. */
  unidadesSuperiores: string[]
  /** Sigla da unidade. */
  sigla: string
  /** Nome completo da unidade. */
  descricao: string
  /** Indica se a unidade está ativa. */
  ativo: boolean
}>

/**
 * Usuário cadastrado no SIP.
 *
 * Retornado pelas operações `carregarUsuarios` e
 * `carregarUsuariosSemPermissao`.
 *
 * @see {@link SipConsultasClient.buscarUsuarios}
 * @see {@link SipConsultasClient.buscarUsuariosSemPermissao}
 * @see {@link SipConsultasClient.buscarUsuarioPorSigla}
 * @category Entidades de Domínio
 */
export type SipUsuario = Readonly<{
  /** Identificador interno do usuário no SIP. */
  id: string
  /** Identificador de origem (diretório externo), ou `null`. */
  idOrigem: string | null
  /** Identificador do órgão ao qual o usuário pertence, ou `null`. */
  idOrgao: string | null
  /** Login / sigla do usuário no sistema. */
  sigla: string
  /** Nome civil completo do usuário. */
  nome: string
  /** Nome social, quando informado, ou `null`. */
  nomeSocial: string | null
  /** CPF do usuário (somente dígitos), ou `null`. */
  cpf: string | null
  /** Endereço de e-mail institucional, ou `null`. */
  email: string | null
  /** Indica se o usuário está ativo. */
  ativo: boolean
  /** IDs de unidades retornados por `carregarUsuarios` para o filtro aplicado. */
  unidades: string[]
}>

/**
 * Dados de um usuário retornados diretamente do diretório de autenticação
 * (operações `carregarUsuario` e `pesquisarUsuario`).
 *
 * @remarks
 * Diferente de {@link SipUsuario}, este tipo não inclui `id`, `idOrigem`,
 * `ativo` nem `unidades`, pois é retornado por operações que consultam o
 * servidor de autenticação diretamente, não o banco interno do SIP.
 *
 * @see {@link SipConsultasClient.carregarUsuario}
 * @see {@link SipConsultasClient.pesquisarUsuario}
 * @category Entidades de Domínio
 */
export type SipUsuarioDiretorio = Readonly<{
  /** Identificador do órgão ao qual o usuário pertence, ou `null`. */
  idOrgao: string | null
  /** Login / sigla do usuário no diretório. */
  sigla: string
  /** Nome civil completo. */
  nome: string
  /** Nome social, quando informado, ou `null`. */
  nomeSocial: string | null
  /** CPF do usuário (somente dígitos), ou `null`. */
  cpf: string | null
  /** Endereço de e-mail, ou `null`. */
  email: string | null
}>

/**
 * Grupo de perfis no SIP.
 *
 * Agrupa perfis relacionados. Retornado como parte de {@link SipPerfil | SipPerfil.grupos}.
 *
 * @see {@link SipPerfil}
 * @category Entidades de Domínio
 */
export type SipGrupoPerfil = Readonly<{
  /** Identificador do grupo. */
  id: string
  /** Nome do grupo. */
  nome: string
  /** Indica se o grupo está ativo. */
  ativo: boolean
}>

/**
 * Recurso de sistema cadastrado no SIP.
 *
 * Um recurso representa uma permissão atômica (ex.: `"documento_gerar"`,
 * `"processo_consultar"`). Perfis agrupam recursos.
 *
 * @see {@link SipPerfil | SipPerfil.recursos}
 * @see {@link SipConsultasClient.listarRecursos}
 * @category Entidades de Domínio
 */
export type SipRecurso = Readonly<{
  /** Identificador do recurso. */
  id: string
  /** Nome técnico do recurso (ex.: `"documento_gerar"`). */
  nome: string
  /** Descrição legível, ou `null`. */
  descricao: string | null
  /** Indica se o recurso está ativo. */
  ativo: boolean
}>

/**
 * Item de menu associado a um perfil no SIP.
 *
 * @see {@link SipMenu | SipMenu.itens}
 * @category Entidades de Domínio
 */
export type SipItemMenu = Readonly<{
  /** Identificador do item de menu. */
  id: string
  /** Recurso associado ao item, ou `null` se não houver vínculo. */
  idRecurso: string | null
  /** Rótulo exibido na interface do SEI para este item. */
  rotulo: string
  /** Ramificação / caminho hierárquico, ou `null`. */
  ramificacao: string | null
  /** Indica se o item está ativo. */
  ativo: boolean
}>

/**
 * Menu de navegação associado a um perfil no SIP.
 *
 * @see {@link SipPerfil | SipPerfil.menus}
 * @category Entidades de Domínio
 */
export type SipMenu = Readonly<{
  /** Identificador do menu. */
  id: string
  /** Nome do menu. */
  nome: string
  /** Indica se o menu está ativo. */
  ativo: boolean
  /** Itens de navegação pertencentes a este menu. */
  itens: SipItemMenu[]
}>

/**
 * Perfil de acesso cadastrado no SIP.
 *
 * Um perfil agrupa recursos e menus que definem o que um usuário pode fazer
 * dentro do sistema. A profundidade das informações retornadas depende do
 * parâmetro {@link SipListarPerfisParams | SipListarPerfisParams.filtroRecursosMenus}.
 *
 * @see {@link SipConsultasClient.listarPerfis}
 * @see {@link SipFiltroRecursosMenus}
 * @category Entidades de Domínio
 */
export type SipPerfil = Readonly<{
  /** Identificador do perfil. */
  id: string
  /** Nome do perfil. */
  nome: string
  /** Descrição do perfil, ou `null`. */
  descricao: string | null
  /** Indica se o perfil está ativo. */
  ativo: boolean
  /** Grupos de perfis aos quais este perfil pertence. */
  grupos: SipGrupoPerfil[]
  /**
   * Recursos incluídos neste perfil.
   *
   * Populado apenas quando `filtroRecursosMenus` for `"R"` ou `"T"`.
   */
  recursos: SipRecurso[]
  /**
   * Menus de navegação incluídos neste perfil.
   *
   * Populado apenas quando `filtroRecursosMenus` for `"M"` ou `"T"`.
   */
  menus: SipMenu[]
}>

/**
 * Permissão de um usuário em uma unidade para um determinado perfil.
 *
 * Uma permissão associa um {@link SipUsuario} a uma {@link SipUnidade} sob um
 * {@link SipPerfil} dentro de um sistema, podendo ser limitada por período e
 * opcionalmente estendida para subunidades.
 *
 * @see {@link SipConsultasClient.listarPermissoes}
 * @see {@link SipConsultasClient.buscarUsuarioComPermissoesPorSigla}
 * @category Entidades de Domínio
 */
export type SipPermissao = Readonly<{
  /** Identificador do sistema ao qual esta permissão se aplica. */
  idSistema: string
  /** Identificador do órgão do usuário, ou `null`. */
  idOrgaoUsuario: string | null
  /** Identificador do usuário. */
  idUsuario: string
  /** Identificador de origem do usuário (diretório externo), ou `null`. */
  idOrigemUsuario: string | null
  /** Identificador do órgão da unidade, ou `null`. */
  idOrgaoUnidade: string | null
  /** Identificador da unidade à qual a permissão está vinculada. */
  idUnidade: string
  /** Identificador de origem da unidade (diretório externo), ou `null`. */
  idOrigemUnidade: string | null
  /** Identificador do perfil atribuído ao usuário. */
  idPerfil: string
  /**
   * Data de início da vigência da permissão.
   *
   * Formato textual retornado pelo SIP, normalmente `dd/mm/aaaa`.
   */
  dataInicial: string
  /**
   * Data de término da vigência da permissão, ou `null`.
   *
   * `null` indica que a permissão não possui data final definida
   * (vigência indeterminada).
   */
  dataFinal: string | null
  /** `true` quando a permissão se estende às subunidades da unidade vinculada. */
  sinSubunidades: boolean
}>

/**
 * Resultado composto que agrega um {@link SipUsuario} com suas
 * {@link SipPermissao | permissões} ativas no sistema configurado.
 *
 * @see {@link SipConsultasClient.buscarUsuarioComPermissoesPorSigla}
 * @category Entidades de Domínio
 */
export type SipUsuarioComPermissoes = Readonly<{
  /** Dados cadastrais do usuário. */
  usuario: SipUsuario
  /** Lista de permissões do usuário no sistema configurado. */
  permissoes: SipPermissao[]
}>

// ─── Parâmetros de consulta ───────────────────────────────────────────────────

/**
 * Parâmetros para {@link SipConsultasClient.listarOrgaos}.
 * @category Parâmetros de Operação
 */
export type SipListarOrgaosParams = Readonly<{
  /**
   * Quando `true` (padrão), retorna todos os órgãos, incluindo os inativos.
   * Quando `false`, retorna apenas os órgãos ativos.
   */
  todos?: boolean
}>

/**
 * Parâmetros para {@link SipConsultasClient.listarUnidades}.
 *
 * Todos os filtros são opcionais; omiti-los retorna todas as unidades visíveis
 * pelo sistema configurado.
 * @category Parâmetros de Operação
 */
export type SipListarUnidadesParams = Readonly<{
  /** Filtra unidades associadas ao usuário com este ID. */
  idUsuario?: string | null
  /** Retorna apenas a unidade com este ID. */
  idUnidade?: string | null
}>

/**
 * Parâmetros para {@link SipConsultasClient.buscarUsuarios}.
 *
 * Todos os filtros são opcionais e combinativos (AND). Pelo menos um filtro
 * deve ser informado para evitar retornos excessivamente grandes.
 * @category Parâmetros de Operação
 */
export type SipBuscarUsuariosParams = Readonly<{
  /** Filtra pelo login do usuário (busca exata). */
  siglaUsuario?: string | null
  /** Filtra pelo ID interno do usuário. */
  idUsuario?: string | null
  /** Filtra usuários vinculados à unidade com este ID. */
  idUnidade?: string | null
  /** Filtra usuários que possuem o recurso com este nome. */
  recurso?: string | null
  /** Filtra usuários que possuem o perfil com este nome. */
  perfil?: string | null
  /** Filtra usuários pertencentes ao órgão com este ID. */
  idOrgaoUsuario?: string | null
  /** Filtra pelo ID de origem (diretório externo) do usuário. */
  idOrigemUsuario?: string | null
}>

/**
 * Parâmetros para {@link SipConsultasClient.buscarUsuariosSemPermissao}.
 *
 * Retorna usuários cadastrados no SIP que não possuem nenhuma permissão
 * no sistema configurado. Útil para auditorias de acesso.
 * @category Parâmetros de Operação
 */
export type SipBuscarUsuariosSemPermissaoParams = Readonly<{
  /** Filtra usuários pertencentes ao órgão com este ID. */
  idOrgaoUsuario?: string | null
  /** Filtra pelo ID interno do usuário. */
  idUsuario?: string | null
  /** Filtra pelo ID de origem (diretório externo) do usuário. */
  idOrigemUsuario?: string | null
  /** Filtra pelo login do usuário. */
  siglaUsuario?: string | null
}>

/**
 * Parâmetros para {@link SipConsultasClient.carregarUsuario}.
 *
 * Consulta o servidor de autenticação configurado no SIP para o órgão
 * informado e retorna os dados do diretório para o usuário.
 * @category Parâmetros de Operação
 */
export type SipCarregarUsuarioParams = Readonly<{
  /**
   * Tipo do servidor de autenticação configurado no SIP
   * (ex.: `"1"` para LDAP, `"2"` para AD).
   */
  tipoServidorAutenticacao: string
  /** Identificador do órgão ao qual o usuário pertence. */
  idOrgaoUsuario: string
  /** Login / sigla do usuário a ser consultado. */
  siglaUsuario: string
}>

/**
 * Parâmetros para {@link SipConsultasClient.pesquisarUsuario}.
 *
 * Semelhante a {@link SipCarregarUsuarioParams}, mas usa o nome do campo
 * `sigla` (sem prefixo `Usuario`) e `idOrgao` (sem sufixo `Usuario`),
 * conforme exige o WSDL da operação `pesquisarUsuario`.
 * @category Parâmetros de Operação
 */
export type SipPesquisarUsuarioParams = Readonly<{
  /**
   * Tipo do servidor de autenticação configurado no SIP.
   */
  tipoServidorAutenticacao: string
  /** Identificador do órgão. */
  idOrgao: string
  /** Login / sigla do usuário a ser pesquisado. */
  sigla: string
}>

/**
 * Parâmetros para {@link SipConsultasClient.listarPerfis}.
 * @category Parâmetros de Operação
 */
export type SipListarPerfisParams = Readonly<{
  /** Filtra perfis associados ao usuário com este ID. */
  idUsuario?: string | null
  /** Filtra perfis utilizados na unidade com este ID. */
  idUnidade?: string | null
  /**
   * Controla a inclusão de recursos e menus na resposta.
   *
   * Padrão: `"N"` (sem recursos nem menus).
   *
   * @see {@link SipFiltroRecursosMenus}
   */
  filtroRecursosMenus?: SipFiltroRecursosMenus
}>

/**
 * Parâmetros para {@link SipConsultasClient.listarRecursos}.
 *
 * @remarks
 * Quando ambos `perfis` e `recursos` são omitidos, o SIP retorna todos os
 * recursos cadastrados para o sistema configurado.
 * @category Parâmetros de Operação
 */
export type SipListarRecursosParams = Readonly<{
  /** Filtra retornando apenas recursos pertencentes a estes perfis (por ID). */
  perfis?: readonly string[] | null
  /** Filtra retornando apenas os recursos com estes nomes. */
  recursos?: readonly string[] | null
}>

/**
 * Parâmetros para {@link SipConsultasClient.listarPermissoes}.
 *
 * Todos os filtros são opcionais e combinativos (AND). Omitir todos retorna
 * todas as permissões do sistema configurado — use com cautela em sistemas
 * grandes.
 * @category Parâmetros de Operação
 */
export type SipListarPermissoesParams = Readonly<{
  /** Filtra permissões do usuário com este ID. */
  idUsuario?: string | null
  /** Filtra permissões vinculadas à unidade com este ID. */
  idUnidade?: string | null
  /** Filtra permissões com o perfil com este ID. */
  idPerfil?: string | null
  /** Filtra permissões de usuários do órgão com este ID. */
  idOrgaoUsuario?: string | null
  /** Filtra pelo ID de origem do usuário (diretório externo). */
  idOrigemUsuario?: string | null
  /** Filtra permissões de unidades do órgão com este ID. */
  idOrgaoUnidade?: string | null
  /** Filtra pelo ID de origem da unidade (diretório externo). */
  idOrigemUnidade?: string | null
}>

// ─── Parâmetros de replicação ─────────────────────────────────────────────────

/**
 * Dados de um usuário a ser criado, atualizado ou removido via
 * `replicarUsuario`.
 *
 * @experimental
 * @remarks
 * A operação `"E"` exige apenas `idOrigem` e `idOrgao`; os demais campos
 * são ignorados pelo SIP nesse caso.
 *
 * Ainda não validado de ponta a ponta contra um ambiente SIP real.
 *
 * @see {@link SipReplicacaoClient.replicarUsuarios}
 * @see {@link SipOperacaoReplicacaoUsuario}
 * @category Replicação
 */
export type SipReplicarUsuario = Readonly<{
  /** Operação a ser realizada sobre o usuário. */
  operacao: SipOperacaoReplicacaoUsuario
  /**
   * Identificador de origem do usuário no diretório externo
   * (ex.: `"ad:joao.silva"`).
   */
  idOrigem: string
  /** Identificador do órgão do usuário no SIP. */
  idOrgao: string
  /** Login / sigla do usuário. */
  sigla: string
  /** Nome civil completo. */
  nome: string
  /** Nome social, ou `null`. */
  nomeSocial?: string | null
  /** CPF (somente dígitos), ou `null`. */
  cpf?: string | null
  /** E-mail institucional, ou `null`. */
  email?: string | null
}>

/**
 * Dados de uma permissão a ser criada, alterada ou removida via
 * `replicarPermissao`.
 *
 * @experimental
 * @remarks
 * Quando `idSistema` é omitido, o cliente usa o `systemId` da configuração.
 * Para a operação `"E"`, apenas `idUsuario`, `idUnidade` e `idPerfil` são
 * necessários; os demais campos são ignorados.
 *
 * Ainda não validado de ponta a ponta contra um ambiente SIP real.
 *
 * @see {@link SipReplicacaoClient.replicarPermissoes}
 * @see {@link SipOperacaoReplicacaoPermissao}
 * @category Replicação
 */
export type SipReplicarPermissao = Readonly<{
  /** Operação a ser realizada sobre a permissão. */
  operacao: SipOperacaoReplicacaoPermissao
  /**
   * Identificador do sistema alvo.
   *
   * Quando omitido, usa o `systemId` da configuração do cliente.
   */
  idSistema?: string | null
  /** Identificador do órgão do usuário, ou `null`. */
  idOrgaoUsuario?: string | null
  /** Identificador do usuário. */
  idUsuario?: string | null
  /** Identificador de origem do usuário (diretório externo), ou `null`. */
  idOrigemUsuario?: string | null
  /** Identificador do órgão da unidade, ou `null`. */
  idOrgaoUnidade?: string | null
  /** Identificador da unidade à qual a permissão se aplica. */
  idUnidade?: string | null
  /** Identificador de origem da unidade (diretório externo), ou `null`. */
  idOrigemUnidade?: string | null
  /** Identificador do perfil a ser atribuído. */
  idPerfil: string
  /**
   * Data de início da vigência.
   *
   * Formato esperado pelo SIP: `dd/mm/aaaa`.
   */
  dataInicial: string
  /**
   * Data de término da vigência, ou `null` para vigência indeterminada.
   *
   * Formato esperado pelo SIP: `dd/mm/aaaa`.
   */
  dataFinal?: string | null
  /** `true` para estender a permissão às subunidades. */
  sinSubunidades: boolean
}>
