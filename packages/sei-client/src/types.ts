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
 * @category Configuração
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
   * Após esse prazo a requisição é abortada e um {@link SeiSoapError} com
   * `status` 408 é lançado.
   *
   * @example `30_000`
   */
  requestTimeoutMs: number
}>

// ─── Tipos SOAP de baixo nível (re-exportados de @anpdgovbr/sei-sip-soap) ────────

export type {
  ScalarSoapValue as SeiScalarSoapValue,
  SoapStructValue as SeiSoapStructValue,
  SoapArrayValue as SeiSoapArrayValue,
  SoapParamValue as SeiSoapParamValue,
  RawValue as SeiRawValue,
  RawMap as SeiRawMap,
  SoapCallOptions as SeiSoapCallOptions,
} from "@anpdgovbr/sei-sip-soap"

// ─── Entidades de domínio simples ────────────────────────────────────────────

/**
 * Unidade organizacional cadastrada no SEI.
 * @category Entidades de Domínio
 */
export type SeiUnidade = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Sigla do registro no SEI. */
  sigla: string
  /** Descrição textual do registro. */
  descricao: string
  /** Indica se a unidade é de protocolo. */
  sinProtocolo: boolean
  /** Indicador de arquivamento. */
  sinArquivamento: boolean
  /** Indica se a unidade é de ouvidoria. */
  sinOuvidoria: boolean
}>

/**
 * Usuário cadastrado no SEI com acesso à unidade.
 * @category Entidades de Domínio
 */
export type SeiUsuario = Readonly<{
  /** Identificador interno do usuário no SEI. */
  idUsuario: string
  /** Sigla do registro no SEI. */
  sigla: string
  /** Nome do registro. */
  nome: string
}>

/**
 * Tipo de procedimento (tipo de processo) cadastrado no SEI.
 * @category Entidades de Domínio
 */
export type SeiTipoProcedimento = Readonly<{
  /** Identificador do tipo de procedimento (tipo de processo). */
  idTipoProcedimento: string
  /** Nome do registro. */
  nome: string
  /** Indica se o tipo aceita manifestação anônima de ouvidoria. */
  sinOuvidoriaAnonimo: boolean
}>

/**
 * Tipo de prioridade de processo.
 * @category Entidades de Domínio
 */
export type SeiTipoPrioridade = Readonly<{
  /** Identificador do tipo de prioridade. */
  idTipoPrioridade: string
  /** Nome do registro. */
  nome: string
}>

/**
 * Série (tipo de documento) cadastrada no SEI.
 * @category Entidades de Domínio
 */
export type SeiSerie = Readonly<{
  /** Identificador da série (tipo de documento). */
  idSerie: string
  /** Nome do registro. */
  nome: string
  /** `null` quando a aplicabilidade não é retornada. */
  aplicabilidade: string | null
}>

/**
 * Assunto (classificação documental) de um processo.
 * @category Entidades de Domínio
 */
export type SeiAssunto = Readonly<{
  /** Código estruturado do assunto (ex.: `"06.01.01"`). */
  codigoEstruturado: string
  /** Descrição textual do registro. */
  descricao: string | null
}>

/**
 * Interessado, remetente ou destinatário de um processo ou documento.
 * @category Entidades de Domínio
 */
export type SeiInteressado = Readonly<{
  /** Identificador do contato no SEI. */
  idContato: string | null
  /** CPF (somente dígitos), quando aplicável. */
  cpf: string | null
  /** CNPJ (somente dígitos), quando aplicável. */
  cnpj: string | null
  /** Sigla do registro no SEI. */
  sigla: string | null
  /** Nome do registro. */
  nome: string | null
}>

// Aliases semânticos: o WSDL define Destinatario e Remetente como tipos distintos
// de Interessado, apesar de estruturalmente idênticos. Os aliases preservam essa semântica.
/** @category Entidades de Domínio */
export type SeiDestinatario = SeiInteressado // NOSONAR
/** @category Entidades de Domínio */
export type SeiRemetente = SeiInteressado // NOSONAR

/**
 * Atributo de andamento de processo (par nome/valor).
 * @category Entidades de Domínio
 */
export type SeiAtributoAndamento = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Valor textual do campo ou atributo. */
  valor: string
  /** Identificador do registro no sistema de origem. */
  idOrigem: string
}>

/**
 * Andamento (histórico de movimentação) de um processo no SEI.
 * @category Entidades de Domínio
 */
export type SeiAndamento = Readonly<{
  /** Identificador do andamento, ou `null`. */
  idAndamento: string | null
  /** Identificador da tarefa de andamento, ou `null`. */
  idTarefa: string | null
  /** Identificador da tarefa de módulo, ou `null`. */
  idTarefaModulo: string | null
  /** Descrição textual do registro. */
  descricao: string
  /** Data/hora no formato do SEI (`DD/MM/AAAA HH:MM:SS`). */
  dataHora: string
  /** Unidade associada ao registro. */
  unidade: SeiUnidade
  /** Usuário associado ao registro. */
  usuario: SeiUsuario
  /** Atributos do andamento (pares nome/valor). */
  atributos: SeiAtributoAndamento[]
}>

/**
 * Assinatura digital de um documento.
 * @category Entidades de Domínio
 */
export type SeiAssinatura = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Cargo/função do signatário. */
  cargoFuncao: string
  /** Data/hora no formato do SEI (`DD/MM/AAAA HH:MM:SS`). */
  dataHora: string
  /** Identificador interno do usuário no SEI. */
  idUsuario: string
  /** Identificador do registro no sistema de origem. */
  idOrigem: string
  /** Identificador do órgão no SEI. */
  idOrgao: string
  /** Sigla do registro no SEI. */
  sigla: string
}>

/**
 * Campo de formulário de um documento SEI.
 * @category Entidades de Domínio
 */
export type SeiCampo = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Valor textual do campo ou atributo. */
  valor: string
}>

/**
 * Seção de conteúdo de um documento SEI.
 * @category Entidades de Domínio
 */
export type SeiSecaoDocumento = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Conteúdo em Base64. */
  conteudo: string
}>

/**
 * Bloco de assinatura/reunião no SEI (resumo, para uso em listas).
 * @category Entidades de Domínio
 */
export type SeiBloco = Readonly<{
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Unidade associada ao registro. */
  unidade: SeiUnidade
  /** Usuário associado ao registro. */
  usuario: SeiUsuario
  /** Descrição textual do registro. */
  descricao: string
  /** Tipo do bloco: `"A"` assinatura, `"R"` reunião, `"I"` interno. */
  tipo: string
  /** Estado atual retornado pelo SEI. */
  estado: string
  /** Indicador de prioridade. */
  sinPrioridade: boolean
  /** Indicador de revisão do bloco. */
  sinRevisao: boolean
  /** Usuário de atribuição, quando houver. */
  usuarioAtribuicao: SeiUsuario
  /** Unidades para as quais o bloco é disponibilizado. */
  unidadesDisponibilizacao: SeiUnidade[]
}>

/**
 * Protocolo (documento ou processo) pertencente a um bloco.
 * @category Entidades de Domínio
 */
export type SeiProtocoloBloco = Readonly<{
  /** Protocolo formatado do item do bloco. */
  protocoloFormatado: string
  /** Identificação do protocolo dentro do bloco. */
  identificacao: string
  /** Assinaturas digitais associadas. */
  assinaturas: SeiAssinatura[]
}>

/**
 * Observação registrada em um processo por uma unidade.
 * @category Entidades de Domínio
 */
export type SeiObservacao = Readonly<{
  /** Descrição textual do registro. */
  descricao: string
  /** Unidade associada ao registro. */
  unidade: SeiUnidade
}>

/**
 * Unidade na qual um processo está aberto, com usuário de atribuição.
 * @category Entidades de Domínio
 */
export type SeiUnidadeProcedimentoAberto = Readonly<{
  /** Unidade associada ao registro. */
  unidade: SeiUnidade
  /** Usuário de atribuição, quando houver. */
  usuarioAtribuicao: SeiUsuario
}>

/**
 * Referência resumida a um processo (usada em relacionamentos e anexações).
 * @category Entidades de Domínio
 */
export type SeiProcedimentoResumido = Readonly<{
  /** Identificador interno do processo no SEI. */
  idProcedimento: string
  /** Número do processo formatado (ex.: `"00000.000001/2026-01"`). */
  procedimentoFormatado: string
  /** Tipo de procedimento (tipo de processo). */
  tipoProcedimento: SeiTipoProcedimento
}>

/**
 * Extensão de arquivo permitida para upload no SEI.
 * @category Entidades de Domínio
 */
export type SeiArquivoExtensao = Readonly<{
  /** Identificador da extensão de arquivo no SEI. */
  idArquivoExtensao: string
  /** Extensão do arquivo (ex.: `"pdf"`). */
  extensao: string
  /** Descrição textual do registro. */
  descricao: string
}>

/**
 * Hipótese legal de restrição de acesso.
 * @category Entidades de Domínio
 */
export type SeiHipoteseLegal = Readonly<{
  /** Identificador da hipótese legal de restrição de acesso. */
  idHipoteseLegal: string
  /** Nome do registro. */
  nome: string
  /** Base legal da hipótese (norma e artigo). */
  baseLegal: string
  /** Nível de acesso: `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso: string
}>

/**
 * Tipo de conferência para documentos digitalizados.
 * @category Entidades de Domínio
 */
export type SeiTipoConferencia = Readonly<{
  /** Identificador do tipo de conferência (documentos digitalizados). */
  idTipoConferencia: string
  /** Descrição textual do registro. */
  descricao: string
}>

/**
 * País cadastrado no SEI.
 * @category Entidades de Domínio
 */
export type SeiPais = Readonly<{
  /** Identificador do país no SEI. */
  idPais: string
  /** Nome do registro. */
  nome: string
}>

/**
 * Estado/UF cadastrado no SEI.
 * @category Entidades de Domínio
 */
export type SeiEstado = Readonly<{
  /** Identificador do estado/UF no SEI. */
  idEstado: string
  /** Identificador do país no SEI. */
  idPais: string
  /** Sigla do registro no SEI. */
  sigla: string
  /** Nome do registro. */
  nome: string
  /** Código IBGE correspondente. */
  codigoIbge: string
}>

/**
 * Município cadastrado no SEI.
 * @category Entidades de Domínio
 */
export type SeiCidade = Readonly<{
  /** Identificador do município no SEI. */
  idCidade: string
  /** Identificador do estado/UF no SEI. */
  idEstado: string
  /** Identificador do país no SEI. */
  idPais: string
  /** Nome do registro. */
  nome: string
  /** Código IBGE correspondente. */
  codigoIbge: string
  /** Indica se o município é capital. */
  sinCapital: boolean
  /** Latitude do município (texto). */
  latitude: string
  /** Longitude do município (texto). */
  longitude: string
}>

/**
 * Cargo cadastrado no SEI.
 * @category Entidades de Domínio
 */
export type SeiCargo = Readonly<{
  /** Identificador do cargo no SEI. */
  idCargo: string
  /** Expressão do cargo (ex.: `"Diretor"`). */
  expressaoCargo: string
  /** Expressão de tratamento (ex.: `"Senhor"`). */
  expressaoTratamento: string
  /** Expressão de vocativo (ex.: `"Senhor Diretor"`). */
  expressaoVocativo: string
}>

/**
 * Contato cadastrado no SEI (pessoa física, jurídica ou unidade externa).
 * @category Entidades de Domínio
 */
export type SeiContato = Readonly<{
  /** Operação a aplicar: `"A"` cria/altera, `"E"` exclui, `"D"` desativa, `"R"` reativa. */
  staOperacao: string | null
  /** Identificador do contato no SEI. */
  idContato: string
  /** Identificador do tipo de contato. */
  idTipoContato: string
  /** Nome do tipo de contato, ou `null`. */
  nomeTipoContato: string | null
  /** Sigla do registro no SEI. */
  sigla: string
  /** Nome do registro. */
  nome: string
  /** Nome social, quando informado. */
  nomeSocial: string | null
  /** Natureza do contato (pessoa física/jurídica), conforme domínio do SEI. */
  staNatureza: string
  /** Identificador do contato associado, ou `null`. */
  idContatoAssociado: string | null
  /** Nome do contato associado, ou `null`. */
  nomeContatoAssociado: string | null
  /** Indica uso do endereço do contato associado. */
  sinEnderecoAssociado: boolean
  /** CNPJ da pessoa jurídica associada, ou `null`. */
  cnpjAssociado: string | null
  /** Logradouro do endereço do contato. */
  endereco: string
  /** Complemento do endereço do contato. */
  complemento: string
  /** Bairro do endereço do contato. */
  bairro: string
  /** Identificador do município no SEI. */
  idCidade: string | null
  /** Nome do município, ou `null`. */
  nomeCidade: string | null
  /** Identificador do estado/UF no SEI. */
  idEstado: string | null
  /** Sigla do estado/UF, ou `null`. */
  siglaEstado: string | null
  /** Identificador do país no SEI. */
  idPais: string | null
  /** Nome do país, ou `null`. */
  nomePais: string | null
  /** CEP do endereço do contato. */
  cep: string
  /** Gênero do contato, conforme domínio do SEI. */
  staGenero: string
  /** Identificador do cargo no SEI. */
  idCargo: string | null
  /** Expressão do cargo (ex.: `"Diretor"`). */
  expressaoCargo: string | null
  /** Expressão de tratamento (ex.: `"Senhor"`). */
  expressaoTratamento: string | null
  /** Expressão de vocativo (ex.: `"Senhor Diretor"`). */
  expressaoVocativo: string | null
  /** CPF (somente dígitos), quando aplicável. */
  cpf: string
  /** CNPJ (somente dígitos), quando aplicável. */
  cnpj: string
  /** Número do RG do contato. */
  rg: string
  /** Órgão expedidor do RG. */
  orgaoExpedidor: string
  /** Número do passaporte, ou `null`. */
  numeroPassaporte: string | null
  /** Identificador do país emissor do passaporte, ou `null`. */
  idPaisPassaporte: string | null
  /** Nome do país emissor do passaporte, ou `null`. */
  nomePaisPassaporte: string | null
  /** Matrícula do contato. */
  matricula: string
  /** Matrícula OAB do contato. */
  matriculaOab: string
  /** Telefone comercial do contato. */
  telefoneComercial: string
  /** Telefone residencial do contato. */
  telefoneResidencial: string
  /** Telefone celular do contato. */
  telefoneCelular: string
  /** Data de nascimento do contato (`DD/MM/AAAA`). */
  dataNascimento: string
  /** Endereço de e-mail. */
  email: string
  /** Site do contato. */
  sitioInternet: string
  /** Observação textual. */
  observacao: string
  /** Nome do cônjuge, ou `null`. */
  conjuge: string | null
  /** Função do contato, ou `null`. */
  funcao: string | null
  /** Identificador do título do contato, ou `null`. */
  idTitulo: string | null
  /** Expressão do título do contato, ou `null`. */
  expressaoTitulo: string | null
  /** Abreviatura do título do contato, ou `null`. */
  abreviaturaTitulo: string | null
  /** Indica se o registro está ativo. */
  sinAtivo: boolean
  /** Identificador da categoria do contato, ou `null`. */
  idCategoria: string | null
  /** Nome da categoria do contato, ou `null`. */
  idNomeCategoria: string | null
}>

/**
 * Marcador de processo da unidade.
 * @category Entidades de Domínio
 */
export type SeiMarcador = Readonly<{
  /** Identificador do marcador no SEI. */
  idMarcador: string
  /** Nome do registro. */
  nome: string
  /** Identificador do ícone do marcador no SEI. */
  icone: string
  /** Indica se o registro está ativo. */
  sinAtivo: boolean
}>

/**
 * Andamento de marcador registrado em um processo.
 * @category Entidades de Domínio
 */
export type SeiAndamentoMarcador = Readonly<{
  /** Identificador do andamento de marcador, ou `null`. */
  idAndamentoMarcador: string | null
  /** Texto associado ao marcador. */
  texto: string
  /** Data/hora no formato do SEI (`DD/MM/AAAA HH:MM:SS`). */
  dataHora: string
  /** Usuário associado ao registro. */
  usuario: SeiUsuario
  /** Marcador associado ao andamento. */
  marcador: SeiMarcador
}>

/**
 * Feriado cadastrado no SEI para uma unidade/órgão.
 * @category Entidades de Domínio
 */
export type SeiFeriado = Readonly<{
  /** Data no formato do SEI (`DD/MM/AAAA`). */
  data: string
  /** Descrição textual do registro. */
  descricao: string
}>

/**
 * Dados de publicação no Diário Oficial via Imprensa Nacional.
 * @category Entidades de Domínio
 */
export type SeiPublicacaoImprensaNacional = Readonly<{
  /** Identificador do veículo na Imprensa Nacional, ou `null`. */
  idVeiculo: string | null
  /** Sigla do veículo na Imprensa Nacional, ou `null`. */
  siglaVeiculo: string | null
  /** Descrição do veículo na Imprensa Nacional, ou `null`. */
  descricaoVeiculo: string | null
  /** Página da publicação no veículo. */
  pagina: string
  /** Identificador da seção do Diário Oficial, ou `null`. */
  idSecao: string | null
  /** Nome da seção do Diário Oficial, ou `null`. */
  secao: string | null
  /** Data no formato do SEI (`DD/MM/AAAA`). */
  data: string
}>

/**
 * Publicação oficial associada a um documento do SEI.
 * @category Entidades de Domínio
 */
export type SeiPublicacao = Readonly<{
  /** Identificador da publicação no SEI. */
  idPublicacao: string | null
  /** Identificador interno do documento no SEI. */
  idDocumento: string | null
  /** Motivo da publicação, conforme domínio do SEI, ou `null`. */
  staMotivo: string | null
  /** Resumo da publicação, ou `null`. */
  resumo: string | null
  /** Identificador do veículo de publicação no SEI. */
  idVeiculoPublicacao: string | null
  /** Nome do veículo de publicação. */
  nomeVeiculo: string
  /** Tipo do veículo de publicação, conforme domínio do SEI, ou `null`. */
  staTipoVeiculo: string | null
  /** Número associado ao registro (ex.: número do documento ou da edição). */
  numero: string
  /** Data de disponibilização da publicação (`DD/MM/AAAA`). */
  dataDisponibilizacao: string
  /** Data efetiva de publicação (`DD/MM/AAAA`). */
  dataPublicacao: string
  /** Estado atual retornado pelo SEI. */
  estado: string
  /** Dados de publicação na Imprensa Nacional, quando aplicável. */
  imprensaNacional: SeiPublicacaoImprensaNacional
}>

/**
 * Atributo adicional de manifestação de ouvidoria.
 * @category Entidades de Domínio
 */
export type SeiAtributoOuvidoria = Readonly<{
  /** Identificador do atributo. */
  id: string | null
  /** Nome do registro. */
  nome: string
  /** Título exibido para o atributo. */
  titulo: string
  /** Valor textual do campo ou atributo. */
  valor: string
}>

/**
 * Anexo de uma manifestação de ouvidoria.
 * @category Entidades de Domínio
 */
export type SeiAnexo = Readonly<{
  /** Identificador do anexo, ou `null`. */
  idAnexo: string | null
  /** Nome do registro. */
  nome: string
  /** Data/hora no formato do SEI (`DD/MM/AAAA HH:MM:SS`). */
  dataHora: string | null
  /** Tamanho do arquivo em bytes (texto). */
  tamanho: string | null
  /** Conteúdo em Base64. */
  conteudo: string
}>

// ─── Retornos de operações ────────────────────────────────────────────────────

/**
 * Retorno da inclusão de um documento via `incluirDocumento`.
 * @category Tipos de Retorno
 */
export type SeiRetornoInclusaoDocumento = Readonly<{
  /** Identificador interno do documento no SEI. */
  idDocumento: string
  /** Número do documento formatado no SEI. */
  documentoFormatado: string
  /** URL de acesso direto ao registro no SEI. */
  linkAcesso: string
}>

/**
 * Retorno da geração de um processo via `gerarProcedimento`.
 * @category Tipos de Retorno
 */
export type SeiRetornoGeracaoProcedimento = Readonly<{
  /** Identificador interno do processo no SEI. */
  idProcedimento: string
  /** Número do processo formatado (ex.: `"00000.000001/2026-01"`). */
  procedimentoFormatado: string
  /** URL de acesso direto ao registro no SEI. */
  linkAcesso: string
  /** Retorno da inclusão de cada documento enviado na criação. */
  retornoInclusaoDocumentos: SeiRetornoInclusaoDocumento[]
}>

/**
 * Retorno completo da consulta de um processo via `consultarProcedimento`.
 * @category Tipos de Retorno
 */
export type SeiRetornoConsultaProcedimento = Readonly<{
  /** Identificador interno do processo no SEI. */
  idProcedimento: string
  /** Número do processo formatado (ex.: `"00000.000001/2026-01"`). */
  procedimentoFormatado: string
  /** Especificação (complemento do tipo) do processo. */
  especificacao: string
  /** Data de autuação do processo (`DD/MM/AAAA`). */
  dataAutuacao: string
  /** URL de acesso direto ao registro no SEI. */
  linkAcesso: string
  /** Nível de acesso local (`0/1/2`), ou `null`. */
  nivelAcessoLocal: string | null
  /** Nível de acesso global (`0/1/2`), ou `null`. */
  nivelAcessoGlobal: string | null
  /** Tipo de procedimento (tipo de processo). */
  tipoProcedimento: SeiTipoProcedimento
  /** Andamento de geração, ou `null` quando não retornado. */
  andamentoGeracao: SeiAndamento | null
  /** Andamento de conclusão do processo, ou `null`. */
  andamentoConclusao: SeiAndamento | null
  /** Último andamento registrado, ou `null`. */
  ultimoAndamento: SeiAndamento | null
  /** Unidades nas quais o processo está aberto. */
  unidadesProcedimentoAberto: SeiUnidadeProcedimentoAberto[]
  /** Assuntos (classificação documental) do processo. */
  assuntos: SeiAssunto[]
  /** Interessados do processo ou documento. */
  interessados: SeiInteressado[]
  /** Observações registradas pelas unidades. */
  observacoes: SeiObservacao[]
  /** Processos relacionados. */
  procedimentosRelacionados: SeiProcedimentoResumido[]
  /** Processos anexados a este processo. */
  procedimentosAnexados: SeiProcedimentoResumido[]
  /** Tipo de prioridade do processo, ou `null`. */
  tipoPrioridade: SeiTipoPrioridade | null
}>

/**
 * Retorno completo da consulta de um documento via `consultarDocumento`.
 * @category Tipos de Retorno
 */
export type SeiRetornoConsultaDocumento = Readonly<{
  /** Identificador interno do processo no SEI. */
  idProcedimento: string
  /** Número do processo formatado (ex.: `"00000.000001/2026-01"`). */
  procedimentoFormatado: string
  /** Identificador interno do documento no SEI. */
  idDocumento: string
  /** Número do documento formatado no SEI. */
  documentoFormatado: string
  /** URL de acesso direto ao registro no SEI. */
  linkAcesso: string
  /** Nível de acesso local (`0/1/2`), ou `null`. */
  nivelAcessoLocal: string | null
  /** Nível de acesso global (`0/1/2`), ou `null`. */
  nivelAcessoGlobal: string | null
  /** Série (tipo de documento), ou `null`. */
  serie: SeiSerie | null
  /** Número associado ao registro (ex.: número do documento ou da edição). */
  numero: string
  /** Complemento do nome exibido na árvore do processo. */
  nomeArvore: string
  /** Valor monetário associado ao documento, ou `null`. */
  dinValor: string | null
  /** Descrição textual do registro. */
  descricao: string
  /** Data no formato do SEI (`DD/MM/AAAA`). */
  data: string
  /** Unidade que elaborou o documento, ou `null`. */
  unidadeElaboradora: SeiUnidade | null
  /** Andamento de geração, ou `null` quando não retornado. */
  andamentoGeracao: SeiAndamento | null
  /** Assinaturas digitais associadas. */
  assinaturas: SeiAssinatura[]
  /** Dados da publicação, ou `null`. */
  publicacao: SeiPublicacao | null
  /** Campos de formulário do documento. */
  campos: SeiCampo[]
  /** Blocos aos quais o documento pertence (quando `sinRetornarBlocos="S"`). */
  blocos: SeiBloco[]
}>

/**
 * Retorno completo da consulta de um bloco via `consultarBloco`.
 * @category Tipos de Retorno
 */
export type SeiRetornoConsultaBloco = Readonly<{
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Unidade associada ao registro. */
  unidade: SeiUnidade | null
  /** Usuário associado ao registro. */
  usuario: SeiUsuario | null
  /** Descrição textual do registro. */
  descricao: string
  /** Tipo do bloco: `"A"` assinatura, `"R"` reunião, `"I"` interno. */
  tipo: string
  /** Estado atual retornado pelo SEI. */
  estado: string
  /** Indicador de prioridade. */
  sinPrioridade: boolean
  /** Indicador de revisão do bloco. */
  sinRevisao: boolean
  /** Usuário de atribuição, quando houver. */
  usuarioAtribuicao: SeiUsuario | null
  /** Unidades para as quais o bloco é disponibilizado. */
  unidadesDisponibilizacao: SeiUnidade[]
  /** Protocolos (documentos/processos) pertencentes ao bloco. */
  protocolos: SeiProtocoloBloco[]
}>

/**
 * Retorno da consulta de publicação via `consultarPublicacao`.
 * @category Tipos de Retorno
 */
export type SeiRetornoConsultaPublicacao = Readonly<{
  /** Dados da publicação, ou `null`. */
  publicacao: SeiPublicacao | null
  /** Andamento associado à publicação, ou `null`. */
  andamento: SeiAndamento | null
  /** Assinaturas digitais associadas. */
  assinaturas: SeiAssinatura[]
}>

/**
 * Retorno do envio de e-mail via `enviarEmail`.
 * @category Tipos de Retorno
 */
export type SeiRetornoEnvioEmail = Readonly<{
  /** Identificador interno do documento no SEI. */
  idDocumento: string
  /** Número do documento formatado no SEI. */
  documentoFormatado: string
  /** URL de acesso direto ao registro no SEI. */
  linkAcesso: string
}>

// ─── Parâmetros de entrada (inputs) ──────────────────────────────────────────

/**
 * Assunto de entrada para criação/edição de processo.
 * @category Tipos de Entrada
 */
export type SeiAssuntoInput = Readonly<{
  /** Código estruturado do assunto (ex.: `"06.01.01"`). */
  codigoEstruturado: string
  /** Descrição textual do registro. */
  descricao?: string | null
}>

/**
 * Interessado de entrada para criação/edição de processo ou documento.
 * @category Tipos de Entrada
 */
export type SeiInteressadoInput = Readonly<{
  /** Identificador do contato no SEI. */
  idContato?: string | null
  /** CPF (somente dígitos), quando aplicável. */
  cpf?: string | null
  /** CNPJ (somente dígitos), quando aplicável. */
  cnpj?: string | null
  /** Sigla do registro no SEI. */
  sigla?: string | null
  /** Nome do registro. */
  nome?: string | null
}>

/**
 * Campo de formulário de entrada para criação de documento.
 * @category Tipos de Entrada
 */
export type SeiCampoInput = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Valor textual do campo ou atributo. */
  valor: string
}>

/**
 * Seção de conteúdo de entrada para documento.
 * @category Tipos de Entrada
 */
export type SeiSecaoDocumentoInput = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Conteúdo da seção em Base64 UTF-8. Veja {@link encodeSeiBase64}. */
  conteudo: string
}>

/**
 * Dados de um processo a ser criado via `gerarProcedimento`.
 * @category Tipos de Entrada
 */
export type SeiProcedimentoInput = Readonly<{
  /** Identificador do tipo de procedimento (tipo de processo). */
  idTipoProcedimento: string
  /** Número de protocolo a reutilizar na autuação, ou `null`. */
  numeroProtocolo?: string | null
  /** Data de autuação do processo (`DD/MM/AAAA`). */
  dataAutuacao?: string | null
  /** Especificação (complemento do tipo) do processo. */
  especificacao?: string | null
  /** Assuntos (classificação documental) do processo. */
  assuntos: readonly SeiAssuntoInput[]
  /** Interessados do processo ou documento. */
  interessados: readonly SeiInteressadoInput[]
  /** Observação textual. */
  observacao?: string | null
  /** `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso: string
  /** Identificador da hipótese legal de restrição de acesso. */
  idHipoteseLegal?: string | null
  /** Identificador do tipo de prioridade. */
  idTipoPrioridade?: string | null
}>

/**
 * Dados de um documento a ser incluído via `incluirDocumento`.
 *
 * @remarks
 * `tipo` deve ser `"G"` (gerado) ou `"R"` (recebido).
 * Para conteúdo, use `conteudo` (Base64), `idArquivo` (arquivo já carregado
 * via `adicionarArquivo`) ou `conteudoSecoes` (conteúdo por seção em Base64).
 * Use {@link encodeSeiBase64} para codificar HTML/texto de documentos.
 *
 * `sinBloqueado: "S"` impede a edição do conteúdo pela interface web do SEI,
 * mas não impede a assinatura: o botão de assinar verifica apenas se a série
 * permite assinatura e se o tipo de documento é compatível, sem considerar
 * `sinBloqueado`. Não é possível, via SOAP, criar um documento editável que
 * também fique impedido de ser assinado.
 * @category Tipos de Entrada
 */
export type SeiDocumentoInput = Readonly<{
  /** `"G"` para documento gerado, `"R"` para recebido. */
  tipo: string
  /** Identificador interno do processo no SEI. */
  idProcedimento?: string | null
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento?: string | null
  /** Identificador da série (tipo de documento). */
  idSerie: string
  /** Número associado ao registro (ex.: número do documento ou da edição). */
  numero?: string | null
  /** Complemento do nome exibido na árvore do processo. */
  nomeArvore?: string | null
  /** Valor monetário associado ao documento, ou `null`. */
  dinValor?: string | null
  /** Data no formato do SEI (`DD/MM/AAAA`). */
  data?: string | null
  /** Descrição textual do registro. */
  descricao?: string | null
  /** Identificador do tipo de conferência (documentos digitalizados). */
  idTipoConferencia?: string | null
  /** Indicador de arquivamento. */
  sinArquivamento?: string | null
  /** Remetente do documento recebido, ou `null`. */
  remetente?: SeiInteressadoInput | null
  /** Interessados do processo ou documento. */
  interessados?: readonly SeiInteressadoInput[]
  /** Destinatários do documento. */
  destinatarios?: readonly SeiInteressadoInput[]
  /** Observação textual. */
  observacao?: string | null
  /** Nome do arquivo do documento, ou `null`. */
  nomeArquivo?: string | null
  /** Nível de acesso: `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso?: string | null
  /** Identificador da hipótese legal de restrição de acesso. */
  idHipoteseLegal?: string | null
  /** Conteúdo em Base64. Exclusivo com `idArquivo` e `conteudoSecoes`. */
  conteudo?: string | null
  /** Conteúdo por seção em Base64. Exclusivo com `conteudo` e `idArquivo`. */
  conteudoSecoes?: readonly SeiSecaoDocumentoInput[]
  /** ID do arquivo pré-carregado via `adicionarArquivo`. */
  idArquivo?: string | null
  /** Campos de formulário do documento. */
  campos?: readonly SeiCampoInput[]
  /** Sinalizador `S`/`N`: criar o documento bloqueado para edição. */
  sinBloqueado?: "S" | "N" | null
  /** Sinalizador `S`/`N`: incluir o documento já assinado. */
  sinAssinado?: "S" | "N" | null
  /** Identificador do item de etapa (módulos com fluxo de etapas), ou `null`. */
  idItemEtapa?: string | null
}>

/**
 * Dados de contato para criação/atualização via `atualizarContatos`.
 *
 * O campo `staOperacao` controla o efeito no SEI: `A` cria/altera, `E` exclui,
 * `D` desativa e `R` reativa. Para alteração (`A`), envie o cadastro completo
 * do contato; o SEI repassa o DTO inteiro para a regra de alteração.
 *
 * @category Tipos de Entrada
 */
export type SeiContatoInput = Readonly<{
  /** Operação a aplicar: `"A"` cria/altera, `"E"` exclui, `"D"` desativa, `"R"` reativa. */
  staOperacao?: string
  /** Identificador do contato no SEI. */
  idContato: string
  /** Identificador do tipo de contato. */
  idTipoContato: string
  /** Sigla do registro no SEI. */
  sigla: string
  /** Nome do registro. */
  nome: string
  /** Nome social, quando informado. */
  nomeSocial?: string | null
  /** Natureza do contato (pessoa física/jurídica), conforme domínio do SEI. */
  staNatureza: string
  /** Identificador do contato associado, ou `null`. */
  idContatoAssociado?: string | null
  /** Indica uso do endereço do contato associado. */
  sinEnderecoAssociado: string
  /** CNPJ da pessoa jurídica associada, ou `null`. */
  cnpjAssociado?: string | null
  /** Logradouro do endereço do contato. */
  endereco: string
  /** Complemento do endereço do contato. */
  complemento: string
  /** Bairro do endereço do contato. */
  bairro: string
  /** Identificador do município no SEI. */
  idCidade?: string | null
  /** Identificador do estado/UF no SEI. */
  idEstado?: string | null
  /** Identificador do país no SEI. */
  idPais?: string | null
  /** CEP do endereço do contato. */
  cep: string
  /** Gênero do contato, conforme domínio do SEI. */
  staGenero: string
  /** Identificador do cargo no SEI. */
  idCargo?: string | null
  /** CPF (somente dígitos), quando aplicável. */
  cpf: string
  /** CNPJ (somente dígitos), quando aplicável. */
  cnpj: string
  /** Número do RG do contato. */
  rg: string
  /** Órgão expedidor do RG. */
  orgaoExpedidor: string
  /** Número do passaporte, ou `null`. */
  numeroPassaporte?: string | null
  /** Identificador do país emissor do passaporte, ou `null`. */
  idPaisPassaporte?: string | null
  /** Matrícula do contato. */
  matricula: string
  /** Matrícula OAB do contato. */
  matriculaOab: string
  /** Telefone comercial do contato. */
  telefoneComercial: string
  /** Telefone residencial do contato. */
  telefoneResidencial: string
  /** Telefone celular do contato. */
  telefoneCelular: string
  /** Data de nascimento do contato (`DD/MM/AAAA`). */
  dataNascimento: string
  /** Endereço de e-mail. */
  email: string
  /** Site do contato. */
  sitioInternet: string
  /** Observação textual. */
  observacao: string
  /** Nome do cônjuge, ou `null`. */
  conjuge?: string | null
  /** Função do contato, ou `null`. */
  funcao?: string | null
  /** Identificador do título do contato, ou `null`. */
  idTitulo?: string | null
  /** Indica se o registro está ativo. */
  sinAtivo: string
  /** Identificador da categoria do contato, ou `null`. */
  idCategoria?: string | null
}>

/**
 * Atributo de andamento de entrada para `lancarAndamento`.
 * @category Tipos de Entrada
 */
export type SeiAtributoAndamentoInput = Readonly<{
  /** Nome do registro. */
  nome: string
  /** Valor textual do campo ou atributo. */
  valor: string
  /** Identificador do registro no sistema de origem. */
  idOrigem: string
}>

/**
 * Definição de marcador para `definirMarcador`.
 *
 * O Web Service do SEI registra um andamento de marcador para o processo, sem expor uma
 * operação par de remoção/cancelamento desse marcador.
 *
 * @category Tipos de Entrada
 */
export type SeiDefinicaoMarcadorInput = Readonly<{
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Identificador do marcador no SEI. */
  idMarcador: string
  /** Texto associado ao marcador. */
  texto: string
}>

/**
 * Definição de controle de prazo para `definirControlePrazo`.
 *
 * O SEI repassa `DataPrazo`, `Dias` e `SinDiasUteis` para a regra de controle de prazo.
 * Para prazo relativo, informe `dias` e `sinDiasUteis` e envie `dataPrazo` como string vazia.
 * Para prazo absoluto, informe `dataPrazo` no formato aceito pelo SEI da instalação.
 *
 * @category Tipos de Entrada
 */
export type SeiDefinicaoControlePrazoInput = Readonly<{
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Data absoluta do prazo (`DD/MM/AAAA`); envie vazio para prazo relativo. */
  dataPrazo: string
  /** Prazo em dias (texto), para prazo relativo. */
  dias: string
  /** Sinalizador `S`/`N`: contar o prazo em dias úteis. */
  sinDiasUteis: string
}>

/**
 * Anotação de processo para `registrarAnotacao`.
 * @category Tipos de Entrada
 */
export type SeiAnotacaoInput = Readonly<{
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Descrição textual do registro. */
  descricao: string
  /** Indicador de prioridade. */
  sinPrioridade: string
}>

/**
 * Dados de publicação no Diário Oficial para `agendarPublicacao`.
 * @category Tipos de Entrada
 */
export type SeiPublicacaoImprensaNacionalInput = Readonly<{
  /** Identificador do veículo na Imprensa Nacional, ou `null`. */
  idVeiculo?: string | null
  /** Sigla do veículo na Imprensa Nacional, ou `null`. */
  siglaVeiculo?: string | null
  /** Descrição do veículo na Imprensa Nacional, ou `null`. */
  descricaoVeiculo?: string | null
  /** Página da publicação no veículo. */
  pagina: string
  /** Identificador da seção do Diário Oficial, ou `null`. */
  idSecao?: string | null
  /** Nome da seção do Diário Oficial, ou `null`. */
  secao?: string | null
  /** Data no formato do SEI (`DD/MM/AAAA`). */
  data: string
}>

/**
 * Atributo adicional de ouvidoria para `registrarOuvidoria`.
 *
 * Use para campos complementares exigidos pela configuração local da ouvidoria.
 * O SEI recebe cada item como `AtributoOuvidoria`.
 *
 * @category Tipos de Entrada
 */
export type SeiAtributoOuvidoriaInput = Readonly<{
  /** Identificador do atributo, quando conhecido/configurado no SEI. */
  id?: string | null
  /** Nome técnico do atributo adicional. */
  nome: string
  /** Título exibido/esperado para o atributo. */
  titulo: string
  /** Valor textual enviado no registro da manifestação. */
  valor: string
}>

/**
 * Anexo de ouvidoria para `registrarOuvidoria`.
 *
 * O conteúdo deve ser enviado em Base64, no formato esperado pelo Web Service
 * do SEI. Para anexos temporários maiores, valide previamente tamanho e
 * extensão permitida no ambiente.
 *
 * @category Tipos de Entrada
 */
export type SeiAnexoInput = Readonly<{
  /** Identificador prévio do anexo, quando aplicável. */
  idAnexo?: string | null
  /** Nome do arquivo enviado à ouvidoria. */
  nome: string
  /** Data/hora textual do anexo, quando exigida pela instalação. */
  dataHora?: string | null
  /** Tamanho textual/numérico conforme contrato SOAP do SEI. */
  tamanho?: string | null
  /** Conteúdo do arquivo em Base64. */
  conteudo: string
}>

// ─── Parâmetros de operações ──────────────────────────────────────────────────

/** Parâmetros para {@link SeiConsultasClient.listarUnidades}. @category Parâmetros de Operação */
export type SeiListarUnidadesParams = Readonly<{
  /** Identificador do tipo de procedimento (tipo de processo). */
  idTipoProcedimento?: string | null
  /** Identificador da série (tipo de documento). */
  idSerie?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposProcedimento}. @category Parâmetros de Operação */
export type SeiListarTiposProcedimentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador da série (tipo de documento). */
  idSerie?: string | null
  /** Sinalizador `S`/`N`: retornar apenas tipos com autuação individual. */
  sinIndividual?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposPrioridade}. @category Parâmetros de Operação */
export type SeiListarTiposPrioridadeParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarSeries}. @category Parâmetros de Operação */
export type SeiListarSeriesParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do tipo de procedimento (tipo de processo). */
  idTipoProcedimento?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarContatos}. @category Parâmetros de Operação */
export type SeiListarContatosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do tipo de contato. */
  idTipoContato?: string | null
  /** Quantidade de registros por página (texto), ou `null`. */
  paginaRegistros?: string | null
  /** Página atual da consulta paginada (texto), ou `null`. */
  paginaAtual?: string | null
  /** Sigla do registro no SEI. */
  sigla?: string | null
  /** Nome do registro. */
  nome?: string | null
  /** CPF (somente dígitos), quando aplicável. */
  cpf?: string | null
  /** CNPJ (somente dígitos), quando aplicável. */
  cnpj?: string | null
  /** Matrícula do contato. */
  matricula?: string | null
  /** IDs de contatos para filtrar a consulta. */
  idContatos?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.consultarProcedimento}. @category Parâmetros de Operação */
export type SeiConsultarProcedimentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Sinalizador `S`/`N`: retornar os assuntos. Padrão `"S"`. */
  sinRetornarAssuntos?: string
  /** Sinalizador `S`/`N`: retornar os interessados. Padrão `"S"`. */
  sinRetornarInteressados?: string
  /** Sinalizador `S`/`N`: retornar as observações. Padrão `"S"`. */
  sinRetornarObservacoes?: string
  /** Sinalizador `S`/`N`: retornar o andamento de geração. Padrão `"S"`. */
  sinRetornarAndamentoGeracao?: string
  /** Sinalizador `S`/`N`: retornar o andamento de conclusão. Padrão `"S"`. */
  sinRetornarAndamentoConclusao?: string
  /** Sinalizador `S`/`N`: retornar o último andamento. Padrão `"S"`. */
  sinRetornarUltimoAndamento?: string
  /** Sinalizador `S`/`N`: retornar as unidades com o processo aberto. Padrão `"S"`. */
  sinRetornarUnidadesProcedimentoAberto?: string
  /** Sinalizador `S`/`N`: retornar os processos relacionados. Padrão `"S"`. */
  sinRetornarProcedimentosRelacionados?: string
  /** Sinalizador `S`/`N`: retornar os processos anexados. Padrão `"S"`. */
  sinRetornarProcedimentosAnexados?: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarProcedimentoIndividual}. @category Parâmetros de Operação */
export type SeiConsultarProcedimentoIndividualParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do órgão do procedimento. */
  idOrgaoProcedimento: string
  /** Identificador do tipo de procedimento (tipo de processo). */
  idTipoProcedimento: string
  /** Identificador do órgão do usuário. */
  idOrgaoUsuario: string
  /** Sigla (login) do usuário. */
  siglaUsuario: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarDocumento}. @category Parâmetros de Operação */
export type SeiConsultarDocumentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
  /** Sinalizador `S`/`N`: retornar o andamento de geração. Padrão `"S"`. */
  sinRetornarAndamentoGeracao?: string
  /** Sinalizador `S`/`N`: retornar as assinaturas. Padrão `"S"`. */
  sinRetornarAssinaturas?: string
  /** Sinalizador `S`/`N`: retornar os dados de publicação. Padrão `"S"`. */
  sinRetornarPublicacao?: string
  /** Sinalizador `S`/`N`: retornar os campos de formulário. Padrão `"S"`. */
  sinRetornarCampos?: string
  /** Sinalizador `S`/`N`: retornar os blocos do documento. Padrão `"N"`. */
  sinRetornarBlocos?: string
}>

/** Parâmetros para {@link SeiConsultasClient.consultarBloco}. @category Parâmetros de Operação */
export type SeiConsultarBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Sinalizador `S`/`N`: retornar os protocolos do bloco. Padrão `"S"`. */
  sinRetornarProtocolos?: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarExtensoesPermitidas}. @category Parâmetros de Operação */
export type SeiListarExtensoesPermitidasParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador da extensão de arquivo no SEI. */
  idArquivoExtensao?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarUsuarios}. @category Parâmetros de Operação */
export type SeiListarUsuariosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador interno do usuário no SEI. */
  idUsuario?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarHipotesesLegais}. @category Parâmetros de Operação */
export type SeiListarHipotesesLegaisParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Nível de acesso: `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarTiposConferencia}. @category Parâmetros de Operação */
export type SeiListarTiposConferenciaParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarPaises}. @category Parâmetros de Operação */
export type SeiListarPaisesParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarEstados}. @category Parâmetros de Operação */
export type SeiListarEstadosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do país no SEI. */
  idPais?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarCidades}. @category Parâmetros de Operação */
export type SeiListarCidadesParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do país no SEI. */
  idPais?: string | null
  /** Identificador do estado/UF no SEI. */
  idEstado?: string | null
}>

/** Parâmetros para {@link SeiConsultasClient.listarCargos}. @category Parâmetros de Operação */
export type SeiListarCargosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do cargo no SEI. */
  idCargo?: string | null
}>

/**
 * Parâmetros para {@link SeiConsultasClient.adicionarArquivo}.
 *
 * `tamanho` deve representar o tamanho total do arquivo em bytes, `hash` deve ser
 * o MD5 hexadecimal do arquivo completo, e `conteudo` deve ser a primeira parte
 * do arquivo em Base64. Se a primeira parte não completar o tamanho total, o SEI
 * mantém o anexo temporário inativo até receber as partes restantes por
 * `adicionarConteudoArquivo`.
 *
 * @category Parâmetros de Operação
 */
export type SeiAdicionarArquivoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Nome do registro. */
  nome: string
  /** Tamanho do arquivo em bytes (texto). */
  tamanho: string
  /** Hash MD5 hexadecimal do arquivo completo. */
  hash: string
  /** Conteúdo em Base64. */
  conteudo: string
}>

/**
 * Parâmetros para {@link SeiConsultasClient.adicionarConteudoArquivo}.
 *
 * Envia uma parte adicional em Base64 para um arquivo temporário iniciado por
 * `adicionarArquivo`. Quando o conteúdo acumulado atinge `tamanho`, o SEI valida
 * o MD5 informado na criação do arquivo.
 *
 * @category Parâmetros de Operação
 */
export type SeiAdicionarConteudoArquivoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do arquivo temporário criado via `adicionarArquivo`. */
  idArquivo: string
  /** Conteúdo em Base64. */
  conteudo: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarAndamentos}. @category Parâmetros de Operação */
export type SeiListarAndamentosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Sinalizador `S`/`N`: retornar os atributos dos andamentos. Padrão `"S"`. */
  sinRetornarAtributos?: string
  /** IDs de andamentos para filtrar a consulta. */
  andamentos?: readonly string[]
  /** IDs de tarefas para filtrar a consulta. */
  tarefas?: readonly string[]
  /** IDs de tarefas de módulos para filtrar a consulta. */
  tarefasModulos?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.listarMarcadoresUnidade}. @category Parâmetros de Operação */
export type SeiListarMarcadoresUnidadeParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarAndamentosMarcadores}. @category Parâmetros de Operação */
export type SeiListarAndamentosMarcadoresParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** IDs de marcadores para filtrar a consulta. */
  marcadores?: readonly string[]
}>

/** Parâmetros para {@link SeiConsultasClient.consultarPublicacao}. @category Parâmetros de Operação */
export type SeiConsultarPublicacaoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador da publicação no SEI. */
  idPublicacao?: string | null
  /** Identificador interno do documento no SEI. */
  idDocumento?: string | null
  /** Protocolo do documento no SEI. */
  protocoloDocumento?: string | null
  /** Sinalizador `S`/`N`: retornar o andamento da publicação. Padrão `"S"`. */
  sinRetornarAndamento?: string
  /** Sinalizador `S`/`N`: retornar as assinaturas. Padrão `"S"`. */
  sinRetornarAssinaturas?: string
}>

/** Parâmetros para {@link SeiConsultasClient.listarFeriados}. @category Parâmetros de Operação */
export type SeiListarFeriadosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do órgão no SEI. */
  idOrgao?: string | null
  /** Data inicial do período (`DD/MM/AAAA`), ou `null`. */
  dataInicial?: string | null
  /** Data final do período (`DD/MM/AAAA`), ou `null`. */
  dataFinal?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.gerarProcedimento}. @category Parâmetros de Operação */
export type SeiGerarProcedimentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Dados do processo a criar. */
  procedimento: SeiProcedimentoInput
  /** Documentos vinculados à operação. */
  documentos?: readonly SeiDocumentoInput[]
  /** Processos relacionados. */
  procedimentosRelacionados?: readonly string[]
  /** IDs de unidades para envio imediato do processo criado. */
  unidadesEnvio?: readonly string[]
  /** Sinalizador `S`/`N`: manter o processo aberto na unidade de origem. */
  sinManterAbertoUnidade?: string | null
  /** Sinalizador `S`/`N`: notificar unidades de destino por e-mail. */
  sinEnviarEmailNotificacao?: string | null
  /** Data de retorno programado (`DD/MM/AAAA`), ou `null`. */
  dataRetornoProgramado?: string | null
  /** Prazo do retorno programado em dias, ou `null`. */
  diasRetornoProgramado?: string | null
  /** Sinalizador `S`/`N`: retorno programado em dias úteis. */
  sinDiasUteisRetornoProgramado?: string | null
  /** Identificador do marcador no SEI. */
  idMarcador?: string | null
  /** Texto do marcador aplicado na criação, ou `null`. */
  textoMarcador?: string | null
  /** Data limite do controle de prazo (`DD/MM/AAAA`), ou `null`. */
  dataControlePrazo?: string | null
  /** Prazo do controle em dias, ou `null`. */
  diasControlePrazo?: string | null
  /** Sinalizador `S`/`N`: prazo do controle em dias úteis. */
  sinDiasUteisControlePrazo?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.incluirDocumento}. @category Parâmetros de Operação */
export type SeiIncluirDocumentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Dados do documento a incluir. */
  documento: SeiDocumentoInput
}>

/** Parâmetros para {@link SeiOperacoesClient.atualizarContatos}. @category Parâmetros de Operação */
export type SeiAtualizarContatosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Lista de contatos com as operações a aplicar. */
  contatos: readonly SeiContatoInput[]
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.cancelarDocumento}.
 *
 * Operação sensível: cancela o documento informado e exige motivo. Execute
 * apenas com massa descartável.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiCancelarDocumentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
  /** Motivo registrado para a operação. */
  motivo: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.bloquearDocumento}.
 *
 * Bloqueia o documento informado. O Web Service não expõe, nesta lib, uma
 * operação simétrica de desbloqueio de documento; valide com documento de teste.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiBloquearDocumentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.gerarBloco}.
 *
 * @remarks
 * O tipo do bloco controla quais protocolos podem ser vinculados. Em HML,
 * documentos foram validados em bloco de assinatura (`Tipo=A`), enquanto
 * processos exigiram bloco interno ou outro tipo compatível.
 *
 * @category Parâmetros de Operação
 */
export type SeiGerarBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Tipo do bloco: `"A"` assinatura, `"R"` reunião, `"I"` interno. */
  tipo: string
  /** Descrição textual do registro. */
  descricao: string
  /** Unidades para as quais o bloco é disponibilizado. */
  unidadesDisponibilizacao?: readonly string[]
  /** Documentos vinculados à operação. */
  documentos?: readonly string[]
  /** Sinalizador `S`/`N`: disponibilizar o bloco imediatamente. */
  sinDisponibilizar?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.alterarBloco}. @category Parâmetros de Operação */
export type SeiAlterarBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Descrição textual do registro. */
  descricao: string
  /** Unidades para as quais o bloco é disponibilizado. */
  unidadesDisponibilizacao?: readonly string[]
}>

/** Parâmetros para {@link SeiOperacoesClient.excluirBloco}. @category Parâmetros de Operação */
export type SeiExcluirBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.excluirProcesso}.
 *
 * Operação destrutiva para processo de teste/rascunho. Não use como limpeza
 * genérica de massa sem confirmar previamente as regras do SEI no ambiente.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiExcluirProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.excluirDocumento}.
 *
 * Operação destrutiva para documento de teste/rascunho. Execute isoladamente,
 * com massa descartável.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiExcluirDocumentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
}>

/** Parâmetros para operações simples de bloco (disponibilizar, concluir, etc.). @category Parâmetros de Operação */
export type SeiOperacaoBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.incluirDocumentoBloco}.
 *
 * @remarks
 * Validado em HML com bloco de assinatura (`Tipo=A`). Essa regra é diferente de
 * inclusão de processo em bloco.
 *
 * @category Parâmetros de Operação
 */
export type SeiIncluirDocumentoBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
  /** Texto de anotação exibido no bloco, opcional. */
  anotacao?: string | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.retirarDocumentoBloco}.
 *
 * @remarks
 * Validado em HML com bloco de assinatura (`Tipo=A`).
 *
 * @category Parâmetros de Operação
 */
export type SeiRetirarDocumentoBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Protocolo do documento no SEI. */
  protocoloDocumento: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.incluirProcessoBloco}.
 *
 * @remarks
 * O SEI rejeita inclusão de processo em bloco de assinatura (`Tipo=A`). Em HML,
 * este fluxo foi validado com bloco interno.
 *
 * @category Parâmetros de Operação
 */
export type SeiIncluirProcessoBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Texto de anotação exibido no bloco, opcional. */
  anotacao?: string | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.retirarProcessoBloco}.
 *
 * @remarks
 * Use com bloco compatível com processos. Em HML, o par incluir/retirar processo
 * foi validado com bloco interno.
 *
 * @category Parâmetros de Operação
 */
export type SeiRetirarProcessoBlocoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador do bloco no SEI. */
  idBloco: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
}>

/** Parâmetros para operações simples de processo (reabrir, concluir, etc.). @category Parâmetros de Operação */
export type SeiOperacaoProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.enviarProcesso}.
 *
 * Tramita o processo para uma ou mais unidades. Para testes, prefira
 * `sinManterAbertoUnidade='S'` quando a unidade de origem precisa seguir usando
 * a mesma massa.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiEnviarProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** IDs das unidades de destino da tramitação. */
  unidadesDestino: readonly string[]
  /** Sinalizador `S`/`N`: manter o processo aberto na unidade de origem. */
  sinManterAbertoUnidade?: string | null
  /** Sinalizador `S`/`N`: remover anotações no envio. */
  sinRemoverAnotacao?: string | null
  /** Sinalizador `S`/`N`: notificar unidades de destino por e-mail. */
  sinEnviarEmailNotificacao?: string | null
  /** Data de retorno programado (`DD/MM/AAAA`), ou `null`. */
  dataRetornoProgramado?: string | null
  /** Prazo do retorno programado em dias, ou `null`. */
  diasRetornoProgramado?: string | null
  /** Sinalizador `S`/`N`: retorno programado em dias úteis. */
  sinDiasUteisRetornoProgramado?: string | null
  /** Sinalizador `S`/`N`: reabrir o processo se estiver concluído. */
  sinReabrir?: string | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.atribuirProcesso}.
 *
 * Altera o usuário responsável pelo processo na unidade. O `idUsuario` deve ser
 * válido para a unidade informada.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiAtribuirProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Identificador interno do usuário no SEI. */
  idUsuario: string
  /** Sinalizador `S`/`N`: reabrir o processo se estiver concluído. */
  sinReabrir?: string | null
}>

/** Parâmetros para {@link SeiOperacoesClient.lancarAndamento}. @category Parâmetros de Operação */
export type SeiLancarAndamentoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Identificador da tarefa de andamento, ou `null`. */
  idTarefa?: string | null
  /** Identificador da tarefa de módulo, ou `null`. */
  idTarefaModulo?: string | null
  /** Atributos do andamento (pares nome/valor). */
  atributos?: readonly SeiAtributoAndamentoInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.relacionarProcesso}. @category Parâmetros de Operação */
export type SeiRelacionarProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do primeiro processo. */
  protocoloProcedimento1: string
  /** Protocolo do segundo processo. */
  protocoloProcedimento2: string
}>

/** Parâmetros para {@link SeiOperacoesClient.sobrestarProcesso}. @category Parâmetros de Operação */
export type SeiSobrestarProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** Protocolo do processo vinculado ao sobrestamento, ou `null`. */
  protocoloProcedimentoVinculado?: string | null
  /** Motivo registrado para a operação. */
  motivo: string
}>

/** Parâmetros para {@link SeiOperacoesClient.anexarProcesso}. @category Parâmetros de Operação */
export type SeiAnexarProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo principal. */
  protocoloProcedimentoPrincipal: string
  /** Protocolo do processo anexado. */
  protocoloProcedimentoAnexado: string
}>

/** Parâmetros para {@link SeiOperacoesClient.desanexarProcesso}. @category Parâmetros de Operação */
export type SeiDesanexarProcessoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo principal. */
  protocoloProcedimentoPrincipal: string
  /** Protocolo do processo anexado. */
  protocoloProcedimentoAnexado: string
  /** Motivo registrado para a operação. */
  motivo: string
}>

/** Parâmetros para {@link SeiOperacoesClient.definirMarcador}. @category Parâmetros de Operação */
export type SeiDefinirMarcadorParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Lista de definições a aplicar. */
  definicoes: readonly SeiDefinicaoMarcadorInput[]
}>

/** Parâmetros para {@link SeiOperacoesClient.definirControlePrazo}. @category Parâmetros de Operação */
export type SeiDefinirControlePrazoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Lista de definições a aplicar. */
  definicoes: readonly SeiDefinicaoControlePrazoInput[]
}>

/** Parâmetros para operações de controle de prazo com lista de processos. @category Parâmetros de Operação */
export type SeiControlePrazoProcessosParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolos dos processos alvo da operação. */
  protocolosProcedimentos: readonly string[]
}>

/** Parâmetros para {@link SeiOperacoesClient.registrarAnotacao}. @category Parâmetros de Operação */
export type SeiRegistrarAnotacaoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Lista de anotações a registrar. */
  anotacoes: readonly SeiAnotacaoInput[]
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.agendarPublicacao}.
 *
 * Cria agendamento de publicação para documento publicável. Para smoke/HML,
 * prefira parear com `cancelarAgendamentoPublicacao` para limpar o agendamento.
 *
 * @category Parâmetros de Operação
 */
export type SeiAgendarPublicacaoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador interno do documento no SEI. */
  idDocumento?: string | null
  /** Protocolo do documento no SEI. */
  protocoloDocumento?: string | null
  /** Motivo da publicação, conforme domínio do SEI, ou `null`. */
  staMotivo?: string | null
  /** Identificador do veículo de publicação no SEI. */
  idVeiculoPublicacao: string
  /** Data de disponibilização da publicação (`DD/MM/AAAA`). */
  dataDisponibilizacao: string
  /** Resumo da publicação, ou `null`. */
  resumo?: string | null
  /** Dados de publicação na Imprensa Nacional, quando aplicável. */
  imprensaNacional?: SeiPublicacaoImprensaNacionalInput | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.alterarPublicacao}.
 *
 * Altera um agendamento existente, identificado por `idPublicacao`, `idDocumento`
 * ou `protocoloDocumento`.
 *
 * @category Parâmetros de Operação
 */
export type SeiAlterarPublicacaoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador da publicação no SEI. */
  idPublicacao?: string | null
  /** Identificador interno do documento no SEI. */
  idDocumento?: string | null
  /** Protocolo do documento no SEI. */
  protocoloDocumento?: string | null
  /** Motivo da publicação, conforme domínio do SEI, ou `null`. */
  staMotivo?: string | null
  /** Identificador do veículo de publicação no SEI. */
  idVeiculoPublicacao: string
  /** Data de disponibilização da publicação (`DD/MM/AAAA`). */
  dataDisponibilizacao: string
  /** Resumo da publicação, ou `null`. */
  resumo?: string | null
  /** Dados de publicação na Imprensa Nacional, quando aplicável. */
  imprensaNacional?: SeiPublicacaoImprensaNacionalInput | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.cancelarAgendamentoPublicacao}.
 *
 * Cancela um agendamento existente e é a operação de limpeza natural para
 * `agendarPublicacao` em testes.
 *
 * @category Parâmetros de Operação
 */
export type SeiCancelarAgendamentoPublicacaoParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Identificador da publicação no SEI. */
  idPublicacao?: string | null
  /** Identificador interno do documento no SEI. */
  idDocumento?: string | null
  /** Protocolo do documento no SEI. */
  protocoloDocumento?: string | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.confirmarDisponibilizacaoPublicacao}.
 *
 * Confirma disponibilização/publicação no veículo informado. É uma operação
 * finalística, sem par simples de reversão no Web Service. Execute apenas com
 * roteiro explícito de confirmação.
 *
 * Ainda não validada de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiConfirmarDisponibilizacaoPublicacaoParams = Readonly<{
  /** Identificador do veículo de publicação no SEI. */
  idVeiculoPublicacao: string
  /** Data de disponibilização no formato aceito pelo SEI, normalmente `DD/MM/AAAA`. */
  dataDisponibilizacao: string
  /** Data de publicação no formato aceito pelo SEI, normalmente `DD/MM/AAAA`. */
  dataPublicacao: string
  /** Número/edição usado na confirmação de publicação. */
  numero: string
  /** Identificadores internos dos documentos a confirmar. */
  idDocumentos: readonly string[]
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.enviarEmail}.
 *
 * Esta operação envia e-mail real pelo SEI e gera documento de e-mail no
 * processo informado. Use apenas com destinatários controlados em smoke/HML.
 *
 * @category Parâmetros de Operação
 */
export type SeiEnviarEmailParams = Readonly<{
  /** Unidade (`IdUnidade`) usada como contexto da operação no SEI. */
  idUnidade: string
  /** Protocolo do processo (ex.: `"00000.000001/2026-01"`). */
  protocoloProcedimento: string
  /** E-mail remetente, ou `null` para usar o padrão da unidade. */
  de?: string | null
  /** E-mails destinatários, no formato aceito pelo SEI. */
  para: string
  /** Endereços em cópia oculta, no formato aceito pelo SEI, ou `null`. */
  cco?: string | null
  /** Assunto do e-mail. */
  assunto: string
  /** Corpo da mensagem. */
  mensagem: string
  /** Identificadores internos dos documentos. */
  idDocumentos?: readonly string[]
  /** Nível de acesso: `"0"` público, `"1"` restrito, `"2"` sigiloso. */
  nivelAcesso?: string | null
  /** Identificador da hipótese legal de restrição de acesso. */
  idHipoteseLegal?: string | null
}>

/**
 * Parâmetros para {@link SeiOperacoesClient.registrarOuvidoria}.
 *
 * Registra manifestação de ouvidoria e cria/reusa contato conforme as regras da
 * instalação do SEI. Requer que o parâmetro `ID_TIPO_CONTATO_OUVIDORIA` esteja
 * configurado; caso contrário, a chamada pode falhar com um erro indicando
 * tipo de contato não informado.
 *
 * Quando `sinAnonimo='N'`, informe dados de contato suficientes para a regra
 * local. Verifique com {@link SeiConsultasClient.listarTiposProcedimentoOuvidoria}
 * se o tipo de procedimento aceita manifestação anônima
 * (`sinOuvidoriaAnonimo`) antes de assumir esse valor.
 *
 * Ainda não validada com sucesso de ponta a ponta contra um ambiente SEI real.
 *
 * @experimental
 * @category Parâmetros de Operação
 */
export type SeiRegistrarOuvidoriaParams = Readonly<{
  /** Órgão no qual a manifestação será registrada. */
  idOrgao: string
  /** Nome do manifestante, quando não anônimo. */
  nome?: string | null
  /** Nome social do manifestante, quando aplicável. */
  nomeSocial?: string | null
  /** E-mail do manifestante, quando não anônimo ou quando retorno for esperado. */
  email?: string | null
  /** CPF do manifestante, quando exigido pela regra local. */
  cpf?: string | null
  /** RG do manifestante, quando exigido pela regra local. */
  rg?: string | null
  /** Órgão expedidor do RG. */
  orgaoExpedidor?: string | null
  /** Telefone de contato do manifestante. */
  telefone?: string | null
  /** Estado do manifestante, quando exigido pela regra local. */
  idEstado?: string | null
  /** Cidade do manifestante, quando exigida pela regra local. */
  idCidade?: string | null
  /** Tipo de procedimento de ouvidoria retornado por `listarTiposProcedimentoOuvidoria`. */
  idTipoProcedimento: string
  /** Processos relacionados informados como texto, conforme contrato SOAP do SEI. */
  processos?: string | null
  /** Indica se deve haver retorno ao manifestante, usando os valores esperados pelo SEI. */
  sinRetorno?: string | null
  /** Texto principal da manifestação. */
  mensagem: string
  /** Atributos adicionais configurados para o formulário/local da ouvidoria. */
  atributosAdicionais?: readonly SeiAtributoOuvidoriaInput[]
  /**
   * Sinalizador `S`/`N`: indica manifestação anônima.
   *
   * Só é aceita quando o tipo de procedimento de ouvidoria permite
   * manifestação anônima (`sinOuvidoriaAnonimo`); confira antes com
   * {@link SeiConsultasClient.listarTiposProcedimentoOuvidoria}.
   */
  sinAnonimo?: string | null
  /** Indica sigilo da manifestação, conforme regra do SEI. */
  sinSigilo?: string | null
  /** Anexos Base64 enviados com a manifestação. */
  anexos?: readonly SeiAnexoInput[]
}>
