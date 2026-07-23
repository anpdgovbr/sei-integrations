/**
 * @packageDocumentation
 *
 * Funções de mapeamento de respostas SOAP do SEI para entidades de domínio.
 *
 * Este módulo converte os valores brutos ({@link SeiRawValue}) normalizados
 * por {@link index!parseSeiSoapResponse | parseSeiSoapResponse} nas entidades
 * tipadas expostas pelo pacote.
 *
 * O SEI serializa respostas como structs SOAP nomeados (campos PascalCase
 * correspondendo aos elementos do WSDL), diferente do SIP que usa arrays PHP
 * posicionais. Os mappers leem os campos pelo nome (ex.: `item.IdUnidade`).
 *
 * @categoryDescription Mapeadores
 * Funções que convertem respostas SOAP brutas em entidades de domínio tipadas.
 */
import type {
  SeiAndamento,
  SeiAndamentoMarcador,
  SeiArquivoExtensao,
  SeiAssinatura,
  SeiAssunto,
  SeiAtributoAndamento,
  SeiBloco,
  SeiCampo,
  SeiCargo,
  SeiCidade,
  SeiContato,
  SeiEstado,
  SeiFeriado,
  SeiHipoteseLegal,
  SeiInteressado,
  SeiMarcador,
  SeiObservacao,
  SeiPais,
  SeiProcedimentoResumido,
  SeiProtocoloBloco,
  SeiPublicacao,
  SeiPublicacaoImprensaNacional,
  SeiRawMap,
  SeiRawValue,
  SeiRetornoConsultaBloco,
  SeiRetornoConsultaDocumento,
  SeiRetornoConsultaProcedimento,
  SeiRetornoConsultaPublicacao,
  SeiRetornoEnvioEmail,
  SeiRetornoGeracaoProcedimento,
  SeiRetornoInclusaoDocumento,
  SeiSerie,
  SeiTipoConferencia,
  SeiTipoPrioridade,
  SeiTipoProcedimento,
  SeiUnidade,
  SeiUnidadeProcedimentoAberto,
  SeiUsuario,
} from "./types"

import { asArray, boolFromSin, isMap, requiredString, stringValue } from "@anpdgovbr/sei-sip-soap"

/**
 * Mapeia itens de uma lista SOAP para o tipo `T` usando o mapper fornecido.
 * @internal
 */
const mapItems = <T>(value: SeiRawValue, mapper: (item: SeiRawMap) => T): T[] =>
  asArray(value).filter(isMap).map(mapper)

// ─── Mappers de entidades simples ─────────────────────────────────────────────

/** @internal */
const mapUnidadeFromMap = (item: SeiRawMap): SeiUnidade => ({
  idUnidade: requiredString(item.IdUnidade ?? null, "Unidade.IdUnidade"),
  sigla: requiredString(item.Sigla ?? null, "Unidade.Sigla"),
  descricao: stringValue(item.Descricao ?? null) ?? "",
  sinProtocolo: boolFromSin(item.SinProtocolo ?? null),
  sinArquivamento: boolFromSin(item.SinArquivamento ?? null),
  sinOuvidoria: boolFromSin(item.SinOuvidoria ?? null),
})

/** @internal */
const mapUnidadeOrNull = (value: SeiRawValue): SeiUnidade | null => {
  if (!isMap(value)) {
    return null
  }
  return mapUnidadeFromMap(value)
}

/** @internal */
const mapUsuarioFromMap = (item: SeiRawMap): SeiUsuario => ({
  idUsuario: requiredString(item.IdUsuario ?? null, "Usuario.IdUsuario"),
  sigla: requiredString(item.Sigla ?? null, "Usuario.Sigla"),
  nome: requiredString(item.Nome ?? null, "Usuario.Nome"),
})

/** @internal */
const mapUsuarioOrNull = (value: SeiRawValue): SeiUsuario | null => {
  if (!isMap(value)) {
    return null
  }
  return mapUsuarioFromMap(value)
}

/** @internal */
const mapTipoProcedimentoFromMap = (item: SeiRawMap): SeiTipoProcedimento => ({
  idTipoProcedimento: requiredString(
    item.IdTipoProcedimento ?? null,
    "TipoProcedimento.IdTipoProcedimento",
  ),
  nome: requiredString(item.Nome ?? null, "TipoProcedimento.Nome"),
  sinOuvidoriaAnonimo: boolFromSin(item.SinOuvidoriaAnonimo ?? null),
})

/** @internal */
const mapTipoPrioridadeFromMap = (item: SeiRawMap): SeiTipoPrioridade => ({
  idTipoPrioridade: requiredString(
    item.IdTipoPrioridade ?? null,
    "TipoPrioridade.IdTipoPrioridade",
  ),
  nome: requiredString(item.Nome ?? null, "TipoPrioridade.Nome"),
})

/** @internal */
const mapSerieFromMap = (item: SeiRawMap): SeiSerie => ({
  idSerie: requiredString(item.IdSerie ?? null, "Serie.IdSerie"),
  nome: requiredString(item.Nome ?? null, "Serie.Nome"),
  aplicabilidade: stringValue(item.Aplicabilidade ?? null),
})

/** @internal */
const mapInteressadoFromMap = (item: SeiRawMap): SeiInteressado => ({
  idContato: stringValue(item.IdContato ?? null),
  cpf: stringValue(item.Cpf ?? null),
  cnpj: stringValue(item.Cnpj ?? null),
  sigla: stringValue(item.Sigla ?? null),
  nome: stringValue(item.Nome ?? null),
})

/** @internal */
const mapAtributoAndamentoFromMap = (item: SeiRawMap): SeiAtributoAndamento => ({
  nome: requiredString(item.Nome ?? null, "AtributoAndamento.Nome"),
  valor: stringValue(item.Valor ?? null) ?? "",
  idOrigem: stringValue(item.IdOrigem ?? null) ?? "",
})

/** @internal */
const mapAndamentoFromMap = (item: SeiRawMap): SeiAndamento => {
  const unidade = mapUnidadeOrNull(item.Unidade ?? null)
  const usuario = mapUsuarioOrNull(item.Usuario ?? null)
  return {
    idAndamento: stringValue(item.IdAndamento ?? null),
    idTarefa: stringValue(item.IdTarefa ?? null),
    idTarefaModulo: stringValue(item.IdTarefaModulo ?? null),
    descricao: stringValue(item.Descricao ?? null) ?? "",
    dataHora: stringValue(item.DataHora ?? null) ?? "",
    unidade: unidade ?? {
      idUnidade: "",
      sigla: "",
      descricao: "",
      sinProtocolo: false,
      sinArquivamento: false,
      sinOuvidoria: false,
    },
    usuario: usuario ?? { idUsuario: "", sigla: "", nome: "" },
    atributos: mapItems(item.Atributos ?? null, mapAtributoAndamentoFromMap),
  }
}

/** @internal */
const mapAndamentoOrNull = (value: SeiRawValue): SeiAndamento | null => {
  if (!isMap(value)) {
    return null
  }
  return mapAndamentoFromMap(value)
}

/** @internal */
const mapAssinaturaFromMap = (item: SeiRawMap): SeiAssinatura => ({
  nome: stringValue(item.Nome ?? null) ?? "",
  cargoFuncao: stringValue(item.CargoFuncao ?? null) ?? "",
  dataHora: stringValue(item.DataHora ?? null) ?? "",
  idUsuario: stringValue(item.IdUsuario ?? null) ?? "",
  idOrigem: stringValue(item.IdOrigem ?? null) ?? "",
  idOrgao: stringValue(item.IdOrgao ?? null) ?? "",
  sigla: stringValue(item.Sigla ?? null) ?? "",
})

/** @internal */
const mapCampoFromMap = (item: SeiRawMap): SeiRetornoInclusaoDocumento => ({
  idDocumento: requiredString(item.IdDocumento ?? null, "RetornoInclusaoDocumento.IdDocumento"),
  documentoFormatado: stringValue(item.DocumentoFormatado ?? null) ?? "",
  linkAcesso: stringValue(item.LinkAcesso ?? null) ?? "",
})

/** @internal */
const mapObservacaoFromMap = (item: SeiRawMap): SeiObservacao => ({
  descricao: stringValue(item.Descricao ?? null) ?? "",
  unidade: mapUnidadeOrNull(item.Unidade ?? null) ?? {
    idUnidade: "",
    sigla: "",
    descricao: "",
    sinProtocolo: false,
    sinArquivamento: false,
    sinOuvidoria: false,
  },
})

/** @internal */
const mapUnidadeProcedimentoAbertoFromMap = (item: SeiRawMap): SeiUnidadeProcedimentoAberto => ({
  unidade: mapUnidadeOrNull(item.Unidade ?? null) ?? {
    idUnidade: "",
    sigla: "",
    descricao: "",
    sinProtocolo: false,
    sinArquivamento: false,
    sinOuvidoria: false,
  },
  usuarioAtribuicao: mapUsuarioOrNull(item.UsuarioAtribuicao ?? null) ?? {
    idUsuario: "",
    sigla: "",
    nome: "",
  },
})

/** @internal */
const mapProcedimentoResumidoFromMap = (item: SeiRawMap): SeiProcedimentoResumido => {
  const tipoProcMap = isMap(item.TipoProcedimento ?? null)
    ? (item.TipoProcedimento as SeiRawMap)
    : null
  return {
    idProcedimento: requiredString(
      item.IdProcedimento ?? null,
      "ProcedimentoResumido.IdProcedimento",
    ),
    procedimentoFormatado: stringValue(item.ProcedimentoFormatado ?? null) ?? "",
    tipoProcedimento: tipoProcMap
      ? mapTipoProcedimentoFromMap(tipoProcMap)
      : { idTipoProcedimento: "", nome: "", sinOuvidoriaAnonimo: false },
  }
}

/** @internal */
const mapProtocoloBlocoFromMap = (item: SeiRawMap): SeiProtocoloBloco => ({
  protocoloFormatado: stringValue(item.ProtocoloFormatado ?? null) ?? "",
  identificacao: stringValue(item.Identificacao ?? null) ?? "",
  assinaturas: mapItems(item.Assinaturas ?? null, mapAssinaturaFromMap),
})

/** @internal */
const mapBlocoFromMap = (item: SeiRawMap): SeiBloco => ({
  idBloco: requiredString(item.IdBloco ?? null, "Bloco.IdBloco"),
  unidade: mapUnidadeOrNull(item.Unidade ?? null) ?? {
    idUnidade: "",
    sigla: "",
    descricao: "",
    sinProtocolo: false,
    sinArquivamento: false,
    sinOuvidoria: false,
  },
  usuario: mapUsuarioOrNull(item.Usuario ?? null) ?? { idUsuario: "", sigla: "", nome: "" },
  descricao: stringValue(item.Descricao ?? null) ?? "",
  tipo: stringValue(item.Tipo ?? null) ?? "",
  estado: stringValue(item.Estado ?? null) ?? "",
  sinPrioridade: boolFromSin(item.SinPrioridade ?? null),
  sinRevisao: boolFromSin(item.SinRevisao ?? null),
  usuarioAtribuicao: mapUsuarioOrNull(item.UsuarioAtribuicao ?? null) ?? {
    idUsuario: "",
    sigla: "",
    nome: "",
  },
  unidadesDisponibilizacao: mapItems(item.UnidadesDisponibilizacao ?? null, mapUnidadeFromMap),
})

/** @internal */
const mapPublicacaoImprensaNacionalFromMap = (item: SeiRawMap): SeiPublicacaoImprensaNacional => ({
  idVeiculo: stringValue(item.IdVeiculo ?? null),
  siglaVeiculo: stringValue(item.SiglaVeiculo ?? null),
  descricaoVeiculo: stringValue(item.DescricaoVeiculo ?? null),
  pagina: stringValue(item.Pagina ?? null) ?? "",
  idSecao: stringValue(item.IdSecao ?? null),
  secao: stringValue(item.Secao ?? null),
  data: stringValue(item.Data ?? null) ?? "",
})

/** @internal */
const mapPublicacaoFromMap = (item: SeiRawMap): SeiPublicacao => {
  const imprensaMap = isMap(item.ImprensaNacional ?? null)
    ? (item.ImprensaNacional as SeiRawMap)
    : null
  return {
    idPublicacao: stringValue(item.IdPublicacao ?? null),
    idDocumento: stringValue(item.IdDocumento ?? null),
    staMotivo: stringValue(item.StaMotivo ?? null),
    resumo: stringValue(item.Resumo ?? null),
    idVeiculoPublicacao: stringValue(item.IdVeiculoPublicacao ?? null),
    nomeVeiculo: stringValue(item.NomeVeiculo ?? null) ?? "",
    staTipoVeiculo: stringValue(item.StaTipoVeiculo ?? null),
    numero: stringValue(item.Numero ?? null) ?? "",
    dataDisponibilizacao: stringValue(item.DataDisponibilizacao ?? null) ?? "",
    dataPublicacao: stringValue(item.DataPublicacao ?? null) ?? "",
    estado: stringValue(item.Estado ?? null) ?? "",
    imprensaNacional: imprensaMap
      ? mapPublicacaoImprensaNacionalFromMap(imprensaMap)
      : {
          idVeiculo: null,
          siglaVeiculo: null,
          descricaoVeiculo: null,
          pagina: "",
          idSecao: null,
          secao: null,
          data: "",
        },
  }
}

/** @internal */
const mapPublicacaoOrNull = (value: SeiRawValue): SeiPublicacao | null => {
  if (!isMap(value)) {
    return null
  }
  return mapPublicacaoFromMap(value)
}

// ─── Mappers públicos ─────────────────────────────────────────────────────────

/**
 * Converte o payload de `listarUnidades` em uma lista de {@link SeiUnidade}.
 *
 * @param value - Payload normalizado retornado por
 *   {@link index!parseSeiSoapResponse | parseSeiSoapResponse} para a operação
 *   `listarUnidades`.
 * @returns Lista de unidades, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarUnidades | SeiConsultasClient.listarUnidades}
 * @category Mapeadores
 */
export const mapUnidades = (value: SeiRawValue): SeiUnidade[] => mapItems(value, mapUnidadeFromMap)

/**
 * Converte o payload de `listarTiposProcedimento` em lista de {@link SeiTipoProcedimento}.
 *
 * @param value - Payload normalizado para a operação `listarTiposProcedimento`.
 * @returns Lista de tipos de procedimento, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarTiposProcedimento | SeiConsultasClient.listarTiposProcedimento}
 * @category Mapeadores
 */
export const mapTiposProcedimento = (value: SeiRawValue): SeiTipoProcedimento[] =>
  mapItems(value, mapTipoProcedimentoFromMap)

/**
 * Converte o payload de `listarTiposPrioridade` em lista de {@link SeiTipoPrioridade}.
 *
 * @param value - Payload normalizado para a operação `listarTiposPrioridade`.
 * @returns Lista de tipos de prioridade, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarTiposPrioridade | SeiConsultasClient.listarTiposPrioridade}
 * @category Mapeadores
 */
export const mapTiposPrioridade = (value: SeiRawValue): SeiTipoPrioridade[] =>
  mapItems(value, mapTipoPrioridadeFromMap)

/**
 * Converte o payload de `listarSeries` em lista de {@link SeiSerie}.
 *
 * @param value - Payload normalizado para a operação `listarSeries`.
 * @returns Lista de séries documentais, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarSeries | SeiConsultasClient.listarSeries}
 * @category Mapeadores
 */
export const mapSeries = (value: SeiRawValue): SeiSerie[] => mapItems(value, mapSerieFromMap)

/**
 * Converte o payload de `listarContatos` em lista de {@link SeiContato}.
 *
 * @param value - Payload normalizado para a operação `listarContatos`.
 * @returns Lista de contatos, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarContatos | SeiConsultasClient.listarContatos}
 * @category Mapeadores
 */
export const mapContatos = (value: SeiRawValue): SeiContato[] =>
  mapItems(value, (item): SeiContato => ({
    staOperacao: stringValue(item.StaOperacao ?? null),
    idContato: requiredString(item.IdContato ?? null, "Contato.IdContato"),
    idTipoContato: stringValue(item.IdTipoContato ?? null) ?? "",
    nomeTipoContato: stringValue(item.NomeTipoContato ?? null),
    sigla: stringValue(item.Sigla ?? null) ?? "",
    nome: stringValue(item.Nome ?? null) ?? "",
    nomeSocial: stringValue(item.NomeSocial ?? null),
    staNatureza: stringValue(item.StaNatureza ?? null) ?? "",
    idContatoAssociado: stringValue(item.IdContatoAssociado ?? null),
    nomeContatoAssociado: stringValue(item.NomeContatoAssociado ?? null),
    sinEnderecoAssociado: boolFromSin(item.SinEnderecoAssociado ?? null),
    cnpjAssociado: stringValue(item.CnpjAssociado ?? null),
    endereco: stringValue(item.Endereco ?? null) ?? "",
    complemento: stringValue(item.Complemento ?? null) ?? "",
    bairro: stringValue(item.Bairro ?? null) ?? "",
    idCidade: stringValue(item.IdCidade ?? null),
    nomeCidade: stringValue(item.NomeCidade ?? null),
    idEstado: stringValue(item.IdEstado ?? null),
    siglaEstado: stringValue(item.SiglaEstado ?? null),
    idPais: stringValue(item.IdPais ?? null),
    nomePais: stringValue(item.NomePais ?? null),
    cep: stringValue(item.Cep ?? null) ?? "",
    staGenero: stringValue(item.StaGenero ?? null) ?? "",
    idCargo: stringValue(item.IdCargo ?? null),
    expressaoCargo: stringValue(item.ExpressaoCargo ?? null),
    expressaoTratamento: stringValue(item.ExpressaoTratamento ?? null),
    expressaoVocativo: stringValue(item.ExpressaoVocativo ?? null),
    cpf: stringValue(item.Cpf ?? null) ?? "",
    cnpj: stringValue(item.Cnpj ?? null) ?? "",
    rg: stringValue(item.Rg ?? null) ?? "",
    orgaoExpedidor: stringValue(item.OrgaoExpedidor ?? null) ?? "",
    numeroPassaporte: stringValue(item.NumeroPassaporte ?? null),
    idPaisPassaporte: stringValue(item.IdPaisPassaporte ?? null),
    nomePaisPassaporte: stringValue(item.NomePaisPassaporte ?? null),
    matricula: stringValue(item.Matricula ?? null) ?? "",
    matriculaOab: stringValue(item.MatriculaOab ?? null) ?? "",
    telefoneComercial: stringValue(item.TelefoneComercial ?? null) ?? "",
    telefoneResidencial: stringValue(item.TelefoneResidencial ?? null) ?? "",
    telefoneCelular: stringValue(item.TelefoneCelular ?? null) ?? "",
    dataNascimento: stringValue(item.DataNascimento ?? null) ?? "",
    email: stringValue(item.Email ?? null) ?? "",
    sitioInternet: stringValue(item.SitioInternet ?? null) ?? "",
    observacao: stringValue(item.Observacao ?? null) ?? "",
    conjuge: stringValue(item.Conjuge ?? null),
    funcao: stringValue(item.Funcao ?? null),
    idTitulo: stringValue(item.IdTitulo ?? null),
    expressaoTitulo: stringValue(item.ExpressaoTitulo ?? null),
    abreviaturaTitulo: stringValue(item.AbreviaturaTitulo ?? null),
    sinAtivo: boolFromSin(item.SinAtivo ?? null),
    idCategoria: stringValue(item.IdCategoria ?? null),
    idNomeCategoria: stringValue(item.IdNomeCategoria ?? null),
  }))

/**
 * Converte o payload de `listarExtensoesPermitidas` em lista de {@link SeiArquivoExtensao}.
 *
 * @param value - Payload normalizado para a operação `listarExtensoesPermitidas`.
 * @returns Lista de extensões de arquivo aceitas, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarExtensoesPermitidas | SeiConsultasClient.listarExtensoesPermitidas}
 * @category Mapeadores
 */
export const mapArquivosExtensao = (value: SeiRawValue): SeiArquivoExtensao[] =>
  mapItems(value, (item) => ({
    idArquivoExtensao: requiredString(
      item.IdArquivoExtensao ?? null,
      "ArquivoExtensao.IdArquivoExtensao",
    ),
    extensao: requiredString(item.Extensao ?? null, "ArquivoExtensao.Extensao"),
    descricao: stringValue(item.Descricao ?? null) ?? "",
  }))

/**
 * Converte o payload de `listarUsuarios` em lista de {@link SeiUsuario}.
 *
 * @param value - Payload normalizado para a operação `listarUsuarios`.
 * @returns Lista de usuários, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarUsuarios | SeiConsultasClient.listarUsuarios}
 * @category Mapeadores
 */
export const mapUsuarios = (value: SeiRawValue): SeiUsuario[] => mapItems(value, mapUsuarioFromMap)

/**
 * Converte o payload de `listarHipotesesLegais` em lista de {@link SeiHipoteseLegal}.
 *
 * @param value - Payload normalizado para a operação `listarHipotesesLegais`.
 * @returns Lista de hipóteses legais, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarHipotesesLegais | SeiConsultasClient.listarHipotesesLegais}
 * @category Mapeadores
 */
export const mapHipotesesLegais = (value: SeiRawValue): SeiHipoteseLegal[] =>
  mapItems(value, (item) => ({
    idHipoteseLegal: requiredString(item.IdHipoteseLegal ?? null, "HipoteseLegal.IdHipoteseLegal"),
    nome: requiredString(item.Nome ?? null, "HipoteseLegal.Nome"),
    baseLegal: stringValue(item.BaseLegal ?? null) ?? "",
    nivelAcesso: stringValue(item.NivelAcesso ?? null) ?? "",
  }))

/**
 * Converte o payload de `listarTiposConferencia` em lista de {@link SeiTipoConferencia}.
 *
 * @param value - Payload normalizado para a operação `listarTiposConferencia`.
 * @returns Lista de tipos de conferência, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarTiposConferencia | SeiConsultasClient.listarTiposConferencia}
 * @category Mapeadores
 */
export const mapTiposConferencia = (value: SeiRawValue): SeiTipoConferencia[] =>
  mapItems(value, (item) => ({
    idTipoConferencia: requiredString(
      item.IdTipoConferencia ?? null,
      "TipoConferencia.IdTipoConferencia",
    ),
    descricao: requiredString(item.Descricao ?? null, "TipoConferencia.Descricao"),
  }))

/**
 * Converte o payload de `listarPaises` em lista de {@link SeiPais}.
 *
 * @param value - Payload normalizado para a operação `listarPaises`.
 * @returns Lista de países, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarPaises | SeiConsultasClient.listarPaises}
 * @category Mapeadores
 */
export const mapPaises = (value: SeiRawValue): SeiPais[] =>
  mapItems(value, (item) => ({
    idPais: requiredString(item.IdPais ?? null, "Pais.IdPais"),
    nome: requiredString(item.Nome ?? null, "Pais.Nome"),
  }))

/**
 * Converte o payload de `listarEstados` em lista de {@link SeiEstado}.
 *
 * @param value - Payload normalizado para a operação `listarEstados`.
 * @returns Lista de estados, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarEstados | SeiConsultasClient.listarEstados}
 * @category Mapeadores
 */
export const mapEstados = (value: SeiRawValue): SeiEstado[] =>
  mapItems(value, (item) => ({
    idEstado: requiredString(item.IdEstado ?? null, "Estado.IdEstado"),
    idPais: stringValue(item.IdPais ?? null) ?? "",
    sigla: requiredString(item.Sigla ?? null, "Estado.Sigla"),
    nome: requiredString(item.Nome ?? null, "Estado.Nome"),
    codigoIbge: stringValue(item.CodigoIbge ?? null) ?? "",
  }))

/**
 * Converte o payload de `listarCidades` em lista de {@link SeiCidade}.
 *
 * @param value - Payload normalizado para a operação `listarCidades`.
 * @returns Lista de cidades, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarCidades | SeiConsultasClient.listarCidades}
 * @category Mapeadores
 */
export const mapCidades = (value: SeiRawValue): SeiCidade[] =>
  mapItems(value, (item) => ({
    idCidade: requiredString(item.IdCidade ?? null, "Cidade.IdCidade"),
    idEstado: stringValue(item.IdEstado ?? null) ?? "",
    idPais: stringValue(item.IdPais ?? null) ?? "",
    nome: requiredString(item.Nome ?? null, "Cidade.Nome"),
    codigoIbge: stringValue(item.CodigoIbge ?? null) ?? "",
    sinCapital: boolFromSin(item.SinCapital ?? null),
    latitude: stringValue(item.Latitude ?? null) ?? "",
    longitude: stringValue(item.Longitude ?? null) ?? "",
  }))

/**
 * Converte o payload de `listarCargos` em lista de {@link SeiCargo}.
 *
 * @param value - Payload normalizado para a operação `listarCargos`.
 * @returns Lista de cargos, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarCargos | SeiConsultasClient.listarCargos}
 * @category Mapeadores
 */
export const mapCargos = (value: SeiRawValue): SeiCargo[] =>
  mapItems(value, (item) => ({
    idCargo: requiredString(item.IdCargo ?? null, "Cargo.IdCargo"),
    expressaoCargo: stringValue(item.ExpressaoCargo ?? null) ?? "",
    expressaoTratamento: stringValue(item.ExpressaoTratamento ?? null) ?? "",
    expressaoVocativo: stringValue(item.ExpressaoVocativo ?? null) ?? "",
  }))

/**
 * Converte o payload de `listarAndamentos` em lista de {@link SeiAndamento}.
 *
 * @param value - Payload normalizado para a operação `listarAndamentos`.
 * @returns Lista de andamentos, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarAndamentos | SeiConsultasClient.listarAndamentos}
 * @category Mapeadores
 */
export const mapAndamentos = (value: SeiRawValue): SeiAndamento[] =>
  mapItems(value, mapAndamentoFromMap)

/**
 * Converte o payload de `listarMarcadoresUnidade` em lista de {@link SeiMarcador}.
 *
 * @param value - Payload normalizado para a operação `listarMarcadoresUnidade`.
 * @returns Lista de marcadores da unidade, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarMarcadoresUnidade | SeiConsultasClient.listarMarcadoresUnidade}
 * @category Mapeadores
 */
export const mapMarcadores = (value: SeiRawValue): SeiMarcador[] =>
  mapItems(value, (item) => ({
    idMarcador: requiredString(item.IdMarcador ?? null, "Marcador.IdMarcador"),
    nome: requiredString(item.Nome ?? null, "Marcador.Nome"),
    icone: stringValue(item.Icone ?? null) ?? "",
    sinAtivo: boolFromSin(item.SinAtivo ?? null),
  }))

/**
 * Converte o payload de `listarAndamentosMarcadores` em lista de {@link SeiAndamentoMarcador}.
 *
 * @param value - Payload normalizado para a operação `listarAndamentosMarcadores`.
 * @returns Lista de andamentos com marcadores, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarAndamentosMarcadores | SeiConsultasClient.listarAndamentosMarcadores}
 * @category Mapeadores
 */
export const mapAndamentosMarcadores = (value: SeiRawValue): SeiAndamentoMarcador[] =>
  mapItems(value, (item) => {
    const marcadorMap = isMap(item.Marcador ?? null) ? (item.Marcador as SeiRawMap) : null
    return {
      idAndamentoMarcador: stringValue(item.IdAndamentoMarcador ?? null),
      texto: stringValue(item.Texto ?? null) ?? "",
      dataHora: stringValue(item.DataHora ?? null) ?? "",
      usuario: mapUsuarioOrNull(item.Usuario ?? null) ?? { idUsuario: "", sigla: "", nome: "" },
      marcador: marcadorMap
        ? {
            idMarcador: requiredString(marcadorMap.IdMarcador ?? null, "Marcador.IdMarcador"),
            nome: requiredString(marcadorMap.Nome ?? null, "Marcador.Nome"),
            icone: stringValue(marcadorMap.Icone ?? null) ?? "",
            sinAtivo: boolFromSin(marcadorMap.SinAtivo ?? null),
          }
        : { idMarcador: "", nome: "", icone: "", sinAtivo: false },
    }
  })

/**
 * Converte o payload de `listarFeriados` em lista de {@link SeiFeriado}.
 *
 * @param value - Payload normalizado para a operação `listarFeriados`.
 * @returns Lista de feriados, possivelmente vazia.
 * @see {@link index!SeiConsultasClient.listarFeriados | SeiConsultasClient.listarFeriados}
 * @category Mapeadores
 */
export const mapFeriados = (value: SeiRawValue): SeiFeriado[] =>
  mapItems(value, (item) => ({
    data: requiredString(item.Data ?? null, "Feriado.Data"),
    descricao: stringValue(item.Descricao ?? null) ?? "",
  }))

/**
 * Converte o payload de `gerarProcedimento` em {@link SeiRetornoGeracaoProcedimento}.
 *
 * @param value - Payload normalizado para a operação `gerarProcedimento`.
 * @returns Os dados do processo criado, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiOperacoesClient.gerarProcedimento | SeiOperacoesClient.gerarProcedimento}
 * @category Mapeadores
 */
export const mapRetornoGeracaoProcedimento = (
  value: SeiRawValue,
): SeiRetornoGeracaoProcedimento | null => {
  if (!isMap(value)) {
    return null
  }
  return {
    idProcedimento: requiredString(
      value.IdProcedimento ?? null,
      "RetornoGeracaoProcedimento.IdProcedimento",
    ),
    procedimentoFormatado: stringValue(value.ProcedimentoFormatado ?? null) ?? "",
    linkAcesso: stringValue(value.LinkAcesso ?? null) ?? "",
    retornoInclusaoDocumentos: mapItems(value.RetornoInclusaoDocumentos ?? null, mapCampoFromMap),
  }
}

/**
 * Converte o payload de `incluirDocumento` em {@link SeiRetornoInclusaoDocumento}.
 *
 * @param value - Payload normalizado para a operação `incluirDocumento`.
 * @returns Os dados do documento incluído, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiOperacoesClient.incluirDocumento | SeiOperacoesClient.incluirDocumento}
 * @category Mapeadores
 */
export const mapRetornoInclusaoDocumento = (
  value: SeiRawValue,
): SeiRetornoInclusaoDocumento | null => {
  if (!isMap(value)) {
    return null
  }
  return mapCampoFromMap(value)
}

/**
 * Converte o payload de `consultarProcedimento` em {@link SeiRetornoConsultaProcedimento}.
 *
 * @param value - Payload normalizado para a operação `consultarProcedimento`.
 * @returns Os dados completos do processo, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiConsultasClient.consultarProcedimento | SeiConsultasClient.consultarProcedimento}
 * @category Mapeadores
 */
export const mapRetornoConsultaProcedimento = (
  value: SeiRawValue,
): SeiRetornoConsultaProcedimento | null => {
  if (!isMap(value)) {
    return null
  }

  const tipoProcMap = isMap(value.TipoProcedimento ?? null)
    ? (value.TipoProcedimento as SeiRawMap)
    : null
  const tipoPrioMap = isMap(value.TipoPrioridade ?? null)
    ? (value.TipoPrioridade as SeiRawMap)
    : null

  return {
    idProcedimento: requiredString(
      value.IdProcedimento ?? null,
      "ConsultaProcedimento.IdProcedimento",
    ),
    procedimentoFormatado: stringValue(value.ProcedimentoFormatado ?? null) ?? "",
    especificacao: stringValue(value.Especificacao ?? null) ?? "",
    dataAutuacao: stringValue(value.DataAutuacao ?? null) ?? "",
    linkAcesso: stringValue(value.LinkAcesso ?? null) ?? "",
    nivelAcessoLocal: stringValue(value.NivelAcessoLocal ?? null),
    nivelAcessoGlobal: stringValue(value.NivelAcessoGlobal ?? null),
    tipoProcedimento: tipoProcMap
      ? mapTipoProcedimentoFromMap(tipoProcMap)
      : { idTipoProcedimento: "", nome: "", sinOuvidoriaAnonimo: false },
    andamentoGeracao: mapAndamentoOrNull(value.AndamentoGeracao ?? null),
    andamentoConclusao: mapAndamentoOrNull(value.AndamentoConclusao ?? null),
    ultimoAndamento: mapAndamentoOrNull(value.UltimoAndamento ?? null),
    unidadesProcedimentoAberto: mapItems(
      value.UnidadesProcedimentoAberto ?? null,
      mapUnidadeProcedimentoAbertoFromMap,
    ),
    assuntos: mapItems(value.Assuntos ?? null, (item): SeiAssunto => ({
      codigoEstruturado: requiredString(
        item.CodigoEstruturado ?? null,
        "Assunto.CodigoEstruturado",
      ),
      descricao: stringValue(item.Descricao ?? null),
    })),
    interessados: mapItems(value.Interessados ?? null, mapInteressadoFromMap),
    observacoes: mapItems(value.Observacoes ?? null, mapObservacaoFromMap),
    procedimentosRelacionados: mapItems(
      value.ProcedimentosRelacionados ?? null,
      mapProcedimentoResumidoFromMap,
    ),
    procedimentosAnexados: mapItems(
      value.ProcedimentosAnexados ?? null,
      mapProcedimentoResumidoFromMap,
    ),
    tipoPrioridade: tipoPrioMap ? mapTipoPrioridadeFromMap(tipoPrioMap) : null,
  }
}

/**
 * Converte o payload de `consultarProcedimentoIndividual` em {@link SeiProcedimentoResumido}.
 *
 * @param value - Payload normalizado para a operação `consultarProcedimentoIndividual`.
 * @returns Os dados resumidos do processo, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiConsultasClient.consultarProcedimentoIndividual | SeiConsultasClient.consultarProcedimentoIndividual}
 * @category Mapeadores
 */
export const mapProcedimentoResumido = (value: SeiRawValue): SeiProcedimentoResumido | null => {
  if (!isMap(value)) {
    return null
  }
  return mapProcedimentoResumidoFromMap(value)
}

/**
 * Converte o payload de `consultarDocumento` em {@link SeiRetornoConsultaDocumento}.
 *
 * @param value - Payload normalizado para a operação `consultarDocumento`.
 * @returns Os dados completos do documento, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiConsultasClient.consultarDocumento | SeiConsultasClient.consultarDocumento}
 * @category Mapeadores
 */
export const mapRetornoConsultaDocumento = (
  value: SeiRawValue,
): SeiRetornoConsultaDocumento | null => {
  if (!isMap(value)) {
    return null
  }

  const serieMap = isMap(value.Serie ?? null) ? (value.Serie as SeiRawMap) : null

  return {
    idProcedimento: stringValue(value.IdProcedimento ?? null) ?? "",
    procedimentoFormatado: stringValue(value.ProcedimentoFormatado ?? null) ?? "",
    idDocumento: requiredString(value.IdDocumento ?? null, "ConsultaDocumento.IdDocumento"),
    documentoFormatado: stringValue(value.DocumentoFormatado ?? null) ?? "",
    linkAcesso: stringValue(value.LinkAcesso ?? null) ?? "",
    nivelAcessoLocal: stringValue(value.NivelAcessoLocal ?? null),
    nivelAcessoGlobal: stringValue(value.NivelAcessoGlobal ?? null),
    serie: serieMap ? mapSerieFromMap(serieMap) : null,
    numero: stringValue(value.Numero ?? null) ?? "",
    nomeArvore: stringValue(value.NomeArvore ?? null) ?? "",
    dinValor: stringValue(value.DinValor ?? null),
    descricao: stringValue(value.Descricao ?? null) ?? "",
    data: stringValue(value.Data ?? null) ?? "",
    unidadeElaboradora: mapUnidadeOrNull(value.UnidadeElaboradora ?? null),
    andamentoGeracao: mapAndamentoOrNull(value.AndamentoGeracao ?? null),
    assinaturas: mapItems(value.Assinaturas ?? null, mapAssinaturaFromMap),
    publicacao: mapPublicacaoOrNull(value.Publicacao ?? null),
    campos: mapItems(value.Campos ?? null, (item): SeiCampo => ({
      nome: requiredString(item.Nome ?? null, "Campo.Nome"),
      valor: stringValue(item.Valor ?? null) ?? "",
    })),
    blocos: mapItems(value.Blocos ?? null, mapBlocoFromMap),
  }
}

/**
 * Converte o payload de `consultarBloco` em {@link SeiRetornoConsultaBloco}.
 *
 * @param value - Payload normalizado para a operação `consultarBloco`.
 * @returns Os dados do bloco e seus protocolos, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiConsultasClient.consultarBloco | SeiConsultasClient.consultarBloco}
 * @category Mapeadores
 */
export const mapRetornoConsultaBloco = (value: SeiRawValue): SeiRetornoConsultaBloco | null => {
  if (!isMap(value)) {
    return null
  }
  return {
    idBloco: requiredString(value.IdBloco ?? null, "ConsultaBloco.IdBloco"),
    unidade: mapUnidadeOrNull(value.Unidade ?? null),
    usuario: mapUsuarioOrNull(value.Usuario ?? null),
    descricao: stringValue(value.Descricao ?? null) ?? "",
    tipo: stringValue(value.Tipo ?? null) ?? "",
    estado: stringValue(value.Estado ?? null) ?? "",
    sinPrioridade: boolFromSin(value.SinPrioridade ?? null),
    sinRevisao: boolFromSin(value.SinRevisao ?? null),
    usuarioAtribuicao: mapUsuarioOrNull(value.UsuarioAtribuicao ?? null),
    unidadesDisponibilizacao: mapItems(value.UnidadesDisponibilizacao ?? null, mapUnidadeFromMap),
    protocolos: mapItems(value.Protocolos ?? null, mapProtocoloBlocoFromMap),
  }
}

/**
 * Converte o payload de `lancarAndamento` em {@link SeiAndamento}.
 *
 * @param value - Payload normalizado para a operação `lancarAndamento`.
 * @returns O andamento lançado, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiOperacoesClient.lancarAndamento | SeiOperacoesClient.lancarAndamento}
 * @category Mapeadores
 */
export const mapAndamento = (value: SeiRawValue): SeiAndamento | null => mapAndamentoOrNull(value)

/**
 * Converte o payload de `consultarPublicacao` em {@link SeiRetornoConsultaPublicacao}.
 *
 * @param value - Payload normalizado para a operação `consultarPublicacao`.
 * @returns Os dados da publicação, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiConsultasClient.consultarPublicacao | SeiConsultasClient.consultarPublicacao}
 * @category Mapeadores
 */
export const mapRetornoConsultaPublicacao = (
  value: SeiRawValue,
): SeiRetornoConsultaPublicacao | null => {
  if (!isMap(value)) {
    return null
  }
  return {
    publicacao: mapPublicacaoOrNull(value.Publicacao ?? null),
    andamento: mapAndamentoOrNull(value.Andamento ?? null),
    assinaturas: mapItems(value.Assinaturas ?? null, mapAssinaturaFromMap),
  }
}

/**
 * Converte o payload de `enviarEmail` em {@link SeiRetornoEnvioEmail}.
 *
 * @param value - Payload normalizado para a operação `enviarEmail`.
 * @returns Os dados do e-mail enviado, ou `null` se a resposta não for um mapa.
 * @see {@link index!SeiOperacoesClient.enviarEmail | SeiOperacoesClient.enviarEmail}
 * @category Mapeadores
 */
export const mapRetornoEnvioEmail = (value: SeiRawValue): SeiRetornoEnvioEmail | null => {
  if (!isMap(value)) {
    return null
  }
  return {
    idDocumento: requiredString(value.IdDocumento ?? null, "RetornoEnvioEmail.IdDocumento"),
    documentoFormatado: stringValue(value.DocumentoFormatado ?? null) ?? "",
    linkAcesso: stringValue(value.LinkAcesso ?? null) ?? "",
  }
}

/**
 * Converte o payload de `registrarOuvidoria` em {@link SeiProcedimentoResumido}.
 *
 * @param value - Payload normalizado para a operação `registrarOuvidoria`.
 * @returns Os dados resumidos do processo de ouvidoria gerado, ou `null` se a
 *   resposta não for um mapa.
 * @see {@link index!SeiOperacoesClient.registrarOuvidoria | SeiOperacoesClient.registrarOuvidoria}
 * @category Mapeadores
 */
export const mapProcedimentoResumidoOuvidoria = (
  value: SeiRawValue,
): SeiProcedimentoResumido | null => mapProcedimentoResumido(value)
