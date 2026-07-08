/**
 * @packageDocumentation
 *
 * Contratos públicos do cliente SEI.
 *
 * Este módulo declara todos os tipos de configuração, entrada e saída
 * expostos pelo pacote `@anpdgovbr/sei-client`. Os tipos estão agrupados em:
 *
 * - **Configuração** — {@link SeiConfig}
 * - **SOAP de baixo nível** — {@link SeiSoapParamValue}, {@link SeiSoapArrayValue},
 *   {@link SeiSoapStructValue}, {@link SeiScalarSoapValue}, {@link SeiSoapCallOptions},
 *   {@link SeiRawValue}, {@link SeiRawMap}
 * - **Entidades de domínio** — {@link SeiUnidade}, {@link SeiUsuario}, {@link SeiTipoProcedimento},
 *   {@link SeiSerie}, {@link SeiAssunto}, {@link SeiInteressado}, {@link SeiAndamento},
 *   {@link SeiAssinatura}, {@link SeiContato}, {@link SeiBloco}, {@link SeiMarcador}, etc.
 * - **Retornos de operações** — {@link SeiRetornoGeracaoProcedimento},
 *   {@link SeiRetornoInclusaoDocumento}, {@link SeiRetornoConsultaProcedimento},
 *   {@link SeiRetornoConsultaDocumento}, {@link SeiRetornoConsultaBloco}, etc.
 * - **Parâmetros de entrada** — {@link SeiProcedimentoInput}, {@link SeiDocumentoInput},
 *   {@link SeiConsultarProcedimentoParams}, {@link SeiGerarProcedimentoParams}, etc.
 */

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Parâmetros de conexão com o webservice SOAP do SEI.
 *
 * @remarks
 * O SEI usa `SiglaSistema` e `IdentificacaoServico` para autenticar
 * integrações. Esses valores são cadastrados no painel administrativo do SEI
 * (Administração → Sistemas) e devem ser tratados como segredos.
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
 * ```
 *
 * @see {@link createSeiClient}
 * @category Configuration
 */
export type SeiConfig = Readonly<{
  /**
   * URL do endpoint SOAP do SEI.
   *
   * Aponta para `/sei/ws/SeiWS.php` na raiz da instalação.
   *
   * @example `"https://sei.orgao.gov.br/sei/ws/SeiWS.php"`
   */
  endpointUrl: string
  /**
   * Sigla do sistema integrador cadastrado no SEI.
   *
   * @example `"SGI"`
   */
  siglaSistema: string
  /**
   * Chave de identificação do serviço (IdentificacaoServico) gerada no
   * cadastro do sistema no SEI. Deve ser carregada de variável de ambiente.
   */
  identificacaoServico: string
  /**
   * Tempo máximo de espera para cada chamada SOAP, em milissegundos.
   *
   * @example `30_000`
   */
  requestTimeoutMs: number
}>

// ─── Tipos SOAP de baixo nível (re-exportados de @anpdgovbr/soap-base) ────────

export type {
  ScalarSoapValue as SeiScalarSoapValue,
  SoapStructValue as SeiSoapStructValue,
  SoapArrayValue as SeiSoapArrayValue,
  SoapParamValue as SeiSoapParamValue,
  RawValue as SeiRawValue,
  RawMap as SeiRawMap,
  SoapCallOptions as SeiSoapCallOptions,
} from "@anpdgovbr/soap-base"

// ─── Entidades de domínio simples ────────────────────────────────────────────

/**
 * Unidade organizacional cadastrada no SEI.
 * @category Domain Entities
 */
export type SeiUnidade = Readonly<{
  idUnidade: string
  sigla: string
  descricao: string
  sinProtocolo: boolean
  sinArquivamento: boolean
  sinOuvidoria: boolean
}>

/**
 * Usuário cadastrado no SEI com acesso à unidade.
 * @category Domain Entities
 */
export type SeiUsuario = Readonly<{
  idUsuario: string
  sigla: string
  nome: string
}>

/**
 * Tipo de procedimento (tipo de processo) cadastrado no SEI.
 * @category Domain Entities
 */
export type SeiTipoProcedimento = Readonly<{
  idTipoProcedimento: string
  nome: string
  sinOuvidoriaAnonimo: boolean
}>

/**
 * Tipo de prioridade de processo.
 * @category Domain Entities
 */
export type SeiTipoPrioridade = Readonly<{
  idTipoPrioridade: string
  nome: string
}>

/**
 * Série (tipo de documento) cadastrada no SEI.
 * @category Domain Entities
 */
export type SeiSerie = Readonly<{
  idSerie: string
  nome: string
  /** `null` quando a aplicabilidade não é retornada. */
  aplicabilidade: string | null
}>

/**
 * Assunto (classificação documental) de um processo.
 * @category Domain Entities
 */
export type SeiAssunto = Readonly<{
  codigoEstruturado: string
  descricao: string | null
}>

/**
 * Interessado, remetente ou destinatário de um processo ou documento.
 * @category Domain Entities
 */
export type SeiInteressado = Readonly<{
  idContato: string | null
  cpf: string | null
  cnpj: string | null
  sigla: string | null
  nome: string | null
}>

// Aliases semânticos: o WSDL define Destinatario e Remetente como tipos distintos
// de Interessado, apesar de estruturalmente idênticos. Os aliases preservam essa semântica.
/** @category Domain Entities */
export type SeiDestinatario = SeiInteressado // NOSONAR
/** @category Domain Entities */
export type SeiRemetente = SeiInteressado // NOSONAR

/**
 * Atributo de andamento de processo (par nome/valor).
 * @category Domain Entities
 */
export type SeiAtributoAndamento = Readonly<{
  nome: string
  valor: string
  idOrigem: string
}>

/**
 * Andamento (histórico de movimentação) de um processo no SEI.
 * @category Domain Entities
 */
export type SeiAndamento = Readonly<{
  idAndamento: string | null
  idTarefa: string | null
  idTarefaModulo: string | null
  descricao: string
  dataHora: string
  unidade: SeiUnidade
  usuario: SeiUsuario
  atributos: SeiAtributoAndamento[]
}>

/**
 * Assinatura digital de um documento.
 * @category Domain Entities
 */
export type SeiAssinatura = Readonly<{
  nome: string
  cargoFuncao: string
  dataHora: string
  idUsuario: string
  idOrigem: string
  idOrgao: string
  sigla: string
}>

/**
 * Campo de formulário de um documento SEI.
 * @category Domain Entities
 */
export type SeiCampo = Readonly<{
  nome: string
  valor: string
}>

/**
 * Seção de conteúdo de um documento SEI.
 * @category Domain Entities
 */
export type SeiSecaoDocumento = Readonly<{
  nome: string
  conteudo: string
}>

/**
 * Bloco de assinatura/reunião no SEI (resumo, para uso em listas).
 * @category Domain Entities
 */
export type SeiBloco = Readonly<{
  idBloco: string
  unidade: SeiUnidade
  usuario: SeiUsuario
  descricao: string
  tipo: string
  estado: string
  sinPrioridade: boolean
  sinRevisao: boolean
  usuarioAtribuicao: SeiUsuario
  unidadesDisponibilizacao: SeiUnidade[]
}>

/**
 * Protocolo (documento ou processo) pertencente a um bloco.
 * @category Domain Entities
 */
export type SeiProtocoloBloco = Readonly<{
  protocoloFormatado: string
  identificacao: string
  assinaturas: SeiAssinatura[]
}>

/**
 * Observação registrada em um processo por uma unidade.
 * @category Domain Entities
 */
export type SeiObservacao = Readonly<{
  descricao: string
  unidade: SeiUnidade
}>

/**
 * Unidade na qual um processo está aberto, com usuário de atribuição.
 * @category Domain Entities
 */
export type SeiUnidadeProcedimentoAberto = Readonly<{
  unidade: SeiUnidade
  usuarioAtribuicao: SeiUsuario
}>

/**
 * Referência resumida a um processo (usada em relacionamentos e anexações).
 * @category Domain Entities
 */
export type SeiProcedimentoResumido = Readonly<{
  idProcedimento: string
  procedimentoFormatado: string
  tipoProcedimento: SeiTipoProcedimento
}>

/**
 * Extensão de arquivo permitida para upload no SEI.
 * @category Domain Entities
 */
export type SeiArquivoExtensao = Readonly<{
  idArquivoExtensao: string
  extensao: string
  descricao: string
}>

/**
 * Hipótese legal de restrição de acesso.
 * @category Domain Entities
 */
export type SeiHipoteseLegal = Readonly<{
  idHipoteseLegal: string
  nome: string
  baseLegal: string
  nivelAcesso: string
}>

/**
 * Tipo de conferência para documentos digitalizados.
 * @category Domain Entities
 */
export type SeiTipoConferencia = Readonly<{
  idTipoConferencia: string
  descricao: string
}>

/**
 * País cadastrado no SEI.
 * @category Domain Entities
 */
export type SeiPais = Readonly<{
  idPais: string
  nome: string
}>

/**
 * Estado/UF cadastrado no SEI.
 * @category Domain Entities
 */
export type SeiEstado = Readonly<{
  idEstado: string
  idPais: string
  sigla: string
  nome: string
  codigoIbge: string
}>

/**
 * Município cadastrado no SEI.
 * @category Domain Entities
 */
export type SeiCidade = Readonly<{
  idCidade: string
  idEstado: string
  idPais: string
  nome: string
  codigoIbge: string
  sinCapital: boolean
  latitude: string
  longitude: string
}>

/**
 * Cargo cadastrado no SEI.
 * @category Domain Entities
 */
export type SeiCargo = Readonly<{
  idCargo: string
  expressaoCargo: string
  expressaoTratamento: string
  expressaoVocativo: string
}>

/**
 * Contato cadastrado no SEI (pessoa física, jurídica ou unidade externa).
 * @category Domain Entities
 */
export type SeiContato = Readonly<{
  staOperacao: string | null
  idContato: string
  idTipoContato: string
  nomeTipoContato: string | null
  sigla: string
  nome: string
  nomeSocial: string | null
  staNatureza: string
  idContatoAssociado: string | null
  nomeContatoAssociado: string | null
  sinEnderecoAssociado: boolean
  cnpjAssociado: string | null
  endereco: string
  complemento: string
  bairro: string
  idCidade: string | null
  nomeCidade: string | null
  idEstado: string | null
  siglaEstado: string | null
  idPais: string | null
  nomePais: string | null
  cep: string
  staGenero: string
  idCargo: string | null
  expressaoCargo: string | null
  expressaoTratamento: string | null
  expressaoVocativo: string | null
  cpf: string
  cnpj: string
  rg: string
  orgaoExpedidor: string
  numeroPassaporte: string | null
  idPaisPassaporte: string | null
  nomePaisPassaporte: string | null
  matricula: string
  matriculaOab: string
  telefoneComercial: string
  telefoneResidencial: string
  telefoneCelular: string
  dataNascimento: string
  email: string
  sitioInternet: string
  observacao: string
  conjuge: string | null
  funcao: string | null
  idTitulo: string | null
  expressaoTitulo: string | null
  abreviaturaTitulo: string | null
  sinAtivo: boolean
  idCategoria: string | null
  idNomeCategoria: string | null
}>

/**
 * Marcador de processo da unidade.
 * @category Domain Entities
 */
export type SeiMarcador = Readonly<{
  idMarcador: string
  nome: string
  icone: string
  sinAtivo: boolean
}>

/**
 * Andamento de marcador registrado em um processo.
 * @category Domain Entities
 */
export type SeiAndamentoMarcador = Readonly<{
  idAndamentoMarcador: string | null
  texto: string
  dataHora: string
  usuario: SeiUsuario
  marcador: SeiMarcador
}>

/**
 * Feriado cadastrado no SEI para uma unidade/órgão.
 * @category Domain Entities
 */
export type SeiFeriado = Readonly<{
  data: string
  descricao: string
}>

/**
 * Dados de publicação no Diário Oficial via Imprensa Nacional.
 * @category Domain Entities
 */
export type SeiPublicacaoImprensaNacional = Readonly<{
  idVeiculo: string | null
  siglaVeiculo: string | null
  descricaoVeiculo: string | null
  pagina: string
  idSecao: string | null
  secao: string | null
  data: string
}>

/**
 * Publicação oficial associada a um documento do SEI.
 * @category Domain Entities
 */
export type SeiPublicacao = Readonly<{
  idPublicacao: string | null
  idDocumento: string | null
  staMotivo: string | null
  resumo: string | null
  idVeiculoPublicacao: string | null
  nomeVeiculo: string
  staTipoVeiculo: string | null
  numero: string
  dataDisponibilizacao: string
  dataPublicacao: string
  estado: string
  imprensaNacional: SeiPublicacaoImprensaNacional
}>

/**
 * Atributo adicional de manifestação de ouvidoria.
 * @category Domain Entities
 */
export type SeiAtributoOuvidoria = Readonly<{
  id: string | null
  nome: string
  titulo: string
  valor: string
}>

/**
 * Anexo de uma manifestação de ouvidoria.
 * @category Domain Entities
 */
export type SeiAnexo = Readonly<{
  idAnexo: string | null
  nome: string
  dataHora: string | null
  tamanho: string | null
  conteudo: string
}>

// ─── Retornos de operações ────────────────────────────────────────────────────

/**
 * Retorno da inclusão de um documento via `incluirDocumento`.
 * @category Return Types
 */
export type SeiRetornoInclusaoDocumento = Readonly<{
  idDocumento: string
  documentoFormatado: string
  linkAcesso: string
}>

/**
 * Retorno da geração de um processo via `gerarProcedimento`.
 * @category Return Types
 */
export type SeiRetornoGeracaoProcedimento = Readonly<{
  idProcedimento: string
  procedimentoFormatado: string
  linkAcesso: string
  retornoInclusaoDocumentos: SeiRetornoInclusaoDocumento[]
}>

/**
 * Retorno completo da consulta de um processo via `consultarProcedimento`.
 * @category Return Types
 */
export type SeiRetornoConsultaProcedimento = Readonly<{
  idProcedimento: string
  procedimentoFormatado: string
  especificacao: string
  dataAutuacao: string
  linkAcesso: string
  nivelAcessoLocal: string | null
  nivelAcessoGlobal: string | null
  tipoProcedimento: SeiTipoProcedimento
  andamentoGeracao: SeiAndamento | null
  andamentoConclusao: SeiAndamento | null
  ultimoAndamento: SeiAndamento | null
  unidadesProcedimentoAberto: SeiUnidadeProcedimentoAberto[]
  assuntos: SeiAssunto[]
  interessados: SeiInteressado[]
  observacoes: SeiObservacao[]
  procedimentosRelacionados: SeiProcedimentoResumido[]
  procedimentosAnexados: SeiProcedimentoResumido[]
  tipoPrioridade: SeiTipoPrioridade | null
}>

/**
 * Retorno completo da consulta de um documento via `consultarDocumento`.
 * @category Return Types
 */
export type SeiRetornoConsultaDocumento = Readonly<{
  idProcedimento: string
  procedimentoFormatado: string
  idDocumento: string
  documentoFormatado: string
  linkAcesso: string
  nivelAcessoLocal: string | null
  nivelAcessoGlobal: string | null
  serie: SeiSerie | null
  numero: string
  nomeArvore: string
  dinValor: string | null
  descricao: string
  data: string
  unidadeElaboradora: SeiUnidade | null
  andamentoGeracao: SeiAndamento | null
  assinaturas: SeiAssinatura[]
  publicacao: SeiPublicacao | null
  campos: SeiCampo[]
  blocos: SeiBloco[]
}>

/**
 * Retorno completo da consulta de um bloco via `consultarBloco`.
 * @category Return Types
 */
export type SeiRetornoConsultaBloco = Readonly<{
  idBloco: string
  unidade: SeiUnidade | null
  usuario: SeiUsuario | null
  descricao: string
  tipo: string
  estado: string
  sinPrioridade: boolean
  sinRevisao: boolean
  usuarioAtribuicao: SeiUsuario | null
  unidadesDisponibilizacao: SeiUnidade[]
  protocolos: SeiProtocoloBloco[]
}>

/**
 * Retorno da consulta de publicação via `consultarPublicacao`.
 * @category Return Types
 */
export type SeiRetornoConsultaPublicacao = Readonly<{
  publicacao: SeiPublicacao | null
  andamento: SeiAndamento | null
  assinaturas: SeiAssinatura[]
}>

/**
 * Retorno do envio de e-mail via `enviarEmail`.
 * @category Return Types
 */
export type SeiRetornoEnvioEmail = Readonly<{
  idDocumento: string
  documentoFormatado: string
  linkAcesso: string
}>

// ─── Parâmetros de entrada (inputs) ──────────────────────────────────────────

/**
 * Assunto de entrada para criação/edição de processo.
 * @category Input Types
 */
export type SeiAssuntoInput = Readonly<{
  codigoEstruturado: string
  descricao?: string | null
}>

/**
 * Interessado de entrada para criação/edição de processo ou documento.
 * @category Input Types
 */
export type SeiInteressadoInput = Readonly<{
  idContato?: string | null
  cpf?: string | null
  cnpj?: string | null
  sigla?: string | null
  nome?: string | null
}>

/**
 * Campo de formulário de entrada para criação de documento.
 * @category Input Types
 */
export type SeiCampoInput = Readonly<{
  nome: string
  valor: string
}>

/**
 * Seção de conteúdo de entrada para documento.
 * @category Input Types
 */
export type SeiSecaoDocumentoInput = Readonly<{
  nome: string
  conteudo: string
}>

/**
 * Dados de um processo a ser criado via `gerarProcedimento`.
 * @category Input Types
 */
export type SeiProcedimentoInput = Readonly<{
  idTipoProcedimento: string
  numeroProtocolo?: string | null
  dataAutuacao?: string | null
  especificacao?: string | null
  assuntos: readonly SeiAssuntoInput[]
  interessados: readonly SeiInteressadoInput[]
  observacao?: string | null
  /** `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso: string
  idHipoteseLegal?: string | null
  idTipoPrioridade?: string | null
}>

/**
 * Dados de um documento a ser incluído via `incluirDocumento`.
 *
 * @remarks
 * `tipo` deve ser `"G"` (gerado) ou `"R"` (recebido).
 * Para conteúdo, use `conteudo` (HTML/base64 inline), `idArquivo` (arquivo
 * já carregado via `adicionarArquivo`) ou `conteudoSecoes` (formulários).
 * @category Input Types
 */
export type SeiDocumentoInput = Readonly<{
  /** `"G"` para documento gerado, `"R"` para recebido. */
  tipo: string
  idProcedimento?: string | null
  protocoloProcedimento?: string | null
  idSerie: string
  numero?: string | null
  nomeArvore?: string | null
  dinValor?: string | null
  data?: string | null
  descricao?: string | null
  idTipoConferencia?: string | null
  sinArquivamento?: string | null
  remetente?: SeiInteressadoInput | null
  interessados?: readonly SeiInteressadoInput[]
  destinatarios?: readonly SeiInteressadoInput[]
  observacao?: string | null
  nomeArquivo?: string | null
  nivelAcesso?: string | null
  idHipoteseLegal?: string | null
  /** HTML ou conteúdo base64. Exclusivo com `idArquivo`. */
  conteudo?: string | null
  conteudoSecoes?: readonly SeiSecaoDocumentoInput[]
  /** ID do arquivo pré-carregado via `adicionarArquivo`. */
  idArquivo?: string | null
  campos?: readonly SeiCampoInput[]
  sinBloqueado?: string | null
  idItemEtapa?: string | null
}>

/**
 * Dados de contato para criação/atualização via `atualizarContatos`.
 * @category Input Types
 */
export type SeiContatoInput = Readonly<{
  staOperacao?: string
  idContato: string
  idTipoContato: string
  sigla: string
  nome: string
  nomeSocial?: string | null
  staNatureza: string
  idContatoAssociado?: string | null
  sinEnderecoAssociado: string
  cnpjAssociado?: string | null
  endereco: string
  complemento: string
  bairro: string
  idCidade?: string | null
  idEstado?: string | null
  idPais?: string | null
  cep: string
  staGenero: string
  idCargo?: string | null
  cpf: string
  cnpj: string
  rg: string
  orgaoExpedidor: string
  numeroPassaporte?: string | null
  idPaisPassaporte?: string | null
  matricula: string
  matriculaOab: string
  telefoneComercial: string
  telefoneResidencial: string
  telefoneCelular: string
  dataNascimento: string
  email: string
  sitioInternet: string
  observacao: string
  conjuge?: string | null
  funcao?: string | null
  idTitulo?: string | null
  sinAtivo: string
  idCategoria?: string | null
}>

/**
 * Atributo de andamento de entrada para `lancarAndamento`.
 * @category Input Types
 */
export type SeiAtributoAndamentoInput = Readonly<{
  nome: string
  valor: string
  idOrigem: string
}>

/**
 * Definição de marcador para `definirMarcador`.
 * @category Input Types
 */
export type SeiDefinicaoMarcadorInput = Readonly<{
  protocoloProcedimento: string
  idMarcador: string
  texto: string
}>

/**
 * Definição de controle de prazo para `definirControlePrazo`.
 * @category Input Types
 */
export type SeiDefinicaoControlePrazoInput = Readonly<{
  protocoloProcedimento: string
  dataPrazo: string
  dias: string
  sinDiasUteis: string
}>

/**
 * Anotação de processo para `registrarAnotacao`.
 * @category Input Types
 */
export type SeiAnotacaoInput = Readonly<{
  protocoloProcedimento: string
  descricao: string
  sinPrioridade: string
}>

/**
 * Dados de publicação no Diário Oficial para `agendarPublicacao`.
 * @category Input Types
 */
export type SeiPublicacaoImprensaNacionalInput = Readonly<{
  idVeiculo?: string | null
  siglaVeiculo?: string | null
  descricaoVeiculo?: string | null
  pagina: string
  idSecao?: string | null
  secao?: string | null
  data: string
}>

/**
 * Atributo adicional de ouvidoria para `registrarOuvidoria`.
 * @category Input Types
 */
export type SeiAtributoOuvidoriaInput = Readonly<{
  id?: string | null
  nome: string
  titulo: string
  valor: string
}>

/**
 * Anexo de ouvidoria para `registrarOuvidoria`.
 * @category Input Types
 */
export type SeiAnexoInput = Readonly<{
  idAnexo?: string | null
  nome: string
  dataHora?: string | null
  tamanho?: string | null
  conteudo: string
}>

// ─── Parâmetros de operações ──────────────────────────────────────────────────

/** Parâmetros para {@link SeiConsultasClient.listarUnidades}. @category Operation Parameters */
export type SeiListarUnidadesParams = Readonly<{
  idUnidade: string
  idTipoProcedimento?: string | null
  idSerie?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposProcedimento}. @category Operation Parameters */
export type SeiListarTiposProcedimentoParams = Readonly<{
  idUnidade: string
  idSerie?: string | null
  sinIndividual?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposPrioridade}. @category Operation Parameters */
export type SeiListarTiposPrioridadeParams = Readonly<{
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarSeries}. @category Operation Parameters */
export type SeiListarSeriesParams = Readonly<{
  idUnidade: string
  idTipoProcedimento?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarContatos}. @category Operation Parameters */
export type SeiListarContatosParams = Readonly<{
  idUnidade: string
  idTipoContato?: string | null
  paginaRegistros?: string | null
  paginaAtual?: string | null
  sigla?: string | null
  nome?: string | null
  cpf?: string | null
  cnpj?: string | null
  matricula?: string | null
  idContatos?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.consultarProcedimento}. @category Operation Parameters */
export type SeiConsultarProcedimentoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  sinRetornarAssuntos?: string
  sinRetornarInteressados?: string
  sinRetornarObservacoes?: string
  sinRetornarAndamentoGeracao?: string
  sinRetornarAndamentoConclusao?: string
  sinRetornarUltimoAndamento?: string
  sinRetornarUnidadesProcedimentoAberto?: string
  sinRetornarProcedimentosRelacionados?: string
  sinRetornarProcedimentosAnexados?: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarProcedimentoIndividual}. @category Operation Parameters */
export type SeiConsultarProcedimentoIndividualParams = Readonly<{
  idUnidade: string
  idOrgaoProcedimento: string
  idTipoProcedimento: string
  idOrgaoUsuario: string
  siglaUsuario: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarDocumento}. @category Operation Parameters */
export type SeiConsultarDocumentoParams = Readonly<{
  idUnidade: string
  protocoloDocumento: string
  sinRetornarAndamentoGeracao?: string
  sinRetornarAssinaturas?: string
  sinRetornarPublicacao?: string
  sinRetornarCampos?: string
  sinRetornarBlocos?: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarBloco}. @category Operation Parameters */
export type SeiConsultarBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  sinRetornarProtocolos?: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarExtensoesPermitidas}. @category Operation Parameters */
export type SeiListarExtensoesPermitidasParams = Readonly<{
  idUnidade: string
  idArquivoExtensao?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarUsuarios}. @category Operation Parameters */
export type SeiListarUsuariosParams = Readonly<{
  idUnidade: string
  idUsuario?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarHipotesesLegais}. @category Operation Parameters */
export type SeiListarHipotesesLegaisParams = Readonly<{
  idUnidade: string
  nivelAcesso?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposConferencia}. @category Operation Parameters */
export type SeiListarTiposConferenciaParams = Readonly<{
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarPaises}. @category Operation Parameters */
export type SeiListarPaisesParams = Readonly<{
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarEstados}. @category Operation Parameters */
export type SeiListarEstadosParams = Readonly<{
  idUnidade: string
  idPais?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarCidades}. @category Operation Parameters */
export type SeiListarCidadesParams = Readonly<{
  idUnidade: string
  idPais?: string | null
  idEstado?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarCargos}. @category Operation Parameters */
export type SeiListarCargosParams = Readonly<{
  idUnidade: string
  idCargo?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.adicionarArquivo}. @category Operation Parameters */
export type SeiAdicionarArquivoParams = Readonly<{
  idUnidade: string
  nome: string
  tamanho: string
  hash: string
  conteudo: string
}>

/** Parâmetros para {@link SeiConsultasClient.adicionarConteudoArquivo}. @category Operation Parameters */
export type SeiAdicionarConteudoArquivoParams = Readonly<{
  idUnidade: string
  idArquivo: string
  conteudo: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarAndamentos}. @category Operation Parameters */
export type SeiListarAndamentosParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  sinRetornarAtributos?: string
  andamentos?: readonly string[]
  tarefas?: readonly string[]
  tarefasModulos?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.listarMarcadoresUnidade}. @category Operation Parameters */
export type SeiListarMarcadoresUnidadeParams = Readonly<{
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarAndamentosMarcadores}. @category Operation Parameters */
export type SeiListarAndamentosMarcadoresParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  marcadores?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.consultarPublicacao}. @category Operation Parameters */
export type SeiConsultarPublicacaoParams = Readonly<{
  idUnidade: string
  idPublicacao?: string | null
  idDocumento?: string | null
  protocoloDocumento?: string | null
  sinRetornarAndamento?: string
  sinRetornarAssinaturas?: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarFeriados}. @category Operation Parameters */
export type SeiListarFeriadosParams = Readonly<{
  idUnidade: string
  idOrgao?: string | null
  dataInicial?: string | null
  dataFinal?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.gerarProcedimento}. @category Operation Parameters */
export type SeiGerarProcedimentoParams = Readonly<{
  idUnidade: string
  procedimento: SeiProcedimentoInput
  documentos?: readonly SeiDocumentoInput[]
  procedimentosRelacionados?: readonly string[]
  unidadesEnvio?: readonly string[]
  sinManterAbertoUnidade?: string | null
  sinEnviarEmailNotificacao?: string | null
  dataRetornoProgramado?: string | null
  diasRetornoProgramado?: string | null
  sinDiasUteisRetornoProgramado?: string | null
  idMarcador?: string | null
  textoMarcador?: string | null
  dataControlePrazo?: string | null
  diasControlePrazo?: string | null
  sinDiasUteisControlePrazo?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.incluirDocumento}. @category Operation Parameters */
export type SeiIncluirDocumentoParams = Readonly<{
  idUnidade: string
  documento: SeiDocumentoInput
}>

/** Parâmetros para {@link SeiOperacoesClient.atualizarContatos}. @category Operation Parameters */
export type SeiAtualizarContatosParams = Readonly<{
  idUnidade: string
  contatos: readonly SeiContatoInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.cancelarDocumento}. @category Operation Parameters */
export type SeiCancelarDocumentoParams = Readonly<{
  idUnidade: string
  protocoloDocumento: string
  motivo: string
}>

/** Parâmetros para {@link SeiOperacoesClient.bloquearDocumento}. @category Operation Parameters */
export type SeiBloquearDocumentoParams = Readonly<{
  idUnidade: string
  protocoloDocumento: string
}>

/** Parâmetros para {@link SeiOperacoesClient.gerarBloco}. @category Operation Parameters */
export type SeiGerarBlocoParams = Readonly<{
  idUnidade: string
  tipo: string
  descricao: string
  unidadesDisponibilizacao?: readonly string[]
  documentos?: readonly string[]
  sinDisponibilizar?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.alterarBloco}. @category Operation Parameters */
export type SeiAlterarBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  descricao: string
  unidadesDisponibilizacao?: readonly string[]
}>

/** Parâmetros para {@link SeiOperacoesClient.excluirBloco}. @category Operation Parameters */
export type SeiExcluirBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
}>

/** Parâmetros para {@link SeiOperacoesClient.excluirProcesso}. @category Operation Parameters */
export type SeiExcluirProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
}>

/** Parâmetros para {@link SeiOperacoesClient.excluirDocumento}. @category Operation Parameters */
export type SeiExcluirDocumentoParams = Readonly<{
  idUnidade: string
  protocoloDocumento: string
}>

/** Parâmetros para operações simples de bloco (disponibilizar, concluir, etc.). @category Operation Parameters */
export type SeiOperacaoBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
}>

/** Parâmetros para {@link SeiOperacoesClient.incluirDocumentoBloco}. @category Operation Parameters */
export type SeiIncluirDocumentoBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  protocoloDocumento: string
  anotacao?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.retirarDocumentoBloco}. @category Operation Parameters */
export type SeiRetirarDocumentoBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  protocoloDocumento: string
}>

/** Parâmetros para {@link SeiOperacoesClient.incluirProcessoBloco}. @category Operation Parameters */
export type SeiIncluirProcessoBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  protocoloProcedimento: string
  anotacao?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.retirarProcessoBloco}. @category Operation Parameters */
export type SeiRetirarProcessoBlocoParams = Readonly<{
  idUnidade: string
  idBloco: string
  protocoloProcedimento: string
}>

/** Parâmetros para operações simples de processo (reabrir, concluir, etc.). @category Operation Parameters */
export type SeiOperacaoProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
}>

/** Parâmetros para {@link SeiOperacoesClient.enviarProcesso}. @category Operation Parameters */
export type SeiEnviarProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  unidadesDestino: readonly string[]
  sinManterAbertoUnidade?: string | null
  sinRemoverAnotacao?: string | null
  sinEnviarEmailNotificacao?: string | null
  dataRetornoProgramado?: string | null
  diasRetornoProgramado?: string | null
  sinDiasUteisRetornoProgramado?: string | null
  sinReabrir?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.atribuirProcesso}. @category Operation Parameters */
export type SeiAtribuirProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  idUsuario: string
  sinReabrir?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.lancarAndamento}. @category Operation Parameters */
export type SeiLancarAndamentoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  idTarefa?: string | null
  idTarefaModulo?: string | null
  atributos?: readonly SeiAtributoAndamentoInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.relacionarProcesso}. @category Operation Parameters */
export type SeiRelacionarProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento1: string
  protocoloProcedimento2: string
}>

/** Parâmetros para {@link SeiOperacoesClient.sobrestarProcesso}. @category Operation Parameters */
export type SeiSobrestarProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  protocoloProcedimentoVinculado?: string | null
  motivo: string
}>

/** Parâmetros para {@link SeiOperacoesClient.anexarProcesso}. @category Operation Parameters */
export type SeiAnexarProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimentoPrincipal: string
  protocoloProcedimentoAnexado: string
}>

/** Parâmetros para {@link SeiOperacoesClient.desanexarProcesso}. @category Operation Parameters */
export type SeiDesanexarProcessoParams = Readonly<{
  idUnidade: string
  protocoloProcedimentoPrincipal: string
  protocoloProcedimentoAnexado: string
  motivo: string
}>

/** Parâmetros para {@link SeiOperacoesClient.definirMarcador}. @category Operation Parameters */
export type SeiDefinirMarcadorParams = Readonly<{
  idUnidade: string
  definicoes: readonly SeiDefinicaoMarcadorInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.definirControlePrazo}. @category Operation Parameters */
export type SeiDefinirControlePrazoParams = Readonly<{
  idUnidade: string
  definicoes: readonly SeiDefinicaoControlePrazoInput[]
}>

/** Parâmetros para operações de controle de prazo com lista de processos. @category Operation Parameters */
export type SeiControlePrazoProcessosParams = Readonly<{
  idUnidade: string
  protocolosProcedimentos: readonly string[]
}>

/** Parâmetros para {@link SeiOperacoesClient.registrarAnotacao}. @category Operation Parameters */
export type SeiRegistrarAnotacaoParams = Readonly<{
  idUnidade: string
  anotacoes: readonly SeiAnotacaoInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.agendarPublicacao}. @category Operation Parameters */
export type SeiAgendarPublicacaoParams = Readonly<{
  idUnidade: string
  idDocumento?: string | null
  protocoloDocumento?: string | null
  staMotivo?: string | null
  idVeiculoPublicacao: string
  dataDisponibilizacao: string
  resumo?: string | null
  imprensaNacional?: SeiPublicacaoImprensaNacionalInput | null
}>

/** Parâmetros para {@link SeiOperacoesClient.alterarPublicacao}. @category Operation Parameters */
export type SeiAlterarPublicacaoParams = Readonly<{
  idUnidade: string
  idPublicacao?: string | null
  idDocumento?: string | null
  protocoloDocumento?: string | null
  staMotivo?: string | null
  idVeiculoPublicacao: string
  dataDisponibilizacao: string
  resumo?: string | null
  imprensaNacional?: SeiPublicacaoImprensaNacionalInput | null
}>

/** Parâmetros para {@link SeiOperacoesClient.cancelarAgendamentoPublicacao}. @category Operation Parameters */
export type SeiCancelarAgendamentoPublicacaoParams = Readonly<{
  idUnidade: string
  idPublicacao?: string | null
  idDocumento?: string | null
  protocoloDocumento?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.confirmarDisponibilizacaoPublicacao}. @category Operation Parameters */
export type SeiConfirmarDisponibilizacaoPublicacaoParams = Readonly<{
  idVeiculoPublicacao: string
  dataDisponibilizacao: string
  dataPublicacao: string
  numero: string
  idDocumentos: readonly string[]
}>

/** Parâmetros para {@link SeiOperacoesClient.enviarEmail}. @category Operation Parameters */
export type SeiEnviarEmailParams = Readonly<{
  idUnidade: string
  protocoloProcedimento: string
  de?: string | null
  para: string
  cco?: string | null
  assunto: string
  mensagem: string
  idDocumentos?: readonly string[]
  nivelAcesso?: string | null
  idHipoteseLegal?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.registrarOuvidoria}. @category Operation Parameters */
export type SeiRegistrarOuvidoriaParams = Readonly<{
  idOrgao: string
  nome?: string | null
  nomeSocial?: string | null
  email?: string | null
  cpf?: string | null
  rg?: string | null
  orgaoExpedidor?: string | null
  telefone?: string | null
  idEstado?: string | null
  idCidade?: string | null
  idTipoProcedimento: string
  processos?: string | null
  sinRetorno?: string | null
  mensagem: string
  atributosAdicionais?: readonly SeiAtributoOuvidoriaInput[]
  sinAnonimo?: string | null
  sinSigilo?: string | null
  anexos?: readonly SeiAnexoInput[]
}>
