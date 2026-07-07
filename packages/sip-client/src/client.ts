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

type ClientOptions = Readonly<{
  config: SipConfig
}>

const systemIdAsLong = (config: SipConfig): number => {
  const systemId = Number(config.systemId)
  if (!Number.isSafeInteger(systemId)) {
    throw new TypeError(`IdSistema invalido para o SIP: ${config.systemId}`)
  }
  return systemId
}

const createBaseLongParams = (config: SipConfig) => ({
  ChaveAcesso: config.accessKey,
  IdSistema: systemIdAsLong(config),
})

const createBaseStringParams = (config: SipConfig) => ({
  ChaveAcesso: config.accessKey,
  IdSistema: config.systemId,
})

const booleanToSin = (value: boolean): "S" | "N" => (value ? "S" : "N")

const stringArrayOrNil = (
  arrayType: string,
  value: readonly string[] | null | undefined,
): SipSoapParamValue => {
  if (!value?.length) {
    return null
  }
  return createSoapArray(arrayType, "xsd:string", value)
}

const booleanReturn = (value: unknown): boolean =>
  value === true || value === "true" || value === "1"

/**
 * Operações somente leitura do SIP.
 *
 * Esta classe não conhece framework, banco, cache, auditoria ou UI. Ela é
 * deliberadamente fina: recebe config, chama SOAP e devolve tipos TypeScript.
 * Isso mantém o pacote portável entre aplicações.
 */
export class SipConsultasClient {
  constructor(private readonly config: SipConfig) {}

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

  async buscarUsuarioPorSigla(siglaUsuario: string): Promise<SipUsuario | null> {
    const usuarios = await this.buscarUsuarios({ siglaUsuario })
    return usuarios[0] ?? null
  }

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
 */
export class SipReplicacaoClient {
  constructor(private readonly config: SipConfig) {}

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
 * Fachada principal. Aplicações consumidoras podem usar `client.consultas.*` e
 * `client.replicacao.*`; os métodos na raiz continuam como atalhos de
 * compatibilidade para o código já escrito.
 */
export class SipClient {
  readonly consultas: SipConsultasClient
  readonly replicacao: SipReplicacaoClient

  constructor(options: ClientOptions) {
    this.consultas = new SipConsultasClient(options.config)
    this.replicacao = new SipReplicacaoClient(options.config)
  }

  listarOrgaos(params: SipListarOrgaosParams = {}): Promise<SipOrgao[]> {
    return this.consultas.listarOrgaos(params)
  }

  listarUnidades(params: SipListarUnidadesParams = {}): Promise<SipUnidade[]> {
    return this.consultas.listarUnidades(params)
  }

  buscarUsuarios(params: SipBuscarUsuariosParams): Promise<SipUsuario[]> {
    return this.consultas.buscarUsuarios(params)
  }

  buscarUsuarioPorSigla(siglaUsuario: string): Promise<SipUsuario | null> {
    return this.consultas.buscarUsuarioPorSigla(siglaUsuario)
  }

  buscarUsuariosSemPermissao(
    params: SipBuscarUsuariosSemPermissaoParams = {},
  ): Promise<SipUsuario[]> {
    return this.consultas.buscarUsuariosSemPermissao(params)
  }

  listarPerfis(params: SipListarPerfisParams = {}): Promise<SipPerfil[]> {
    return this.consultas.listarPerfis(params)
  }

  listarRecursos(params: SipListarRecursosParams = {}): Promise<string[]> {
    return this.consultas.listarRecursos(params)
  }

  listarPermissoes(params: SipListarPermissoesParams = {}): Promise<SipPermissao[]> {
    return this.consultas.listarPermissoes(params)
  }

  buscarUsuarioComPermissoesPorSigla(
    siglaUsuario: string,
  ): Promise<SipUsuarioComPermissoes | null> {
    return this.consultas.buscarUsuarioComPermissoesPorSigla(siglaUsuario)
  }
}

export const createSipClient = (config: SipConfig): SipClient => new SipClient({ config })
