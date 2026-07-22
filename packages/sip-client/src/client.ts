/**
 * @packageDocumentation
 *
 * Classes cliente do SIP.
 *
 * Este módulo expõe três classes:
 *
 * - {@link SipConsultasClient} — operações somente leitura (consultas).
 * - {@link SipReplicacaoClient} — operações de escrita (replicação).
 * - {@link SipClient} — fachada que combina as duas anteriores e mantém
 *   atalhos de compatibilidade para código já existente.
 *
 * O ponto de entrada recomendado é a função fábrica {@link createSipClient}.
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
 *
 * // Consultas via subclient dedicado
 * const usuario = await sip.consultas.buscarUsuarioPorSigla("joao.silva")
 *
 * // Replicação via subclient dedicado
 * await sip.replicacao.replicarUsuarios([{
 *   operacao: "C",
 *   idOrigem: "ad:joao.silva",
 *   idOrgao: "0",
 *   sigla: "joao.silva",
 *   nome: "João Silva",
 * }])
 * ```
 */
import {
  mapOrgaos,
  mapPerfis,
  mapPermissoes,
  mapRecursos,
  mapUnidades,
  mapUsuarioDiretorio,
  mapUsuarios,
} from "./mappers"
import { callSipSoap, createSoapArray } from "./soap"
import type {
  SipBuscarUsuariosParams,
  SipBuscarUsuariosSemPermissaoParams,
  SipCarregarUsuarioParams,
  SipConfig,
  SipFiltroRecursosMenus,
  SipListarOrgaosParams,
  SipListarPerfisParams,
  SipListarPermissoesParams,
  SipListarRecursosParams,
  SipListarUnidadesParams,
  SipOrgao,
  SipPerfil,
  SipPermissao,
  SipPesquisarUsuarioParams,
  SipReplicarPermissao,
  SipReplicarUsuario,
  SipSoapParamValue,
  SipUnidade,
  SipUsuario,
  SipUsuarioComPermissoes,
  SipUsuarioDiretorio,
} from "./types"

/**
 * Converte `systemId` para `number`, lançando `TypeError` se o valor não for
 * um inteiro seguro.
 *
 * @internal
 */
const systemIdAsLong = (config: SipConfig): number => {
  const systemId = Number(config.systemId)
  if (!Number.isSafeInteger(systemId)) {
    throw new TypeError(`IdSistema invalido para o SIP: ${config.systemId}`)
  }
  return systemId
}

/**
 * Cria os parâmetros base para operações que esperam `IdSistema` como `long`.
 *
 * @internal
 */
const createBaseLongParams = (config: SipConfig) => ({
  ChaveAcesso: config.accessKey,
  IdSistema: systemIdAsLong(config),
})

/**
 * Cria os parâmetros base para operações que esperam `IdSistema` como `string`.
 *
 * @internal
 */
const createBaseStringParams = (config: SipConfig) => ({
  ChaveAcesso: config.accessKey,
  IdSistema: config.systemId,
})

/** @internal */
const booleanToSin = (value: boolean): "S" | "N" => (value ? "S" : "N")

/** @internal */
const stringArrayOrNil = (
  arrayType: string,
  value: readonly string[] | null | undefined,
): SipSoapParamValue => {
  if (!value?.length) {
    return null
  }
  return createSoapArray(arrayType, "xsd:string", value)
}

/** @internal */
const booleanReturn = (value: unknown): boolean =>
  value === true || value === "true" || value === "1"

/**
 * Operações somente leitura do SIP.
 *
 * Esta classe não conhece framework, banco, cache, auditoria ou UI. Ela é
 * deliberadamente fina: recebe config, chama SOAP e devolve tipos TypeScript.
 * Isso mantém o pacote portável entre aplicações.
 *
 * @remarks
 * Em aplicações que usam {@link SipClient}, acesse esta classe via
 * `sipClient.consultas`.
 *
 * @example
 * ```ts
 * import { SipConsultasClient } from "@anpdgovbr/sip-client"
 *
 * const consultas = new SipConsultasClient({
 *   endpointUrl: "https://sei.orgao.gov.br/sip/ws/SipWS.php",
 *   accessKey: "minha-chave",
 *   systemId: "100000100",
 *   requestTimeoutMs: 30_000,
 * })
 *
 * const orgaos = await consultas.listarOrgaos()
 * ```
 *
 * @see {@link SipClient}
 * @see {@link createSipClient}
 * @category Client
 */
export class SipConsultasClient {
  /** @param config - Configuração de conexão com o SIP. */
  constructor(private readonly config: SipConfig) {}

  /**
   * Lista os órgãos cadastrados no SIP.
   *
   * @param params - Filtros opcionais. Passe `{ todos: false }` para retornar apenas órgãos ativos.
   * @returns Lista de órgãos.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const ativos = await consultas.listarOrgaos({ todos: false })
   * ```
   */
  async listarOrgaos(params: SipListarOrgaosParams = {}): Promise<SipOrgao[]> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarOrgaos",
      params: {
        ...createBaseLongParams(this.config),
        SinTodos: params.todos === false ? "N" : "S",
      },
    })
    return mapOrgaos(payload)
  }

  /**
   * Lista as unidades organizacionais visíveis pelo sistema configurado.
   *
   * @param params - Filtros opcionais. Aceita `idUsuario` para filtrar por usuário ou `idUnidade` para uma unidade específica.
   * @returns Lista de unidades.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const unidades = await consultas.listarUnidades({ idUsuario: "100000103" })
   * ```
   */
  async listarUnidades(params: SipListarUnidadesParams = {}): Promise<SipUnidade[]> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarUnidades",
      params: {
        ...createBaseLongParams(this.config),
        IdUsuario: params.idUsuario,
        IdUnidade: params.idUnidade,
      },
    })
    return mapUnidades(payload)
  }

  /**
   * Busca usuários cadastrados no SIP com base em filtros combinativos.
   *
   * @param params - Pelo menos um filtro é recomendado para evitar retornos
   *   excessivamente grandes.
   * @returns Lista de usuários que atendem a todos os filtros informados.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const usuarios = await consultas.buscarUsuarios({ idUnidade: "110000075" })
   * ```
   */
  async buscarUsuarios(params: SipBuscarUsuariosParams): Promise<SipUsuario[]> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarUsuarios",
      params: {
        ...createBaseLongParams(this.config),
        IdUnidade: params.idUnidade,
        Recurso: params.recurso,
        Perfil: params.perfil,
        IdOrgaoUsuario: params.idOrgaoUsuario,
        IdUsuario: params.idUsuario,
        IdOrigemUsuario: params.idOrigemUsuario,
        SiglaUsuario: params.siglaUsuario,
      },
    })
    return mapUsuarios(payload)
  }

  /**
   * Retorna o primeiro usuário encontrado pela sigla (login), ou `null`.
   *
   * @remarks
   * Conveniente para lookups pontuais. Para obter também as permissões, use
   * {@link buscarUsuarioComPermissoesPorSigla}.
   *
   * @param siglaUsuario - Login exato do usuário no SIP.
   * @returns O usuário encontrado, ou `null` se não existir.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const usuario = await consultas.buscarUsuarioPorSigla("joao.silva")
   * if (usuario) console.log(usuario.nome)
   * ```
   */
  async buscarUsuarioPorSigla(siglaUsuario: string): Promise<SipUsuario | null> {
    const usuarios = await this.buscarUsuarios({ siglaUsuario })
    return usuarios[0] ?? null
  }

  /**
   * Lista usuários cadastrados no SIP que não possuem nenhuma permissão
   * no sistema configurado.
   *
   * Útil para auditorias de acesso e limpeza de contas obsoletas.
   *
   * @param params - Filtros opcionais.
   * @returns Lista de usuários sem permissão.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async buscarUsuariosSemPermissao(
    params: SipBuscarUsuariosSemPermissaoParams = {},
  ): Promise<SipUsuario[]> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarUsuariosSemPermissao",
      params: {
        ...createBaseLongParams(this.config),
        IdOrgaoUsuario: params.idOrgaoUsuario,
        IdUsuario: params.idUsuario,
        IdOrigemUsuario: params.idOrigemUsuario,
        SiglaUsuario: params.siglaUsuario,
      },
    })
    return mapUsuarios(payload)
  }

  /**
   * Carrega os dados de um usuário diretamente do servidor de autenticação
   * configurado no SIP para o órgão informado.
   *
   * @remarks
   * Diferente de {@link buscarUsuarios}, esta operação consulta o diretório
   * externo (ex.: LDAP/AD) e não o banco interno do SIP. O resultado não
   * incluí `id`, `ativo` nem `unidades`.
   *
   * @param params - Tipo do servidor de autenticação, órgão e sigla.
   * @returns Dados do usuário no diretório, ou `null` se não encontrado.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async carregarUsuario(params: SipCarregarUsuarioParams): Promise<SipUsuarioDiretorio | null> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarUsuario",
      params: {
        ChaveAcesso: this.config.accessKey,
        IdSistema: this.config.systemId,
        TipoServidorAutenticacao: params.tipoServidorAutenticacao,
        IdOrgaoUsuario: params.idOrgaoUsuario,
        SiglaUsuario: params.siglaUsuario,
      },
    })
    return mapUsuarioDiretorio(payload)
  }

  /**
   * Pesquisa um usuário no diretório externo sem filtrar pelo sistema
   * configurado.
   *
   * @remarks
   * Semelhante a {@link carregarUsuario}, mas usa os campos `idOrgao` e `sigla`
   * (sem sufixo `Usuario`), conforme a operação `pesquisarUsuario` do WSDL.
   *
   * @param params - Tipo do servidor de autenticação, órgão e sigla.
   * @returns Dados do usuário no diretório, ou `null` se não encontrado.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async pesquisarUsuario(params: SipPesquisarUsuarioParams): Promise<SipUsuarioDiretorio | null> {
    const payload = await callSipSoap(this.config, {
      operation: "pesquisarUsuario",
      params: {
        ChaveAcesso: this.config.accessKey,
        TipoServidorAutenticacao: params.tipoServidorAutenticacao,
        IdOrgao: params.idOrgao,
        Sigla: params.sigla,
      },
    })
    return mapUsuarioDiretorio(payload)
  }

  /**
   * Lista os perfis cadastrados no SIP para o sistema configurado.
   *
   * @param params - Filtros e controle de profundidade da resposta. Use `filtroRecursosMenus: "T"` para incluir recursos e menus.
   * @returns Lista de perfis.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * // Inclui recursos e menus de cada perfil
   * const perfis = await consultas.listarPerfis({ filtroRecursosMenus: "T" })
   * ```
   */
  async listarPerfis(params: SipListarPerfisParams = {}): Promise<SipPerfil[]> {
    const filtro: SipFiltroRecursosMenus = params.filtroRecursosMenus ?? "N"
    const payload = await callSipSoap(this.config, {
      operation: "carregarPerfis",
      params: {
        ...createBaseLongParams(this.config),
        IdUsuario: params.idUsuario,
        IdUnidade: params.idUnidade,
        IdPerfil: null,
        IdGruposPerfil: null,
        NomeGruposPerfil: null,
        StaFiltroRecursosMenus: filtro,
      },
    })
    return mapPerfis(payload)
  }

  /**
   * Lista os recursos (permissões atômicas) do sistema configurado.
   *
   * @param params - Filtros opcionais por perfil ou nome de recurso.
   * @returns Lista de nomes de recursos (ex.: `["documento_gerar", "processo_consultar"]`).
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * // Somente recursos do perfil 100000940
   * const recursos = await consultas.listarRecursos({ perfis: ["100000940"] })
   * ```
   */
  async listarRecursos(params: SipListarRecursosParams = {}): Promise<string[]> {
    const payload = await callSipSoap(this.config, {
      operation: "carregarRecursos",
      params: {
        ChaveAcesso: this.config.accessKey,
        IdSistema: this.config.systemId,
        Perfis: stringArrayOrNil("ArrayOfIdPerfil", params.perfis),
        Recursos: stringArrayOrNil("ArrayOfNomeRecurso", params.recursos),
      },
    })
    return mapRecursos(payload)
  }

  /**
   * Lista as permissões ativas no sistema configurado, com filtros opcionais.
   *
   * @remarks
   * Omitir todos os filtros retorna **todas** as permissões do sistema. Use
   * com cautela em sistemas com muitos usuários.
   *
   * @param params - Filtros combinativos opcionais.
   * @returns Lista de permissões.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const permissoes = await consultas.listarPermissoes({ idUsuario: "100000103" })
   * ```
   */
  async listarPermissoes(params: SipListarPermissoesParams = {}): Promise<SipPermissao[]> {
    const payload = await callSipSoap(this.config, {
      operation: "listarPermissao",
      params: {
        ...createBaseStringParams(this.config),
        IdOrgaoUsuario: params.idOrgaoUsuario,
        IdUsuario: params.idUsuario,
        IdOrigemUsuario: params.idOrigemUsuario,
        IdOrgaoUnidade: params.idOrgaoUnidade,
        IdUnidade: params.idUnidade,
        IdOrigemUnidade: params.idOrigemUnidade,
        IdPerfil: params.idPerfil,
        IdGruposPerfil: null,
        NomeGruposPerfil: null,
      },
    })
    return mapPermissoes(payload)
  }

  /**
   * Helper composto que busca um usuário pela sigla e suas permissões em uma
   * única chamada de alto nível (duas requisições ao SIP).
   *
   * @param siglaUsuario - Login exato do usuário no SIP.
   * @returns Objeto com `usuario` e `permissoes`, ou `null` se o usuário não
   *   existir.
   * @throws {@link SipSoapError} em caso de falha em qualquer uma das duas
   *   requisições.
   *
   * @example
   * ```ts
   * const resultado = await consultas.buscarUsuarioComPermissoesPorSigla("joao.silva")
   * if (resultado) {
   *   const { usuario, permissoes } = resultado
   *   console.log(usuario.nome, permissoes.length)
   * }
   * ```
   */
  async buscarUsuarioComPermissoesPorSigla(
    siglaUsuario: string,
  ): Promise<SipUsuarioComPermissoes | null> {
    const usuario = await this.buscarUsuarioPorSigla(siglaUsuario)
    if (!usuario) {
      return null
    }

    const permissoes = await this.listarPermissoes({ idUsuario: usuario.id })
    return { usuario, permissoes }
  }
}

/**
 * Operações que alteram estado no SIP.
 *
 * Os nomes evitam expor diretamente detalhes obscuros do WSDL para o restante
 * do SGI. A tradução para `StaOperacao`, `SinSubunidades` e arrays SOAP fica
 * concentrada aqui.
 *
 * @remarks
 * Estas operações requerem que o sistema consumidor tenha os serviços de
 * replicação liberados explicitamente no SIP. Não solicite essas permissões
 * para integrações somente leitura.
 *
 * Em aplicações que usam {@link SipClient}, acesse esta classe via
 * `sipClient.replicacao`.
 *
 * @example
 * ```ts
 * import { SipReplicacaoClient } from "@anpdgovbr/sip-client"
 *
 * const replicacao = new SipReplicacaoClient(config)
 * const ok = await replicacao.replicarUsuarios([{
 *   operacao: "C",
 *   idOrigem: "ad:joao.silva",
 *   idOrgao: "0",
 *   sigla: "joao.silva",
 *   nome: "João Silva",
 * }])
 * ```
 *
 * @see {@link SipClient}
 * @see {@link createSipClient}
 * @category Client
 */
export class SipReplicacaoClient {
  /** @param config - Configuração de conexão com o SIP. */
  constructor(private readonly config: SipConfig) {}

  /**
   * Replica um lote de usuários no SIP (cria, altera, exclui, desativa ou
   * reativa).
   *
   * @param usuarios - Lista de usuários com a operação desejada para cada um.
   * @returns `true` se o SIP confirmou a operação com sucesso.
   * @throws {@link SipSoapError} em caso de falha de comunicação, SOAP Fault
   *   ou rejeição pelo SIP.
   *
   * @example
   * ```ts
   * await replicacao.replicarUsuarios([
   *   { operacao: "C", idOrigem: "ad:novo.usuario", idOrgao: "0",
   *     sigla: "novo.usuario", nome: "Novo Usuário" },
   *   { operacao: "D", idOrigem: "ad:antigo.usuario", idOrgao: "0",
   *     sigla: "antigo.usuario", nome: "Antigo Usuário" },
   * ])
   * ```
   */
  async replicarUsuarios(usuarios: readonly SipReplicarUsuario[]): Promise<boolean> {
    const payload = await callSipSoap(this.config, {
      operation: "replicarUsuario",
      params: {
        ChaveAcesso: this.config.accessKey,
        Usuarios: createSoapArray(
          "ArrayOfUsuarios",
          "Usuario",
          usuarios.map((usuario) => ({
            StaOperacao: usuario.operacao,
            IdOrigem: usuario.idOrigem,
            IdOrgao: usuario.idOrgao,
            Sigla: usuario.sigla,
            Nome: usuario.nome,
            NomeSocial: usuario.nomeSocial,
            Cpf: usuario.cpf,
            Email: usuario.email,
          })),
        ),
        SinConsiderarOrgao: "N",
        SistemasReplicacao: createSoapArray("ArrayOfIdSistema", "xsd:string", [
          this.config.systemId,
        ]),
      },
    })
    return booleanReturn(payload)
  }

  /**
   * Replica um lote de permissões no SIP (cadastra/altera ou exclui).
   *
   * @remarks
   * Quando `idSistema` é omitido em uma entrada de {@link SipReplicarPermissao},
   * o cliente substitui pelo `systemId` da configuração.
   *
   * @param permissoes - Lista de permissões com a operação desejada.
   * @returns `true` se o SIP confirmou a operação com sucesso.
   * @throws {@link SipSoapError} em caso de falha de comunicação, SOAP Fault
   *   ou rejeição pelo SIP.
   *
   * @example
   * ```ts
   * await replicacao.replicarPermissoes([{
   *   operacao: "A",
   *   idUsuario: "100000103",
   *   idUnidade: "110000075",
   *   idPerfil: "100000940",
   *   dataInicial: "01/01/2026",
   *   sinSubunidades: false,
   * }])
   * ```
   */
  async replicarPermissoes(permissoes: readonly SipReplicarPermissao[]): Promise<boolean> {
    const payload = await callSipSoap(this.config, {
      operation: "replicarPermissao",
      params: {
        ChaveAcesso: this.config.accessKey,
        Permissoes: createSoapArray(
          "ArrayOfPermissoes",
          "Permissao",
          permissoes.map((permissao) => ({
            StaOperacao: permissao.operacao,
            IdSistema: permissao.idSistema ?? this.config.systemId,
            IdOrgaoUsuario: permissao.idOrgaoUsuario,
            IdUsuario: permissao.idUsuario,
            IdOrigemUsuario: permissao.idOrigemUsuario,
            IdOrgaoUnidade: permissao.idOrgaoUnidade,
            IdUnidade: permissao.idUnidade,
            IdOrigemUnidade: permissao.idOrigemUnidade,
            IdPerfil: permissao.idPerfil,
            DataInicial: permissao.dataInicial,
            DataFinal: permissao.dataFinal,
            SinSubunidades: booleanToSin(permissao.sinSubunidades),
          })),
        ),
      },
    })
    return booleanReturn(payload)
  }

  /**
   * Valida se uma replicação agendada foi concluída com sucesso no SIP.
   *
   * @remarks
   * O SIP pode processar replicações de forma assíncrona. Este método permite
   * verificar o status de uma replicação pelo seu identificador.
   *
   * @param idReplicacao - Identificador da replicação a ser validada.
   * @returns `true` se a replicação foi processada com sucesso.
   * @throws {@link SipSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async validarReplicacao(idReplicacao: string): Promise<boolean> {
    const payload = await callSipSoap(this.config, {
      operation: "validarReplicacao",
      params: {
        ChaveAcesso: this.config.accessKey,
        IdReplicacao: idReplicacao,
      },
    })
    return booleanReturn(payload)
  }
}

/**
 * Fachada principal do cliente SIP.
 *
 * Aplicações consumidoras podem usar `client.consultas.*` para consultas e
 * `client.replicacao.*` para operações de escrita. Os métodos na raiz da
 * classe são atalhos de compatibilidade retroativa para código existente que
 * não usa os subclients.
 *
 * @remarks
 * Prefira instanciar via {@link createSipClient} em vez de `new SipClient()`
 * diretamente, pois a fábrica tem assinatura mais simples.
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
 *
 * // Via subclient (recomendado)
 * const usuario = await sip.consultas.buscarUsuarioPorSigla("joao.silva")
 *
 * // Via atalho de compatibilidade (equivalente ao acima)
 * const mesmo = await sip.buscarUsuarioPorSigla("joao.silva")
 * ```
 *
 * @see {@link createSipClient}
 * @see {@link SipConsultasClient}
 * @see {@link SipReplicacaoClient}
 * @category Client
 */
export class SipClient {
  /** Subclient para operações somente leitura. */
  readonly consultas: SipConsultasClient
  /** Subclient para operações de escrita (replicação). */
  readonly replicacao: SipReplicacaoClient

  /** @param config - Configuração de conexão com o SIP. */
  constructor(config: SipConfig) {
    this.consultas = new SipConsultasClient(config)
    this.replicacao = new SipReplicacaoClient(config)
  }

  /** @deprecated Use `sip.consultas.listarOrgaos()` diretamente. */
  listarOrgaos(params: SipListarOrgaosParams = {}): Promise<SipOrgao[]> {
    return this.consultas.listarOrgaos(params)
  }

  /** @deprecated Use `sip.consultas.listarUnidades()` diretamente. */
  listarUnidades(params: SipListarUnidadesParams = {}): Promise<SipUnidade[]> {
    return this.consultas.listarUnidades(params)
  }

  /** @deprecated Use `sip.consultas.buscarUsuarios()` diretamente. */
  buscarUsuarios(params: SipBuscarUsuariosParams): Promise<SipUsuario[]> {
    return this.consultas.buscarUsuarios(params)
  }

  /** @deprecated Use `sip.consultas.buscarUsuarioPorSigla()` diretamente. */
  buscarUsuarioPorSigla(siglaUsuario: string): Promise<SipUsuario | null> {
    return this.consultas.buscarUsuarioPorSigla(siglaUsuario)
  }

  /** @deprecated Use `sip.consultas.buscarUsuariosSemPermissao()` diretamente. */
  buscarUsuariosSemPermissao(
    params: SipBuscarUsuariosSemPermissaoParams = {},
  ): Promise<SipUsuario[]> {
    return this.consultas.buscarUsuariosSemPermissao(params)
  }

  /** @deprecated Use `sip.consultas.listarPerfis()` diretamente. */
  listarPerfis(params: SipListarPerfisParams = {}): Promise<SipPerfil[]> {
    return this.consultas.listarPerfis(params)
  }

  /** @deprecated Use `sip.consultas.listarRecursos()` diretamente. */
  listarRecursos(params: SipListarRecursosParams = {}): Promise<string[]> {
    return this.consultas.listarRecursos(params)
  }

  /** @deprecated Use `sip.consultas.listarPermissoes()` diretamente. */
  listarPermissoes(params: SipListarPermissoesParams = {}): Promise<SipPermissao[]> {
    return this.consultas.listarPermissoes(params)
  }

  /** @deprecated Use `sip.consultas.buscarUsuarioComPermissoesPorSigla()` diretamente. */
  buscarUsuarioComPermissoesPorSigla(
    siglaUsuario: string,
  ): Promise<SipUsuarioComPermissoes | null> {
    return this.consultas.buscarUsuarioComPermissoesPorSigla(siglaUsuario)
  }
}

/**
 * Cria uma instância de {@link SipClient} a partir de uma configuração.
 *
 * Este é o ponto de entrada principal do pacote. Preferível a `new SipClient()`
 * pela assinatura mais simples.
 *
 * @param config - Parâmetros de conexão com o SIP.
 * @returns Uma instância de {@link SipClient} pronta para uso.
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
 *
 * const orgaos = await sip.consultas.listarOrgaos()
 * ```
 * @category Client
 */
export const createSipClient = (config: SipConfig): SipClient => new SipClient(config)
