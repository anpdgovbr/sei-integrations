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
 * @category Client
 */
export class SeiConsultasClient {
  /** @param config - Configuração de conexão com o SEI. */
  constructor(private readonly config: SeiConfig) {}

  async listarUnidades(params: SeiListarUnidadesParams): Promise<SeiUnidade[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarUnidades",
      params: {
        ...createBaseParams(this.config, params.idUnidade),
        IdTipoProcedimento: params.idTipoProcedimento ?? null,
        IdSerie: params.idSerie ?? null,
      },
    })
    return mapUnidades(payload)
  }

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

  async listarTiposPrioridade(
    params: SeiListarTiposPrioridadeParams,
  ): Promise<SeiTipoPrioridade[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposPrioridade",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapTiposPrioridade(payload)
  }

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

  async listarTiposConferencia(
    params: SeiListarTiposConferenciaParams,
  ): Promise<SeiTipoConferencia[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarTiposConferencia",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapTiposConferencia(payload)
  }

  async listarPaises(params: SeiListarPaisesParams): Promise<SeiPais[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarPaises",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapPaises(payload)
  }

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

  async listarMarcadoresUnidade(params: SeiListarMarcadoresUnidadeParams): Promise<SeiMarcador[]> {
    const payload = await callSeiSoap(this.config, {
      operation: "listarMarcadoresUnidade",
      params: createBaseParams(this.config, params.idUnidade),
    })
    return mapMarcadores(payload)
  }

  async listarAndamentosMarcadores(
    params: SeiListarAndamentosMarcadoresParams,
  ): Promise<ReturnType<typeof mapAndamentosMarcadores>> {
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
 * @category Client
 */
export class SeiOperacoesClient {
  constructor(private readonly config: SeiConfig) {}

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
 * @category Client
 */
export class SeiClient {
  readonly consultas: SeiConsultasClient
  readonly operacoes: SeiOperacoesClient

  constructor(config: SeiConfig) {
    this.consultas = new SeiConsultasClient(config)
    this.operacoes = new SeiOperacoesClient(config)
  }

  // ── Atalhos de consulta ──────────────────────────────────────────────────

  listarUnidades(params: SeiListarUnidadesParams): Promise<SeiUnidade[]> {
    return this.consultas.listarUnidades(params)
  }

  listarTiposProcedimento(
    params: SeiListarTiposProcedimentoParams,
  ): Promise<SeiTipoProcedimento[]> {
    return this.consultas.listarTiposProcedimento(params)
  }

  listarTiposPrioridade(params: SeiListarTiposPrioridadeParams): Promise<SeiTipoPrioridade[]> {
    return this.consultas.listarTiposPrioridade(params)
  }

  listarSeries(params: SeiListarSeriesParams): Promise<SeiSerie[]> {
    return this.consultas.listarSeries(params)
  }

  listarContatos(params: SeiListarContatosParams): Promise<SeiContato[]> {
    return this.consultas.listarContatos(params)
  }

  consultarProcedimento(
    params: SeiConsultarProcedimentoParams,
  ): Promise<SeiRetornoConsultaProcedimento | null> {
    return this.consultas.consultarProcedimento(params)
  }

  consultarProcedimentoIndividual(
    params: SeiConsultarProcedimentoIndividualParams,
  ): Promise<SeiProcedimentoResumido | null> {
    return this.consultas.consultarProcedimentoIndividual(params)
  }

  consultarDocumento(
    params: SeiConsultarDocumentoParams,
  ): Promise<SeiRetornoConsultaDocumento | null> {
    return this.consultas.consultarDocumento(params)
  }

  consultarBloco(params: SeiConsultarBlocoParams): Promise<SeiRetornoConsultaBloco | null> {
    return this.consultas.consultarBloco(params)
  }

  listarExtensoesPermitidas(
    params: SeiListarExtensoesPermitidasParams,
  ): Promise<SeiArquivoExtensao[]> {
    return this.consultas.listarExtensoesPermitidas(params)
  }

  listarUsuarios(params: SeiListarUsuariosParams): Promise<SeiUsuario[]> {
    return this.consultas.listarUsuarios(params)
  }

  listarHipotesesLegais(params: SeiListarHipotesesLegaisParams): Promise<SeiHipoteseLegal[]> {
    return this.consultas.listarHipotesesLegais(params)
  }

  listarTiposConferencia(params: SeiListarTiposConferenciaParams): Promise<SeiTipoConferencia[]> {
    return this.consultas.listarTiposConferencia(params)
  }

  listarPaises(params: SeiListarPaisesParams): Promise<SeiPais[]> {
    return this.consultas.listarPaises(params)
  }

  listarEstados(params: SeiListarEstadosParams): Promise<SeiEstado[]> {
    return this.consultas.listarEstados(params)
  }

  listarCidades(params: SeiListarCidadesParams): Promise<SeiCidade[]> {
    return this.consultas.listarCidades(params)
  }

  listarTiposProcedimentoOuvidoria(): Promise<SeiTipoProcedimento[]> {
    return this.consultas.listarTiposProcedimentoOuvidoria()
  }

  listarCargos(params: SeiListarCargosParams): Promise<SeiCargo[]> {
    return this.consultas.listarCargos(params)
  }

  listarAndamentos(params: SeiListarAndamentosParams): Promise<SeiAndamento[]> {
    return this.consultas.listarAndamentos(params)
  }

  listarMarcadoresUnidade(params: SeiListarMarcadoresUnidadeParams): Promise<SeiMarcador[]> {
    return this.consultas.listarMarcadoresUnidade(params)
  }

  consultarPublicacao(
    params: SeiConsultarPublicacaoParams,
  ): Promise<SeiRetornoConsultaPublicacao | null> {
    return this.consultas.consultarPublicacao(params)
  }

  listarFeriados(params: SeiListarFeriadosParams): Promise<SeiFeriado[]> {
    return this.consultas.listarFeriados(params)
  }

  // ── Atalhos de operação ──────────────────────────────────────────────────

  gerarProcedimento(
    params: SeiGerarProcedimentoParams,
  ): Promise<SeiRetornoGeracaoProcedimento | null> {
    return this.operacoes.gerarProcedimento(params)
  }

  incluirDocumento(params: SeiIncluirDocumentoParams): Promise<SeiRetornoInclusaoDocumento | null> {
    return this.operacoes.incluirDocumento(params)
  }

  enviarProcesso(params: SeiEnviarProcessoParams): Promise<string> {
    return this.operacoes.enviarProcesso(params)
  }

  concluirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    return this.operacoes.concluirProcesso(params)
  }

  reabrirProcesso(params: SeiOperacaoProcessoParams): Promise<string> {
    return this.operacoes.reabrirProcesso(params)
  }

  lancarAndamento(params: SeiLancarAndamentoParams): Promise<SeiAndamento | null> {
    return this.operacoes.lancarAndamento(params)
  }

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
 * @category Client
 */
export const createSeiClient = (config: SeiConfig): SeiClient => new SeiClient(config)
