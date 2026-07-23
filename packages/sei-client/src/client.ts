/**
 * @packageDocumentation
 *
 * Classes cliente do SEI.
 *
 * Este módulo expõe três classes:
 *
 * - {@link SeiConsultasClient} — operações somente leitura (consultas e listagens).
 * - {@link SeiOperacoesClient} — operações que alteram estado no SEI.
 * - {@link SeiClient} — fachada que combina as duas anteriores.
 *
 * O ponto de entrada recomendado é a função fábrica {@link createSeiClient}.
 *
 * @example
 * ```ts
 * import { createSeiClient } from "@anpdgovbr/sei-client"
 *
 * const sei = createSeiClient({
 *   endpointUrl: process.env.SEI_SOAP_ENDPOINT!,
 *   siglaSistema: process.env.SEI_SIGLA_SISTEMA!,
 *   identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
 *   requestTimeoutMs: 30_000,
 * })
 *
 * // Consultas via subclient dedicado
 * const unidades = await sei.consultas.listarUnidades({ idUnidade: "110000001" })
 *
 * // Operações via subclient dedicado
 * const retorno = await sei.operacoes.gerarProcedimento({ ... })
 * ```
 */
import {
  mapAndamento,
  mapAndamentos,
  mapAndamentosMarcadores,
  mapArquivosExtensao,
  mapCargos,
  mapCidades,
  mapContatos,
  mapEstados,
  mapFeriados,
  mapHipotesesLegais,
  mapMarcadores,
  mapPaises,
  mapProcedimentoResumido,
  mapRetornoConsultaBloco,
  mapRetornoConsultaDocumento,
  mapRetornoConsultaProcedimento,
  mapRetornoConsultaPublicacao,
  mapRetornoEnvioEmail,
  mapRetornoGeracaoProcedimento,
  mapRetornoInclusaoDocumento,
  mapSeries,
  mapTiposConferencia,
  mapTiposPrioridade,
  mapTiposProcedimento,
  mapUnidades,
  mapUsuarios,
} from "./mappers"
import { callSeiSoap, createSeiSoapArray } from "./soap"
import type {
  SeiAdicionarArquivoParams,
  SeiAdicionarConteudoArquivoParams,
  SeiAgendarPublicacaoParams,
  SeiAlterarBlocoParams,
  SeiAlterarPublicacaoParams,
  SeiAndamento,
  SeiAndamentoMarcador,
  SeiAnexarProcessoParams,
  SeiArquivoExtensao,
  SeiAtribuirProcessoParams,
  SeiAtualizarContatosParams,
  SeiBloquearDocumentoParams,
  SeiCancelarAgendamentoPublicacaoParams,
  SeiCancelarDocumentoParams,
  SeiCargo,
  SeiCidade,
  SeiConfig,
  SeiConfirmarDisponibilizacaoPublicacaoParams,
  SeiConsultarBlocoParams,
  SeiConsultarDocumentoParams,
  SeiConsultarProcedimentoIndividualParams,
  SeiConsultarProcedimentoParams,
  SeiConsultarPublicacaoParams,
  SeiContato,
  SeiControlePrazoProcessosParams,
  SeiDefinirControlePrazoParams,
  SeiDefinirMarcadorParams,
  SeiDesanexarProcessoParams,
  SeiEnviarEmailParams,
  SeiEnviarProcessoParams,
  SeiEstado,
  SeiExcluirBlocoParams,
  SeiExcluirDocumentoParams,
  SeiExcluirProcessoParams,
  SeiFeriado,
  SeiGerarBlocoParams,
  SeiGerarProcedimentoParams,
  SeiHipoteseLegal,
  SeiIncluirDocumentoBlocoParams,
  SeiIncluirDocumentoParams,
  SeiIncluirProcessoBlocoParams,
  SeiLancarAndamentoParams,
  SeiListarAndamentosMarcadoresParams,
  SeiListarAndamentosParams,
  SeiListarCargosParams,
  SeiListarCidadesParams,
  SeiListarContatosParams,
  SeiListarEstadosParams,
  SeiListarExtensoesPermitidasParams,
  SeiListarFeriadosParams,
  SeiListarHipotesesLegaisParams,
  SeiListarMarcadoresUnidadeParams,
  SeiListarPaisesParams,
  SeiListarSeriesParams,
  SeiListarTiposConferenciaParams,
  SeiListarTiposPrioridadeParams,
  SeiListarTiposProcedimentoParams,
  SeiListarUnidadesParams,
  SeiListarUsuariosParams,
  SeiMarcador,
  SeiOperacaoBlocoParams,
  SeiOperacaoProcessoParams,
  SeiPais,
  SeiProcedimentoResumido,
  SeiRegistrarAnotacaoParams,
  SeiRegistrarOuvidoriaParams,
  SeiRelacionarProcessoParams,
  SeiRetirarDocumentoBlocoParams,
  SeiRetirarProcessoBlocoParams,
  SeiRetornoConsultaBloco,
  SeiRetornoConsultaDocumento,
  SeiRetornoConsultaProcedimento,
  SeiRetornoConsultaPublicacao,
  SeiRetornoEnvioEmail,
  SeiRetornoGeracaoProcedimento,
  SeiRetornoInclusaoDocumento,
  SeiSerie,
  SeiSoapParamValue,
  SeiSobrestarProcessoParams,
  SeiTipoConferencia,
  SeiTipoPrioridade,
  SeiTipoProcedimento,
  SeiUnidade,
  SeiUsuario,
} from "./types"

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** @internal */
const stringReturn = (value: unknown): string => (typeof value === "string" ? value : "")

/** @internal */
const stringArrayOrNil = (
  arrayType: string,
  value: readonly string[] | null | undefined,
): SeiSoapParamValue => {
  if (!value?.length) {
    return null
  }
  return createSeiSoapArray(arrayType, "xsd:string", value)
}

/** @internal */
const createBaseParams = (config: SeiConfig, idUnidade: string) => ({
  SiglaSistema: config.siglaSistema,
  IdentificacaoServico: config.identificacaoServico,
  IdUnidade: idUnidade,
})

/** @internal */
const serializedProcedimento = (p: SeiGerarProcedimentoParams["procedimento"]) => ({
  IdTipoProcedimento: p.idTipoProcedimento,
  NumeroProtocolo: p.numeroProtocolo ?? null,
  DataAutuacao: p.dataAutuacao ?? null,
  Especificacao: p.especificacao ?? null,
  Assuntos: createSeiSoapArray(
    "ArrayOfAssunto",
    "Assunto",
    p.assuntos.map((a) => ({
      CodigoEstruturado: a.codigoEstruturado,
      Descricao: a.descricao ?? null,
    })),
  ),
  Interessados: createSeiSoapArray(
    "ArrayOfInteressado",
    "Interessado",
    p.interessados.map((i) => ({
      IdContato: i.idContato ?? null,
      Cpf: i.cpf ?? null,
      Cnpj: i.cnpj ?? null,
      Sigla: i.sigla ?? null,
      Nome: i.nome ?? null,
    })),
  ),
  Observacao: p.observacao ?? null,
  NivelAcesso: p.nivelAcesso,
  IdHipoteseLegal: p.idHipoteseLegal ?? null,
  IdTipoPrioridade: p.idTipoPrioridade ?? null,
})

/** @internal */
const serializedDocumento = (d: SeiIncluirDocumentoParams["documento"]) => ({
  Tipo: d.tipo,
  IdProcedimento: d.idProcedimento ?? null,
  ProtocoloProcedimento: d.protocoloProcedimento ?? null,
  IdSerie: d.idSerie,
  Numero: d.numero ?? null,
  NomeArvore: d.nomeArvore ?? null,
  DinValor: d.dinValor ?? null,
  Data: d.data ?? null,
  Descricao: d.descricao ?? null,
  IdTipoConferencia: d.idTipoConferencia ?? null,
  SinArquivamento: d.sinArquivamento ?? null,
  Remetente: d.remetente
    ? {
        IdContato: d.remetente.idContato ?? null,
        Cpf: d.remetente.cpf ?? null,
        Cnpj: d.remetente.cnpj ?? null,
        Sigla: d.remetente.sigla ?? null,
        Nome: d.remetente.nome ?? null,
      }
    : null,
  Interessados: createSeiSoapArray(
    "ArrayOfInteressado",
    "Interessado",
    (d.interessados ?? []).map((i) => ({
      IdContato: i.idContato ?? null,
      Cpf: i.cpf ?? null,
      Cnpj: i.cnpj ?? null,
      Sigla: i.sigla ?? null,
      Nome: i.nome ?? null,
    })),
  ),
  Destinatarios: createSeiSoapArray(
    "ArrayOfDestinatario",
    "Destinatario",
    (d.destinatarios ?? []).map((dest) => ({
      IdContato: dest.idContato ?? null,
      Cpf: dest.cpf ?? null,
      Cnpj: dest.cnpj ?? null,
      Sigla: dest.sigla ?? null,
      Nome: dest.nome ?? null,
    })),
  ),
  Observacao: d.observacao ?? null,
  NomeArquivo: d.nomeArquivo ?? null,
  NivelAcesso: d.nivelAcesso ?? null,
  IdHipoteseLegal: d.idHipoteseLegal ?? null,
  Conteudo: d.conteudo ?? null,
  ConteudoSecoes: d.conteudoSecoes?.length
    ? createSeiSoapArray(
        "ArrayOfSecaoDocumento",
        "SecaoDocumento",
        d.conteudoSecoes.map((s) => ({ Nome: s.nome, Conteudo: s.conteudo })),
      )
    : null,
  IdArquivo: d.idArquivo ?? null,
  Campos: createSeiSoapArray(
    "ArrayOfCampo",
    "Campo",
    (d.campos ?? []).map((c) => ({ Nome: c.nome, Valor: c.valor })),
  ),
  SinBloqueado: d.sinBloqueado ?? null,
  SinAssinado: d.sinAssinado ?? null,
  IdItemEtapa: d.idItemEtapa ?? null,
})

// ─── SeiConsultasClient ───────────────────────────────────────────────────────

/**
 * Operações somente leitura do SEI (listagens e consultas).
 *
 * @remarks
 * Esta classe não altera estado no SEI. Ela é deliberadamente fina: recebe
 * config, chama SOAP e devolve tipos TypeScript.
 *
 * Em aplicações que usam {@link SeiClient}, acesse via `seiClient.consultas`.
 *
 * @see {@link SeiClient}
 * @see {@link createSeiClient}
 * @category Cliente
 */
export class SeiConsultasClient {
  /** @param config - Configuração de conexão com o SEI. */
  constructor(private readonly config: SeiConfig) {}

  /**
   * Lista as unidades liberadas para o sistema integrador no SEI.
   *
   * @param params - Filtros opcionais por tipo de procedimento e série.
   * @returns Lista de unidades habilitadas para a integração.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * const unidades = await sei.consultas.listarUnidades()
   * ```
   */
  async listarUnidades(params: SeiListarUnidadesParams = {}): Promise<SeiUnidade[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarUnidades",
      params: {
        SiglaSistema: this.config.siglaSistema,
        IdentificacaoServico: this.config.identificacaoServico,
        IdTipoProcedimento: params.idTipoProcedimento ?? null,
        IdSerie: params.idSerie ?? null,
      },
    })
    return mapUnidades(payload)
  }

  /**
   * Lista os tipos de procedimento (tipos de processo) disponíveis na unidade.
   *
   * @param params - Unidade e filtros opcionais por série e individualização.
   * @returns Lista de tipos de procedimento.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarTiposProcedimento(
    params: SeiListarTiposProcedimentoParams,
  ): Promise<SeiTipoProcedimento[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposProcedimento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdSerie: params.idSerie ?? null,
        SinIndividual: params.sinIndividual ?? null,
      },
    })
    return mapTiposProcedimento(payload)
  }

  /**
   * Lista os tipos de prioridade de processo configurados no SEI.
   *
   * @param params - Unidade de contexto da consulta.
   * @returns Lista de tipos de prioridade.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarTiposPrioridade(
    params: SeiListarTiposPrioridadeParams,
  ): Promise<SeiTipoPrioridade[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposPrioridade",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapTiposPrioridade(payload)
  }

  /**
   * Lista as séries (tipos de documento) disponíveis na unidade.
   *
   * @param params - Unidade e filtro opcional por tipo de procedimento.
   * @returns Lista de séries documentais.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarSeries(params: SeiListarSeriesParams): Promise<SeiSerie[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarSeries",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdTipoProcedimento: params.idTipoProcedimento ?? null,
      },
    })
    return mapSeries(payload)
  }

  /**
   * Lista contatos cadastrados no SEI com filtros combinativos e paginação.
   *
   * @param params - Unidade, filtros (tipo, sigla, nome, CPF, CNPJ, matrícula,
   *   IDs) e controle de paginação (`paginaRegistros`/`paginaAtual`).
   * @returns Lista de contatos que atendem aos filtros.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarContatos(params: SeiListarContatosParams): Promise<SeiContato[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarContatos",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdTipoContato: params.idTipoContato ?? null,
        PaginaRegistros: params.paginaRegistros ?? null,
        PaginaAtual: params.paginaAtual ?? null,
        Sigla: params.sigla ?? null,
        Nome: params.nome ?? null,
        Cpf: params.cpf ?? null,
        Cnpj: params.cnpj ?? null,
        Matricula: params.matricula ?? null,
        IdContatos: stringArrayOrNil("ArrayOfIdContatos", params.idContatos),
      },
    })
    return mapContatos(payload)
  }

  /**
   * Consulta os dados completos de um processo pelo protocolo.
   *
   * @remarks
   * Por padrão todos os sinalizadores `sinRetornar*` são enviados como `"S"`,
   * retornando assuntos, interessados, observações, andamentos, unidades
   * abertas e processos relacionados/anexados. Desligue os blocos que não
   * precisa (`"N"`) para reduzir o custo da consulta no SEI.
   *
   * @param params - Unidade, protocolo do processo e sinalizadores de retorno.
   * @returns Dados do processo, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault
   *   (ex.: processo inexistente ou sem acesso pela unidade).
   *
   * @example
   * ```ts
   * const proc = await sei.consultas.consultarProcedimento({
   *   idUnidade: "110000001",
   *   protocoloProcedimento: "00000.000001/2026-01",
   *   sinRetornarAndamentoConclusao: "N",
   * })
   * ```
   */
  async consultarProcedimento(
    params: SeiConsultarProcedimentoParams,
  ): Promise<SeiRetornoConsultaProcedimento | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "consultarProcedimento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        SinRetornarAssuntos: params.sinRetornarAssuntos ?? "S",
        SinRetornarInteressados: params.sinRetornarInteressados ?? "S",
        SinRetornarObservacoes: params.sinRetornarObservacoes ?? "S",
        SinRetornarAndamentoGeracao: params.sinRetornarAndamentoGeracao ?? "S",
        SinRetornarAndamentoConclusao: params.sinRetornarAndamentoConclusao ?? "S",
        SinRetornarUltimoAndamento: params.sinRetornarUltimoAndamento ?? "S",
        SinRetornarUnidadesProcedimentoAberto: params.sinRetornarUnidadesProcedimentoAberto ?? "S",
        SinRetornarProcedimentosRelacionados: params.sinRetornarProcedimentosRelacionados ?? "S",
        SinRetornarProcedimentosAnexados: params.sinRetornarProcedimentosAnexados ?? "S",
      },
    })
    return mapRetornoConsultaProcedimento(payload)
  }

  /**
   * Consulta o procedimento individual de um usuário (tipos de processo com
   * autuação individual, ex.: dossiê funcional).
   *
   * @param params - Unidade, órgão do procedimento, tipo de procedimento e
   *   identificação do usuário (órgão + sigla).
   * @returns Referência resumida ao processo, ou `null` se não encontrado.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async consultarProcedimentoIndividual(
    params: SeiConsultarProcedimentoIndividualParams,
  ): Promise<SeiProcedimentoResumido | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "consultarProcedimentoIndividual",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdOrgaoProcedimento: params.idOrgaoProcedimento,
        IdTipoProcedimento: params.idTipoProcedimento,
        IdOrgaoUsuario: params.idOrgaoUsuario,
        SiglaUsuario: params.siglaUsuario,
      },
    })
    return mapProcedimentoResumido(payload)
  }

  /**
   * Consulta os dados completos de um documento pelo protocolo.
   *
   * @remarks
   * Os sinalizadores `sinRetornar*` seguem o padrão `"S"`, exceto
   * `sinRetornarBlocos`, que por padrão é `"N"` por ser a consulta mais
   * custosa no SEI.
   *
   * @param params - Unidade, protocolo do documento e sinalizadores de retorno.
   * @returns Dados do documento, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async consultarDocumento(
    params: SeiConsultarDocumentoParams,
  ): Promise<SeiRetornoConsultaDocumento | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "consultarDocumento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloDocumento: params.protocoloDocumento,
        SinRetornarAndamentoGeracao: params.sinRetornarAndamentoGeracao ?? "S",
        SinRetornarAssinaturas: params.sinRetornarAssinaturas ?? "S",
        SinRetornarPublicacao: params.sinRetornarPublicacao ?? "S",
        SinRetornarCampos: params.sinRetornarCampos ?? "S",
        SinRetornarBlocos: params.sinRetornarBlocos ?? "N",
      },
    })
    return mapRetornoConsultaDocumento(payload)
  }

  /**
   * Consulta um bloco (assinatura, reunião ou interno) e, opcionalmente, seus
   * protocolos.
   *
   * @param params - Unidade, ID do bloco e sinalizador de retorno de protocolos.
   * @returns Dados do bloco, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async consultarBloco(params: SeiConsultarBlocoParams): Promise<SeiRetornoConsultaBloco | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "consultarBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        SinRetornarProtocolos: params.sinRetornarProtocolos ?? "S",
      },
    })
    return mapRetornoConsultaBloco(payload)
  }

  /**
   * Lista as extensões de arquivo permitidas para upload no SEI.
   *
   * @param params - Unidade e filtro opcional por ID de extensão.
   * @returns Lista de extensões permitidas.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarExtensoesPermitidas(
    params: SeiListarExtensoesPermitidasParams,
  ): Promise<SeiArquivoExtensao[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarExtensoesPermitidas",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdArquivoExtensao: params.idArquivoExtensao ?? null,
      },
    })
    return mapArquivosExtensao(payload)
  }

  /**
   * Lista os usuários com acesso à unidade informada.
   *
   * @param params - Unidade e filtro opcional por ID de usuário.
   * @returns Lista de usuários da unidade.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarUsuarios(params: SeiListarUsuariosParams): Promise<SeiUsuario[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarUsuarios",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdUsuario: params.idUsuario ?? null,
      },
    })
    return mapUsuarios(payload)
  }

  /**
   * Lista as hipóteses legais de restrição de acesso configuradas no SEI.
   *
   * @param params - Unidade e filtro opcional por nível de acesso
   *   (`"1"` restrito, `"2"` sigiloso).
   * @returns Lista de hipóteses legais.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarHipotesesLegais(params: SeiListarHipotesesLegaisParams): Promise<SeiHipoteseLegal[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarHipotesesLegais",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        NivelAcesso: params.nivelAcesso ?? null,
      },
    })
    return mapHipotesesLegais(payload)
  }

  /**
   * Lista os tipos de conferência usados em documentos digitalizados.
   *
   * @param params - Unidade de contexto da consulta.
   * @returns Lista de tipos de conferência.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarTiposConferencia(
    params: SeiListarTiposConferenciaParams,
  ): Promise<SeiTipoConferencia[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposConferencia",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapTiposConferencia(payload)
  }

  /**
   * Lista os países cadastrados no SEI.
   *
   * @param params - Unidade de contexto da consulta.
   * @returns Lista de países.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarPaises(params: SeiListarPaisesParams): Promise<SeiPais[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarPaises",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapPaises(payload)
  }

  /**
   * Lista os estados/UF cadastrados no SEI.
   *
   * @param params - Unidade e filtro opcional por país.
   * @returns Lista de estados.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarEstados(params: SeiListarEstadosParams): Promise<SeiEstado[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarEstados",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdPais: params.idPais ?? null,
      },
    })
    return mapEstados(payload)
  }

  /**
   * Lista os municípios cadastrados no SEI.
   *
   * @param params - Unidade e filtros opcionais por país e estado.
   * @returns Lista de municípios.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarCidades(params: SeiListarCidadesParams): Promise<SeiCidade[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarCidades",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdPais: params.idPais ?? null,
        IdEstado: params.idEstado ?? null,
      },
    })
    return mapCidades(payload)
  }

  /**
   * Lista os tipos de procedimento habilitados para manifestações de
   * ouvidoria.
   *
   * @remarks
   * Diferente das demais consultas, esta operação não exige unidade: o SEI a
   * resolve apenas com as credenciais do sistema integrador.
   *
   * @returns Lista de tipos de procedimento de ouvidoria.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiOperacoesClient.registrarOuvidoria}
   */
  async listarTiposProcedimentoOuvidoria(): Promise<SeiTipoProcedimento[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposProcedimentoOuvidoria",
      params: {
        SiglaSistema: this.config.siglaSistema,
        IdentificacaoServico: this.config.identificacaoServico,
      },
    })
    return mapTiposProcedimento(payload)
  }

  /**
   * Lista os cargos cadastrados no SEI.
   *
   * @param params - Unidade e filtro opcional por ID de cargo.
   * @returns Lista de cargos com expressões de tratamento e vocativo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarCargos(params: SeiListarCargosParams): Promise<SeiCargo[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarCargos",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdCargo: params.idCargo ?? null,
      },
    })
    return mapCargos(payload)
  }

  /**
   * Inicia o upload de um arquivo temporário no SEI (upload em partes).
   *
   * @remarks
   * Informe o tamanho total em bytes, o hash MD5 hexadecimal do arquivo
   * completo e a primeira parte do conteúdo em Base64. Se a primeira parte não
   * completar o tamanho declarado, envie o restante via
   * {@link adicionarConteudoArquivo}. O ID retornado pode ser usado em
   * `SeiDocumentoInput.idArquivo`.
   *
   * @param params - Unidade, nome, tamanho, hash MD5 e primeira parte em Base64.
   * @returns O ID do arquivo temporário criado no SEI.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link adicionarConteudoArquivo}
   * @see {@link SeiOperacoesClient.incluirDocumento}
   */
  async adicionarArquivo(params: SeiAdicionarArquivoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "adicionarArquivo",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Nome: params.nome,
        Tamanho: params.tamanho,
        Hash: params.hash,
        Conteudo: params.conteudo,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Envia uma parte adicional de conteúdo para um arquivo temporário iniciado
   * por {@link adicionarArquivo}.
   *
   * @remarks
   * Quando o conteúdo acumulado atinge o tamanho declarado na criação, o SEI
   * valida o hash MD5 informado e ativa o arquivo.
   *
   * @param params - Unidade, ID do arquivo e parte do conteúdo em Base64.
   * @returns O ID do arquivo temporário.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async adicionarConteudoArquivo(params: SeiAdicionarConteudoArquivoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "adicionarConteudoArquivo",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdArquivo: params.idArquivo,
        Conteudo: params.conteudo,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Lista o histórico de andamentos de um processo.
   *
   * @param params - Unidade, protocolo do processo e filtros opcionais por
   *   andamentos, tarefas e tarefas de módulos.
   * @returns Lista de andamentos do processo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarAndamentos(params: SeiListarAndamentosParams): Promise<SeiAndamento[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarAndamentos",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        SinRetornarAtributos: params.sinRetornarAtributos ?? "S",
        Andamentos: stringArrayOrNil("ArrayOfIdAndamentos", params.andamentos),
        Tarefas: stringArrayOrNil("ArrayOfIdTarefas", params.tarefas),
        TarefasModulos: stringArrayOrNil("ArrayOfIdTarefasModulo", params.tarefasModulos),
      },
    })
    return mapAndamentos(payload)
  }

  /**
   * Lista os marcadores configurados para a unidade.
   *
   * @param params - Unidade de contexto da consulta.
   * @returns Lista de marcadores da unidade.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiOperacoesClient.definirMarcador}
   */
  async listarMarcadoresUnidade(params: SeiListarMarcadoresUnidadeParams): Promise<SeiMarcador[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarMarcadoresUnidade",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapMarcadores(payload)
  }

  /**
   * Lista os andamentos de marcadores registrados em um processo.
   *
   * @param params - Unidade, protocolo do processo e filtro opcional por IDs
   *   de marcadores.
   * @returns Lista de andamentos de marcadores.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiOperacoesClient.definirMarcador}
   */
  async listarAndamentosMarcadores(
    params: SeiListarAndamentosMarcadoresParams,
  ): Promise<SeiAndamentoMarcador[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarAndamentosMarcadores",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        Marcadores: stringArrayOrNil("ArrayOfIdMarcadores", params.marcadores),
      },
    })
    return mapAndamentosMarcadores(payload)
  }

  /**
   * Consulta uma publicação oficial associada a um documento.
   *
   * @param params - Unidade e identificação da publicação (`idPublicacao`,
   *   `idDocumento` ou `protocoloDocumento`), com sinalizadores de retorno.
   * @returns Dados da publicação, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiOperacoesClient.agendarPublicacao}
   */
  async consultarPublicacao(
    params: SeiConsultarPublicacaoParams,
  ): Promise<SeiRetornoConsultaPublicacao | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "consultarPublicacao",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdPublicacao: params.idPublicacao ?? null,
        IdDocumento: params.idDocumento ?? null,
        ProtocoloDocumento: params.protocoloDocumento ?? null,
        SinRetornarAndamento: params.sinRetornarAndamento ?? "S",
        SinRetornarAssinaturas: params.sinRetornarAssinaturas ?? "S",
      },
    })
    return mapRetornoConsultaPublicacao(payload)
  }

  /**
   * Lista os feriados cadastrados para o órgão/unidade em um período.
   *
   * @param params - Unidade e filtros opcionais por órgão e intervalo de datas.
   * @returns Lista de feriados.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async listarFeriados(params: SeiListarFeriadosParams): Promise<SeiFeriado[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarFeriados",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdOrgao: params.idOrgao ?? null,
        DataInicial: params.dataInicial ?? null,
        DataFinal: params.dataFinal ?? null,
      },
    })
    return mapFeriados(payload)
  }
}

// ─── SeiOperacoesClient ───────────────────────────────────────────────────────

/**
 * Operações que alteram estado no SEI.
 *
 * @remarks
 * Inclui criação de processos e documentos, movimentação, envio de e-mail,
 * publicação, marcadores, controle de prazo e ouvidoria.
 *
 * Em aplicações que usam {@link SeiClient}, acesse via `seiClient.operacoes`.
 * @category Cliente
 */
export class SeiOperacoesClient {
  /** @param config - Configuração de conexão com o SEI. */
  constructor(private readonly config: SeiConfig) {}

  /**
   * Cria um processo no SEI, opcionalmente já com documentos, relacionamentos,
   * envio para unidades, marcador e controle de prazo.
   *
   * @param params - Unidade, dados do processo ({@link SeiProcedimentoInput}) e
   *   opções de criação.
   * @returns Protocolo gerado com link de acesso e retorno da inclusão de cada
   *   documento, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault
   *   (ex.: tipo de procedimento inválido ou assunto não permitido).
   *
   * @example
   * ```ts
   * const retorno = await sei.operacoes.gerarProcedimento({
   *   idUnidade: "110000001",
   *   procedimento: {
   *     idTipoProcedimento: "100000101",
   *     especificacao: "Integração via sei-client",
   *     assuntos: [{ codigoEstruturado: "06.01.01" }],
   *     interessados: [{ nome: "Fulano de Tal", cpf: "00000000000" }],
   *     nivelAcesso: "0",
   *   },
   * })
   * console.log(retorno?.procedimentoFormatado)
   * ```
   */
  async gerarProcedimento(
    params: SeiGerarProcedimentoParams,
  ): Promise<SeiRetornoGeracaoProcedimento | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "gerarProcedimento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Procedimento: serializedProcedimento(params.procedimento),
        Documentos: createSeiSoapArray(
          "ArrayOfDocumento",
          "Documento",
          (params.documentos ?? []).map(serializedDocumento),
        ),
        ProcedimentosRelacionados: stringArrayOrNil(
          "ArrayOfProcedimentoRelacionado",
          params.procedimentosRelacionados,
        ),
        UnidadesEnvio: stringArrayOrNil("ArrayOfIdUnidade", params.unidadesEnvio),
        SinManterAbertoUnidade: params.sinManterAbertoUnidade ?? null,
        SinEnviarEmailNotificacao: params.sinEnviarEmailNotificacao ?? null,
        DataRetornoProgramado: params.dataRetornoProgramado ?? null,
        DiasRetornoProgramado: params.diasRetornoProgramado ?? null,
        SinDiasUteisRetornoProgramado: params.sinDiasUteisRetornoProgramado ?? null,
        IdMarcador: params.idMarcador ?? null,
        TextoMarcador: params.textoMarcador ?? null,
        DataControlePrazo: params.dataControlePrazo ?? null,
        DiasControlePrazo: params.diasControlePrazo ?? null,
        SinDiasUteisControlePrazo: params.sinDiasUteisControlePrazo ?? null,
      },
    })
    return mapRetornoGeracaoProcedimento(payload)
  }

  /**
   * Inclui um documento (gerado ou recebido) em um processo existente.
   *
   * @remarks
   * O conteúdo deve ser informado em Base64 via `conteudo`, `conteudoSecoes`
   * ou `idArquivo` (upload prévio com
   * {@link SeiConsultasClient.adicionarArquivo}). Use {@link encodeSeiBase64}
   * para codificar HTML/texto.
   *
   * @param params - Unidade e dados do documento ({@link SeiDocumentoInput}).
   * @returns Protocolo do documento gerado com link de acesso, ou `null`
   *   quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault
   *   (ex.: série inválida ou extensão de arquivo não permitida).
   *
   * @example
   * ```ts
   * const doc = await sei.operacoes.incluirDocumento({
   *   idUnidade: "110000001",
   *   documento: {
   *     tipo: "G",
   *     protocoloProcedimento: "00000.000001/2026-01",
   *     idSerie: "5",
   *     nivelAcesso: "0",
   *     conteudo: encodeSeiBase64("<p>Conteúdo</p>"),
   *   },
   * })
   * ```
   */
  async incluirDocumento(
    params: SeiIncluirDocumentoParams,
  ): Promise<SeiRetornoInclusaoDocumento | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "incluirDocumento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Documento: serializedDocumento(params.documento),
      },
    })
    return mapRetornoInclusaoDocumento(payload)
  }

  /**
   * Cria, altera, exclui, desativa ou reativa contatos em lote.
   *
   * @remarks
   * O efeito de cada item é controlado por `staOperacao` em
   * {@link SeiContatoInput}: `"A"` cria/altera, `"E"` exclui, `"D"` desativa e
   * `"R"` reativa. Para alteração, envie o cadastro completo do contato.
   *
   * @param params - Unidade e lista de contatos com as operações desejadas.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async atualizarContatos(params: SeiAtualizarContatosParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "atualizarContatos",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Contatos: createSeiSoapArray(
          "ArrayOfContato",
          "Contato",
          params.contatos.map((c) => ({
            StaOperacao: c.staOperacao ?? null,
            IdContato: c.idContato,
            IdTipoContato: c.idTipoContato,
            Sigla: c.sigla,
            Nome: c.nome,
            NomeSocial: c.nomeSocial ?? null,
            StaNatureza: c.staNatureza,
            IdContatoAssociado: c.idContatoAssociado ?? null,
            SinEnderecoAssociado: c.sinEnderecoAssociado,
            CnpjAssociado: c.cnpjAssociado ?? null,
            Endereco: c.endereco,
            Complemento: c.complemento,
            Bairro: c.bairro,
            IdCidade: c.idCidade ?? null,
            IdEstado: c.idEstado ?? null,
            IdPais: c.idPais ?? null,
            Cep: c.cep,
            StaGenero: c.staGenero,
            IdCargo: c.idCargo ?? null,
            Cpf: c.cpf,
            Cnpj: c.cnpj,
            Rg: c.rg,
            OrgaoExpedidor: c.orgaoExpedidor,
            NumeroPassaporte: c.numeroPassaporte ?? null,
            IdPaisPassaporte: c.idPaisPassaporte ?? null,
            Matricula: c.matricula,
            MatriculaOab: c.matriculaOab,
            TelefoneComercial: c.telefoneComercial,
            TelefoneResidencial: c.telefoneResidencial,
            TelefoneCelular: c.telefoneCelular,
            DataNascimento: c.dataNascimento,
            Email: c.email,
            SitioInternet: c.sitioInternet,
            Observacao: c.observacao,
            Conjuge: c.conjuge ?? null,
            Funcao: c.funcao ?? null,
            IdTitulo: c.idTitulo ?? null,
            SinAtivo: c.sinAtivo,
            IdCategoria: c.idCategoria ?? null,
          })),
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Cancela um documento no processo, registrando o motivo.
   *
   * @experimental
   * @remarks
   * Operação sensível e sem reversão simples pelo Web Service — o documento
   * permanece na árvore do processo com a tarja de cancelado.
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Unidade, protocolo do documento e motivo do cancelamento.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async cancelarDocumento(params: SeiCancelarDocumentoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "cancelarDocumento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloDocumento: params.protocoloDocumento,
        Motivo: params.motivo,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Bloqueia um documento contra edição.
   *
   * @experimental
   * @remarks
   * O Web Service do SEI não expõe, nesta lib, operação simétrica de
   * desbloqueio de documento — valide o fluxo com documento de teste.
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Unidade e protocolo do documento.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async bloquearDocumento(params: SeiBloquearDocumentoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "bloquearDocumento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloDocumento: params.protocoloDocumento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Cria um bloco no SEI.
   *
   * @remarks
   * O SEI define três tipos de bloco: `"A"` (assinatura), `"R"` (reunião) e
   * `"I"` (interno). O tipo determina quais protocolos podem ser adicionados:
   * documentos foram validados em bloco de assinatura (`Tipo=A`), mas
   * processos exigem bloco interno ou outro tipo compatível.
   *
   * @param params - Unidade, tipo, descrição e opções de disponibilização.
   * @returns O ID do bloco criado.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link incluirDocumentoBloco}
   * @see {@link incluirProcessoBloco}
   */
  async gerarBloco(params: SeiGerarBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "gerarBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Tipo: params.tipo,
        Descricao: params.descricao,
        UnidadesDisponibilizacao: stringArrayOrNil(
          "ArrayOfIdUnidade",
          params.unidadesDisponibilizacao,
        ),
        Documentos: stringArrayOrNil("ArrayOfDocumentoFormatado", params.documentos),
        SinDisponibilizar: params.sinDisponibilizar ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Altera a descrição e as unidades de disponibilização de um bloco.
   *
   * @param params - Unidade, ID do bloco, nova descrição e unidades.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async alterarBloco(params: SeiAlterarBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "alterarBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        Descricao: params.descricao,
        UnidadesDisponibilizacao: stringArrayOrNil(
          "ArrayOfIdUnidade",
          params.unidadesDisponibilizacao,
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Exclui um bloco.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async excluirBloco(params: SeiExcluirBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "excluirBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Exclui um processo.
   *
   * @experimental
   * @remarks
   * Operação destrutiva. O SEI só permite excluir processo sem andamentos
   * relevantes, gerado pela própria unidade — pensada para limpeza de massa
   * de teste/rascunho, não para descarte de processos reais.
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async excluirProcesso(params: SeiExcluirProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "excluirProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Exclui um documento.
   *
   * @experimental
   * @remarks
   * Operação destrutiva, sujeita às regras de exclusão do SEI (documento sem
   * assinatura/tramitação, gerado pela própria unidade).
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Unidade e protocolo do documento.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async excluirDocumento(params: SeiExcluirDocumentoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "excluirDocumento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloDocumento: params.protocoloDocumento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Disponibiliza um bloco para as unidades configuradas.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async disponibilizarBloco(params: SeiOperacaoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "disponibilizarBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Cancela a disponibilização de um bloco.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async cancelarDisponibilizacaoBloco(params: SeiOperacaoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "cancelarDisponibilizacaoBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Conclui um bloco.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async concluirBloco(params: SeiOperacaoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "concluirBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Reabre um bloco concluído.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async reabrirBloco(params: SeiOperacaoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "reabrirBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Devolve um bloco recebido à unidade de origem.
   *
   * @param params - Unidade e ID do bloco.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async devolverBloco(params: SeiOperacaoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "devolverBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Inclui um documento em bloco.
   *
   * @remarks
   * Validado em HML com bloco de assinatura (`Tipo=A`). Essa compatibilidade não
   * se aplica automaticamente a processos.
   *
   * @param params - Unidade, ID do bloco, protocolo do documento e anotação.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async incluirDocumentoBloco(params: SeiIncluirDocumentoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "incluirDocumentoBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        ProtocoloDocumento: params.protocoloDocumento,
        Anotacao: params.anotacao ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Retira um documento de bloco.
   *
   * @remarks
   * Validado em HML com bloco de assinatura (`Tipo=A`).
   *
   * @param params - Unidade, ID do bloco e protocolo do documento.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async retirarDocumentoBloco(params: SeiRetirarDocumentoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "retirarDocumentoBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        ProtocoloDocumento: params.protocoloDocumento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Inclui um processo em bloco.
   *
   * @remarks
   * Não use bloco de assinatura (`Tipo=A`) para processo: o SEI rejeita essa
   * combinação. Em HML, o fluxo foi validado com bloco interno (`Tipo=I`).
   *
   * @param params - Unidade, ID do bloco, protocolo do processo e anotação.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async incluirProcessoBloco(params: SeiIncluirProcessoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "incluirProcessoBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        ProtocoloProcedimento: params.protocoloProcedimento,
        Anotacao: params.anotacao ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Retira um processo de bloco.
   *
   * @remarks
   * Deve ser usado com bloco compatível com processos. Em HML, o par
   * incluir/retirar processo foi validado com bloco interno (`Tipo=I`).
   *
   * @param params - Unidade, ID do bloco e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async retirarProcessoBloco(params: SeiRetirarProcessoBlocoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "retirarProcessoBloco",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdBloco: params.idBloco,
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Reabre um processo concluído na unidade.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async reabrirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "reabrirProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Conclui um processo na unidade.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async concluirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "concluirProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Tramita um processo para uma ou mais unidades.
   *
   * @experimental
   * @remarks
   * Por padrão o processo é fechado na unidade de origem; use
   * `sinManterAbertoUnidade: "S"` para mantê-lo aberto. Também suporta retorno
   * programado por data ou prazo em dias.
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real (apenas a serialização/desserialização foi verificada). Valide
   * em homologação antes de usar em produção.
   *
   * @param params - Unidade de origem, protocolo, unidades de destino e opções
   *   de tramitação.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @example
   * ```ts
   * await sei.operacoes.enviarProcesso({
   *   idUnidade: "110000001",
   *   protocoloProcedimento: "00000.000001/2026-01",
   *   unidadesDestino: ["110000002"],
   *   sinManterAbertoUnidade: "S",
   * })
   * ```
   */
  async enviarProcesso(params: SeiEnviarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "enviarProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        UnidadesDestino: createSeiSoapArray(
          "ArrayOfIdUnidade",
          "xsd:string",
          params.unidadesDestino,
        ),
        SinManterAbertoUnidade: params.sinManterAbertoUnidade ?? null,
        SinRemoverAnotacao: params.sinRemoverAnotacao ?? null,
        SinEnviarEmailNotificacao: params.sinEnviarEmailNotificacao ?? null,
        DataRetornoProgramado: params.dataRetornoProgramado ?? null,
        DiasRetornoProgramado: params.diasRetornoProgramado ?? null,
        SinDiasUteisRetornoProgramado: params.sinDiasUteisRetornoProgramado ?? null,
        SinReabrir: params.sinReabrir ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Atribui um processo a um usuário da unidade.
   *
   * @experimental
   * @remarks
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Unidade, protocolo do processo, ID do usuário e opção de
   *   reabertura.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async atribuirProcesso(params: SeiAtribuirProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "atribuirProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        IdUsuario: params.idUsuario,
        SinReabrir: params.sinReabrir ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Registra um andamento (histórico) em um processo.
   *
   * @param params - Unidade, protocolo do processo, tarefa e atributos do
   *   andamento.
   * @returns O andamento registrado, ou `null` quando o SEI não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async lancarAndamento(params: SeiLancarAndamentoParams): Promise<SeiAndamento | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "lancarAndamento",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        IdTarefa: params.idTarefa ?? null,
        IdTarefaModulo: params.idTarefaModulo ?? null,
        Atributos: createSeiSoapArray(
          "ArrayOfAtributoAndamento",
          "AtributoAndamento",
          (params.atributos ?? []).map((a) => ({
            Nome: a.nome,
            Valor: a.valor,
            IdOrigem: a.idOrigem,
          })),
        ),
      },
    })
    return mapAndamento(payload)
  }

  /**
   * Bloqueia um processo na unidade.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link desbloquearProcesso}
   */
  async bloquearProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "bloquearProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Desbloqueia um processo bloqueado na unidade.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link bloquearProcesso}
   */
  async desbloquearProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "desbloquearProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Relaciona dois processos entre si.
   *
   * @param params - Unidade e os dois protocolos a relacionar.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link removerRelacionamentoProcesso}
   */
  async relacionarProcesso(params: SeiRelacionarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "relacionarProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento1: params.protocoloProcedimento1,
        ProtocoloProcedimento2: params.protocoloProcedimento2,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Remove o relacionamento entre dois processos.
   *
   * @param params - Unidade e os dois protocolos relacionados.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link relacionarProcesso}
   */
  async removerRelacionamentoProcesso(params: SeiRelacionarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "removerRelacionamentoProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento1: params.protocoloProcedimento1,
        ProtocoloProcedimento2: params.protocoloProcedimento2,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Sobresta (suspende) um processo, opcionalmente vinculado a outro processo.
   *
   * @param params - Unidade, protocolo do processo, processo vinculado
   *   (opcional) e motivo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link removerSobrestamentoProcesso}
   */
  async sobrestarProcesso(params: SeiSobrestarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "sobrestarProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        ProtocoloProcedimentoVinculado: params.protocoloProcedimentoVinculado ?? null,
        Motivo: params.motivo,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Remove o sobrestamento de um processo.
   *
   * @param params - Unidade e protocolo do processo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link sobrestarProcesso}
   */
  async removerSobrestamentoProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "removerSobrestamentoProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Anexa um processo a outro (o anexado passa a tramitar junto ao principal).
   *
   * @param params - Unidade, protocolo do processo principal e do anexado.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link desanexarProcesso}
   */
  async anexarProcesso(params: SeiAnexarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "anexarProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimentoPrincipal: params.protocoloProcedimentoPrincipal,
        ProtocoloProcedimentoAnexado: params.protocoloProcedimentoAnexado,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Desanexa um processo previamente anexado, registrando o motivo.
   *
   * @param params - Unidade, protocolos principal e anexado, e motivo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link anexarProcesso}
   */
  async desanexarProcesso(params: SeiDesanexarProcessoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "desanexarProcesso",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimentoPrincipal: params.protocoloProcedimentoPrincipal,
        ProtocoloProcedimentoAnexado: params.protocoloProcedimentoAnexado,
        Motivo: params.motivo,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Define marcadores em processos, em lote.
   *
   * @remarks
   * O Web Service do SEI não expõe operação par de remoção/cancelamento de
   * marcador — cada definição registra um andamento de marcador no processo.
   *
   * @param params - Unidade e lista de definições (protocolo, marcador, texto).
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiConsultasClient.listarMarcadoresUnidade}
   * @see {@link SeiConsultasClient.listarAndamentosMarcadores}
   */
  async definirMarcador(params: SeiDefinirMarcadorParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "definirMarcador",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Definicoes: createSeiSoapArray(
          "ArrayOfDefinicaoMarcador",
          "DefinicaoMarcador",
          params.definicoes.map((d) => ({
            ProtocoloProcedimento: d.protocoloProcedimento,
            IdMarcador: d.idMarcador,
            Texto: d.texto,
          })),
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Define controle de prazo em processos, em lote.
   *
   * @remarks
   * Para prazo absoluto informe `dataPrazo`; para prazo relativo informe
   * `dias` e `sinDiasUteis`. O ciclo completo é fechado com
   * {@link concluirControlePrazo} ou {@link removerControlePrazo}.
   *
   * @param params - Unidade e lista de definições de prazo.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async definirControlePrazo(params: SeiDefinirControlePrazoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "definirControlePrazo",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Definicoes: createSeiSoapArray(
          "ArrayOfDefinicaoControlePrazo",
          "DefinicaoControlePrazo",
          params.definicoes.map((d) => ({
            ProtocoloProcedimento: d.protocoloProcedimento,
            DataPrazo: d.dataPrazo,
            Dias: d.dias,
            SinDiasUteis: d.sinDiasUteis,
          })),
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Conclui o controle de prazo dos processos informados.
   *
   * @param params - Unidade e protocolos dos processos.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link definirControlePrazo}
   */
  async concluirControlePrazo(params: SeiControlePrazoProcessosParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "concluirControlePrazo",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocolosProcedimentos: stringArrayOrNil(
          "ArrayOfProcedimento",
          params.protocolosProcedimentos,
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Remove o controle de prazo dos processos informados.
   *
   * @param params - Unidade e protocolos dos processos.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link definirControlePrazo}
   */
  async removerControlePrazo(params: SeiControlePrazoProcessosParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "removerControlePrazo",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocolosProcedimentos: stringArrayOrNil(
          "ArrayOfProcedimento",
          params.protocolosProcedimentos,
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Registra anotações (post-its) em processos, em lote.
   *
   * @param params - Unidade e lista de anotações (protocolo, descrição,
   *   prioridade).
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async registrarAnotacao(params: SeiRegistrarAnotacaoParams): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "registrarAnotacao",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        Anotacoes: createSeiSoapArray(
          "ArrayOfAnotacao",
          "Anotacao",
          params.anotacoes.map((a) => ({
            ProtocoloProcedimento: a.protocoloProcedimento,
            Descricao: a.descricao,
            SinPrioridade: a.sinPrioridade,
          })),
        ),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Agenda a publicação de um documento em veículo de publicação.
   *
   * @remarks
   * Em testes, prefira parear com {@link cancelarAgendamentoPublicacao} para
   * limpar o agendamento criado.
   *
   * @param params - Unidade, documento, veículo, data de disponibilização e
   *   dados de Imprensa Nacional quando aplicável.
   * @returns Retorno textual do SEI (normalmente o ID do agendamento).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async agendarPublicacao(params: SeiAgendarPublicacaoParams): Promise<string> {
    const imprensa = params.imprensaNacional
    const payload = await callSeiSoap(this.config, {
      operation: "agendarPublicacao",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdDocumento: params.idDocumento ?? null,
        ProtocoloDocumento: params.protocoloDocumento ?? null,
        StaMotivo: params.staMotivo ?? null,
        IdVeiculoPublicacao: params.idVeiculoPublicacao,
        DataDisponibilizacao: params.dataDisponibilizacao,
        Resumo: params.resumo ?? null,
        ImprensaNacional: imprensa
          ? {
              IdVeiculo: imprensa.idVeiculo ?? null,
              SiglaVeiculo: imprensa.siglaVeiculo ?? null,
              DescricaoVeiculo: imprensa.descricaoVeiculo ?? null,
              Pagina: imprensa.pagina,
              IdSecao: imprensa.idSecao ?? null,
              Secao: imprensa.secao ?? null,
              Data: imprensa.data,
            }
          : null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Altera um agendamento de publicação existente.
   *
   * @param params - Unidade, identificação do agendamento (`idPublicacao`,
   *   `idDocumento` ou `protocoloDocumento`) e novos dados.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link agendarPublicacao}
   */
  async alterarPublicacao(params: SeiAlterarPublicacaoParams): Promise<string> {
    const imprensa = params.imprensaNacional
    const payload = await callSeiSoap(this.config, {
      operation: "alterarPublicacao",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdPublicacao: params.idPublicacao ?? null,
        IdDocumento: params.idDocumento ?? null,
        ProtocoloDocumento: params.protocoloDocumento ?? null,
        StaMotivo: params.staMotivo ?? null,
        IdVeiculoPublicacao: params.idVeiculoPublicacao,
        DataDisponibilizacao: params.dataDisponibilizacao,
        Resumo: params.resumo ?? null,
        ImprensaNacional: imprensa
          ? {
              IdVeiculo: imprensa.idVeiculo ?? null,
              SiglaVeiculo: imprensa.siglaVeiculo ?? null,
              DescricaoVeiculo: imprensa.descricaoVeiculo ?? null,
              Pagina: imprensa.pagina,
              IdSecao: imprensa.idSecao ?? null,
              Secao: imprensa.secao ?? null,
              Data: imprensa.data,
            }
          : null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Cancela um agendamento de publicação.
   *
   * @param params - Unidade e identificação do agendamento (`idPublicacao`,
   *   `idDocumento` ou `protocoloDocumento`).
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link agendarPublicacao}
   */
  async cancelarAgendamentoPublicacao(
    params: SeiCancelarAgendamentoPublicacaoParams,
  ): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "cancelarAgendamentoPublicacao",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdPublicacao: params.idPublicacao ?? null,
        IdDocumento: params.idDocumento ?? null,
        ProtocoloDocumento: params.protocoloDocumento ?? null,
      },
    })
    return stringReturn(payload)
  }

  /**
   * Confirma a disponibilização/publicação de documentos em um veículo.
   *
   * @experimental
   * @remarks
   * Operação finalística e sem par simples de reversão no Web Service. Execute
   * apenas com roteiro explícito de confirmação de publicação.
   *
   * Esta operação ainda não foi validada de ponta a ponta contra um ambiente
   * SEI real. Valide em homologação antes de usar em produção.
   *
   * @param params - Veículo, datas de disponibilização/publicação, número da
   *   edição e IDs dos documentos.
   * @returns Retorno textual do SEI (normalmente `"1"` em caso de sucesso).
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async confirmarDisponibilizacaoPublicacao(
    params: SeiConfirmarDisponibilizacaoPublicacaoParams,
  ): Promise<string> {
    const payload = await callSeiSoap(this.config, {
      operation: "confirmarDisponibilizacaoPublicacao",
      params: {
        SiglaSistema: this.config.siglaSistema,
        IdentificacaoServico: this.config.identificacaoServico,
        IdVeiculoPublicacao: params.idVeiculoPublicacao,
        DataDisponibilizacao: params.dataDisponibilizacao,
        DataPublicacao: params.dataPublicacao,
        Numero: params.numero,
        IdDocumentos: createSeiSoapArray("ArrayOfIdDocumento", "xsd:string", params.idDocumentos),
      },
    })
    return stringReturn(payload)
  }

  /**
   * Envia um e-mail pelo SEI e gera o documento de e-mail correspondente no
   * processo.
   *
   * @remarks
   * A operação dispara e-mail real pelo servidor do SEI. Em ambientes de
   * teste, use apenas destinatários controlados.
   *
   * @param params - Unidade, protocolo do processo, remetente/destinatários,
   *   assunto, mensagem e documentos anexos.
   * @returns Protocolo do documento de e-mail gerado, ou `null` quando o SEI
   *   não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   */
  async enviarEmail(params: SeiEnviarEmailParams): Promise<SeiRetornoEnvioEmail | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "enviarEmail",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        ProtocoloProcedimento: params.protocoloProcedimento,
        De: params.de ?? null,
        Para: params.para,
        CCO: params.cco ?? null,
        Assunto: params.assunto,
        Mensagem: params.mensagem,
        IdDocumentos: stringArrayOrNil("ArrayOfIdDocumento", params.idDocumentos),
        NivelAcesso: params.nivelAcesso ?? null,
        IdHipoteseLegal: params.idHipoteseLegal ?? null,
      },
    })
    return mapRetornoEnvioEmail(payload)
  }

  /**
   * Registra manifestação de ouvidoria no SEI.
   *
   * @experimental
   * @remarks
   * A chamada serializa dados do manifestante, tipo de procedimento, mensagem,
   * atributos adicionais e anexos. Requer que o parâmetro
   * `ID_TIPO_CONTATO_OUVIDORIA` esteja configurado na instalação do SEI;
   * caso contrário, a operação pode falhar com um erro indicando tipo de
   * contato não informado.
   *
   * Esta operação ainda não foi validada com sucesso de ponta a ponta contra
   * um ambiente SEI real (a serialização chega ao serviço, mas a confirmação
   * completa depende da configuração de ouvidoria da instalação). Valide em
   * homologação antes de usar em produção.
   *
   * @param params - Órgão, dados do manifestante, tipo de procedimento,
   *   mensagem, atributos adicionais e anexos.
   * @returns Referência resumida ao processo criado, ou `null` quando o SEI
   *   não retorna corpo.
   * @throws {@link SeiSoapError} em caso de falha de comunicação ou SOAP Fault.
   *
   * @see {@link SeiConsultasClient.listarTiposProcedimentoOuvidoria}
   */
  async registrarOuvidoria(
    params: SeiRegistrarOuvidoriaParams,
  ): Promise<SeiProcedimentoResumido | null> {
    const payload = await callSeiSoap(this.config, {
      operation: "registrarOuvidoria",
      params: {
        SiglaSistema: this.config.siglaSistema,
        IdentificacaoServico: this.config.identificacaoServico,
        IdOrgao: params.idOrgao,
        Nome: params.nome ?? null,
        NomeSocial: params.nomeSocial ?? null,
        Email: params.email ?? null,
        Cpf: params.cpf ?? null,
        Rg: params.rg ?? null,
        OrgaoExpedidor: params.orgaoExpedidor ?? null,
        Telefone: params.telefone ?? null,
        IdEstado: params.idEstado ?? null,
        IdCidade: params.idCidade ?? null,
        IdTipoProcedimento: params.idTipoProcedimento,
        Processos: params.processos ?? null,
        SinRetorno: params.sinRetorno ?? null,
        Mensagem: params.mensagem,
        AtributosAdicionais: createSeiSoapArray(
          "ArrayOfAtributoOuvidoria",
          "AtributoOuvidoria",
          (params.atributosAdicionais ?? []).map((a) => ({
            Id: a.id ?? null,
            Nome: a.nome,
            Titulo: a.titulo,
            Valor: a.valor,
          })),
        ),
        SinAnonimo: params.sinAnonimo ?? null,
        SinSigilo: params.sinSigilo ?? null,
        Anexos: createSeiSoapArray(
          "ArrayOfAnexo",
          "Anexo",
          (params.anexos ?? []).map((a) => ({
            IdAnexo: a.idAnexo ?? null,
            Nome: a.nome,
            DataHora: a.dataHora ?? null,
            Tamanho: a.tamanho ?? null,
            Conteudo: a.conteudo,
          })),
        ),
      },
    })
    return mapProcedimentoResumido(payload)
  }
}

// ─── SeiClient (fachada) ──────────────────────────────────────────────────────

/**
 * Fachada principal do cliente SEI.
 *
 * Agrupa {@link SeiConsultasClient} e {@link SeiOperacoesClient} e expõe
 * métodos de atalho para as operações mais comuns.
 *
 * @example
 * ```ts
 * const sei = createSeiClient({ ... })
 *
 * // Via subclients especializados
 * const proc = await sei.consultas.consultarProcedimento({ ... })
 * const ret  = await sei.operacoes.gerarProcedimento({ ... })
 *
 * // Via atalhos na raiz (equivalentes)
 * const proc2 = await sei.consultarProcedimento({ ... })
 * ```
 * @category Cliente
 */
export class SeiClient {
  /** Subclient para operações somente leitura (consultas e listagens). */
  readonly consultas: SeiConsultasClient
  /** Subclient para operações que alteram estado no SEI. */
  readonly operacoes: SeiOperacoesClient

  /** @param config - Configuração de conexão com o SEI. */
  constructor(config: SeiConfig) {
    this.consultas = new SeiConsultasClient(config)
    this.operacoes = new SeiOperacoesClient(config)
  }

  // ── Atalhos de consulta ──────────────────────────────────────────────────

  /** Atalho para {@link SeiConsultasClient.listarUnidades | `consultas.listarUnidades`}. */
  listarUnidades(params: SeiListarUnidadesParams): Promise<SeiUnidade[]> {
    return this.consultas.listarUnidades(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarTiposProcedimento | `consultas.listarTiposProcedimento`}. */
  listarTiposProcedimento(
    params: SeiListarTiposProcedimentoParams,
  ): Promise<SeiTipoProcedimento[]> {
    return this.consultas.listarTiposProcedimento(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarTiposPrioridade | `consultas.listarTiposPrioridade`}. */
  listarTiposPrioridade(params: SeiListarTiposPrioridadeParams): Promise<SeiTipoPrioridade[]> {
    return this.consultas.listarTiposPrioridade(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarSeries | `consultas.listarSeries`}. */
  listarSeries(params: SeiListarSeriesParams): Promise<SeiSerie[]> {
    return this.consultas.listarSeries(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarContatos | `consultas.listarContatos`}. */
  listarContatos(params: SeiListarContatosParams): Promise<SeiContato[]> {
    return this.consultas.listarContatos(params)
  }

  /** Atalho para {@link SeiConsultasClient.consultarProcedimento | `consultas.consultarProcedimento`}. */
  consultarProcedimento(
    params: SeiConsultarProcedimentoParams,
  ): Promise<SeiRetornoConsultaProcedimento | null> {
    return this.consultas.consultarProcedimento(params)
  }

  /** Atalho para {@link SeiConsultasClient.consultarProcedimentoIndividual | `consultas.consultarProcedimentoIndividual`}. */
  consultarProcedimentoIndividual(
    params: SeiConsultarProcedimentoIndividualParams,
  ): Promise<SeiProcedimentoResumido | null> {
    return this.consultas.consultarProcedimentoIndividual(params)
  }

  /** Atalho para {@link SeiConsultasClient.consultarDocumento | `consultas.consultarDocumento`}. */
  consultarDocumento(
    params: SeiConsultarDocumentoParams,
  ): Promise<SeiRetornoConsultaDocumento | null> {
    return this.consultas.consultarDocumento(params)
  }

  /** Atalho para {@link SeiConsultasClient.consultarBloco | `consultas.consultarBloco`}. */
  consultarBloco(params: SeiConsultarBlocoParams): Promise<SeiRetornoConsultaBloco | null> {
    return this.consultas.consultarBloco(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarExtensoesPermitidas | `consultas.listarExtensoesPermitidas`}. */
  listarExtensoesPermitidas(
    params: SeiListarExtensoesPermitidasParams,
  ): Promise<SeiArquivoExtensao[]> {
    return this.consultas.listarExtensoesPermitidas(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarUsuarios | `consultas.listarUsuarios`}. */
  listarUsuarios(params: SeiListarUsuariosParams): Promise<SeiUsuario[]> {
    return this.consultas.listarUsuarios(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarHipotesesLegais | `consultas.listarHipotesesLegais`}. */
  listarHipotesesLegais(params: SeiListarHipotesesLegaisParams): Promise<SeiHipoteseLegal[]> {
    return this.consultas.listarHipotesesLegais(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarTiposConferencia | `consultas.listarTiposConferencia`}. */
  listarTiposConferencia(params: SeiListarTiposConferenciaParams): Promise<SeiTipoConferencia[]> {
    return this.consultas.listarTiposConferencia(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarPaises | `consultas.listarPaises`}. */
  listarPaises(params: SeiListarPaisesParams): Promise<SeiPais[]> {
    return this.consultas.listarPaises(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarEstados | `consultas.listarEstados`}. */
  listarEstados(params: SeiListarEstadosParams): Promise<SeiEstado[]> {
    return this.consultas.listarEstados(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarCidades | `consultas.listarCidades`}. */
  listarCidades(params: SeiListarCidadesParams): Promise<SeiCidade[]> {
    return this.consultas.listarCidades(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarTiposProcedimentoOuvidoria | `consultas.listarTiposProcedimentoOuvidoria`}. */
  listarTiposProcedimentoOuvidoria(): Promise<SeiTipoProcedimento[]> {
    return this.consultas.listarTiposProcedimentoOuvidoria()
  }

  /** Atalho para {@link SeiConsultasClient.listarCargos | `consultas.listarCargos`}. */
  listarCargos(params: SeiListarCargosParams): Promise<SeiCargo[]> {
    return this.consultas.listarCargos(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarAndamentos | `consultas.listarAndamentos`}. */
  listarAndamentos(params: SeiListarAndamentosParams): Promise<SeiAndamento[]> {
    return this.consultas.listarAndamentos(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarMarcadoresUnidade | `consultas.listarMarcadoresUnidade`}. */
  listarMarcadoresUnidade(params: SeiListarMarcadoresUnidadeParams): Promise<SeiMarcador[]> {
    return this.consultas.listarMarcadoresUnidade(params)
  }

  /** Atalho para {@link SeiConsultasClient.consultarPublicacao | `consultas.consultarPublicacao`}. */
  consultarPublicacao(
    params: SeiConsultarPublicacaoParams,
  ): Promise<SeiRetornoConsultaPublicacao | null> {
    return this.consultas.consultarPublicacao(params)
  }

  /** Atalho para {@link SeiConsultasClient.listarFeriados | `consultas.listarFeriados`}. */
  listarFeriados(params: SeiListarFeriadosParams): Promise<SeiFeriado[]> {
    return this.consultas.listarFeriados(params)
  }

  // ── Atalhos de operação ──────────────────────────────────────────────────

  /** Atalho para {@link SeiOperacoesClient.gerarProcedimento | `operacoes.gerarProcedimento`}. */
  gerarProcedimento(
    params: SeiGerarProcedimentoParams,
  ): Promise<SeiRetornoGeracaoProcedimento | null> {
    return this.operacoes.gerarProcedimento(params)
  }

  /** Atalho para {@link SeiOperacoesClient.incluirDocumento | `operacoes.incluirDocumento`}. */
  incluirDocumento(params: SeiIncluirDocumentoParams): Promise<SeiRetornoInclusaoDocumento | null> {
    return this.operacoes.incluirDocumento(params)
  }

  /** Atalho para {@link SeiOperacoesClient.enviarProcesso | `operacoes.enviarProcesso`}. */
  enviarProcesso(params: SeiEnviarProcessoParams): Promise<string> {
    return this.operacoes.enviarProcesso(params)
  }

  /** Atalho para {@link SeiOperacoesClient.concluirProcesso | `operacoes.concluirProcesso`}. */
  concluirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    return this.operacoes.concluirProcesso(params)
  }

  /** Atalho para {@link SeiOperacoesClient.reabrirProcesso | `operacoes.reabrirProcesso`}. */
  reabrirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    return this.operacoes.reabrirProcesso(params)
  }

  /** Atalho para {@link SeiOperacoesClient.lancarAndamento | `operacoes.lancarAndamento`}. */
  lancarAndamento(params: SeiLancarAndamentoParams): Promise<SeiAndamento | null> {
    return this.operacoes.lancarAndamento(params)
  }

  /** Atalho para {@link SeiOperacoesClient.enviarEmail | `operacoes.enviarEmail`}. */
  enviarEmail(params: SeiEnviarEmailParams): Promise<SeiRetornoEnvioEmail | null> {
    return this.operacoes.enviarEmail(params)
  }
}

/**
 * Cria uma instância de {@link SeiClient} com a configuração fornecida.
 *
 * @example
 * ```ts
 * import { createSeiClient } from "@anpdgovbr/sei-client"
 *
 * const sei = createSeiClient({
 *   endpointUrl: process.env.SEI_SOAP_ENDPOINT!,
 *   siglaSistema: "SGI",
 *   identificacaoServico: process.env.SEI_IDENTIFICACAO_SERVICO!,
 *   requestTimeoutMs: 30_000,
 * })
 * ```
 * @category Cliente
 */
export const createSeiClient = (config: SeiConfig): SeiClient => new SeiClient(config)
