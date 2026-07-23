import { describe, expect, it } from "vitest"

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
  mapProcedimentoResumidoOuvidoria,
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
} from "../src/mappers"

const unidadeCompleta = {
  IdUnidade: "110000001",
  Sigla: "CGTI",
  Descricao: "Coordenacao-Geral de Tecnologia",
  SinProtocolo: "S",
  SinArquivamento: "N",
  SinOuvidoria: "N",
}

const usuarioCompleto = {
  IdUsuario: "100000101",
  Sigla: "joao.silva",
  Nome: "João da Silva",
}

const andamentoCompleto = {
  IdAndamento: "9000001",
  IdTarefa: "1",
  IdTarefaModulo: "MOD-1",
  Descricao: "Processo recebido na unidade",
  DataHora: "07/07/2026 10:00:00",
  Unidade: unidadeCompleta,
  Usuario: usuarioCompleto,
  Atributos: [{ Nome: "UNIDADE", Valor: "CGTI", IdOrigem: "110000001" }],
}

const marcadorCompleto = {
  IdMarcador: "300",
  Nome: "Urgente",
  Icone: "prioridade.svg",
  SinAtivo: "S",
}

const assinaturaCompleta = {
  Nome: "João da Silva",
  CargoFuncao: "Coordenador",
  DataHora: "07/07/2026 12:00:00",
  IdUsuario: "100000101",
  IdOrigem: "1",
  IdOrgao: "1",
  Sigla: "joao.silva",
}

const publicacaoCompleta = {
  IdPublicacao: "500",
  IdDocumento: "130000001",
  StaMotivo: "P",
  Resumo: "Resumo da publicação",
  IdVeiculoPublicacao: "1",
  NomeVeiculo: "Boletim Interno",
  StaTipoVeiculo: "I",
  Numero: "42",
  DataDisponibilizacao: "07/07/2026",
  DataPublicacao: "08/07/2026",
  Estado: "PUBLICADO",
  ImprensaNacional: {
    IdVeiculo: "2",
    SiglaVeiculo: "DOU",
    DescricaoVeiculo: "Diário Oficial da União",
    Pagina: "15",
    IdSecao: "1",
    Secao: "Seção 1",
    Data: "08/07/2026",
  },
}

describe("mappers de listas simples", () => {
  it("mapUnidades mapeia campos completos e aplica defaults", () => {
    const [completa, minima] = mapUnidades([
      unidadeCompleta,
      { IdUnidade: "110000002", Sigla: "GAB" },
    ])
    expect(completa).toEqual({
      idUnidade: "110000001",
      sigla: "CGTI",
      descricao: "Coordenacao-Geral de Tecnologia",
      sinProtocolo: true,
      sinArquivamento: false,
      sinOuvidoria: false,
    })
    expect(minima).toEqual({
      idUnidade: "110000002",
      sigla: "GAB",
      descricao: "",
      sinProtocolo: false,
      sinArquivamento: false,
      sinOuvidoria: false,
    })
  })

  it("mapUnidades ignora itens não-mapa e retorna [] para null", () => {
    expect(mapUnidades(null)).toEqual([])
    expect(mapUnidades(["texto", unidadeCompleta])).toHaveLength(1)
  })

  it("mapUsuarios mapeia usuários", () => {
    expect(mapUsuarios([usuarioCompleto])).toEqual([
      { idUsuario: "100000101", sigla: "joao.silva", nome: "João da Silva" },
    ])
  })

  it("mapTiposProcedimento cobre presença e ausência de SinOuvidoriaAnonimo", () => {
    const [comSin, semSin] = mapTiposProcedimento([
      { IdTipoProcedimento: "1", Nome: "Ouvidoria", SinOuvidoriaAnonimo: "S" },
      { IdTipoProcedimento: "2", Nome: "Administrativo" },
    ])
    expect(comSin?.sinOuvidoriaAnonimo).toBe(true)
    expect(semSin?.sinOuvidoriaAnonimo).toBe(false)
  })

  it("mapTiposPrioridade mapeia id e nome", () => {
    expect(mapTiposPrioridade([{ IdTipoPrioridade: "1", Nome: "Alta" }])).toEqual([
      { idTipoPrioridade: "1", nome: "Alta" },
    ])
  })

  it("mapSeries mapeia aplicabilidade opcional", () => {
    const [comAplic, semAplic] = mapSeries([
      { IdSerie: "5", Nome: "Ofício", Aplicabilidade: "T" },
      { IdSerie: "6", Nome: "Despacho" },
    ])
    expect(comAplic?.aplicabilidade).toBe("T")
    expect(semAplic?.aplicabilidade).toBeNull()
  })

  it("mapArquivosExtensao mapeia extensões", () => {
    const [completa, minima] = mapArquivosExtensao([
      { IdArquivoExtensao: "1", Extensao: "pdf", Descricao: "Documento PDF" },
      { IdArquivoExtensao: "2", Extensao: "html" },
    ])
    expect(completa?.descricao).toBe("Documento PDF")
    expect(minima?.descricao).toBe("")
  })

  it("mapHipotesesLegais mapeia hipóteses", () => {
    const [completa, minima] = mapHipotesesLegais([
      { IdHipoteseLegal: "1", Nome: "Sigilo Fiscal", BaseLegal: "CTN art. 198", NivelAcesso: "1" },
      { IdHipoteseLegal: "2", Nome: "Dado Pessoal" },
    ])
    expect(completa).toEqual({
      idHipoteseLegal: "1",
      nome: "Sigilo Fiscal",
      baseLegal: "CTN art. 198",
      nivelAcesso: "1",
    })
    expect(minima?.baseLegal).toBe("")
    expect(minima?.nivelAcesso).toBe("")
  })

  it("mapTiposConferencia mapeia tipos", () => {
    expect(
      mapTiposConferencia([{ IdTipoConferencia: "1", Descricao: "Cópia autenticada" }]),
    ).toEqual([{ idTipoConferencia: "1", descricao: "Cópia autenticada" }])
  })

  it("mapPaises mapeia países", () => {
    expect(mapPaises([{ IdPais: "76", Nome: "Brasil" }])).toEqual([
      { idPais: "76", nome: "Brasil" },
    ])
  })

  it("mapEstados mapeia estados com e sem campos opcionais", () => {
    const [completo, minimo] = mapEstados([
      { IdEstado: "53", IdPais: "76", Sigla: "DF", Nome: "Distrito Federal", CodigoIbge: "53" },
      { IdEstado: "35", Sigla: "SP", Nome: "São Paulo" },
    ])
    expect(completo?.codigoIbge).toBe("53")
    expect(minimo?.idPais).toBe("")
    expect(minimo?.codigoIbge).toBe("")
  })

  it("mapCidades mapeia cidades com e sem campos opcionais", () => {
    const [completa, minima] = mapCidades([
      {
        IdCidade: "5300108",
        IdEstado: "53",
        IdPais: "76",
        Nome: "Brasília",
        CodigoIbge: "5300108",
        SinCapital: "S",
        Latitude: "-15.79",
        Longitude: "-47.88",
      },
      { IdCidade: "3550308", Nome: "São Paulo" },
    ])
    expect(completa?.sinCapital).toBe(true)
    expect(completa?.latitude).toBe("-15.79")
    expect(minima?.sinCapital).toBe(false)
    expect(minima?.longitude).toBe("")
  })

  it("mapCargos mapeia cargos com e sem expressões", () => {
    const [completo, minimo] = mapCargos([
      {
        IdCargo: "1",
        ExpressaoCargo: "Coordenador",
        ExpressaoTratamento: "Senhor",
        ExpressaoVocativo: "Prezado",
      },
      { IdCargo: "2" },
    ])
    expect(completo?.expressaoVocativo).toBe("Prezado")
    expect(minimo?.expressaoCargo).toBe("")
  })

  it("mapMarcadores mapeia marcadores com e sem campos opcionais", () => {
    const [completo, minimo] = mapMarcadores([
      marcadorCompleto,
      { IdMarcador: "301", Nome: "Aguardando" },
    ])
    expect(completo?.icone).toBe("prioridade.svg")
    expect(completo?.sinAtivo).toBe(true)
    expect(minimo?.icone).toBe("")
    expect(minimo?.sinAtivo).toBe(false)
  })

  it("mapFeriados mapeia feriados", () => {
    const [completo, minimo] = mapFeriados([
      { Data: "07/09/2026", Descricao: "Independência" },
      { Data: "12/10/2026" },
    ])
    expect(completo?.descricao).toBe("Independência")
    expect(minimo?.descricao).toBe("")
  })
})

describe("mapContatos", () => {
  it("mapeia contato completo", () => {
    const [contato] = mapContatos([
      {
        StaOperacao: "A",
        IdContato: "200",
        IdTipoContato: "3",
        NomeTipoContato: "Pessoa Física",
        Sigla: "joao.silva",
        Nome: "João da Silva",
        NomeSocial: "João",
        StaNatureza: "F",
        IdContatoAssociado: "201",
        NomeContatoAssociado: "Órgão Associado",
        SinEnderecoAssociado: "S",
        CnpjAssociado: "00000000000191",
        Endereco: "Setor Comercial Sul",
        Complemento: "Bloco B",
        Bairro: "Asa Sul",
        IdCidade: "5300108",
        NomeCidade: "Brasília",
        IdEstado: "53",
        SiglaEstado: "DF",
        IdPais: "76",
        NomePais: "Brasil",
        Cep: "70000-000",
        StaGenero: "M",
        IdCargo: "1",
        ExpressaoCargo: "Analista",
        ExpressaoTratamento: "Senhor",
        ExpressaoVocativo: "Prezado",
        Cpf: "00000000000",
        Cnpj: "",
        Rg: "1234567",
        OrgaoExpedidor: "SSP/DF",
        NumeroPassaporte: "AB123456",
        IdPaisPassaporte: "76",
        NomePaisPassaporte: "Brasil",
        Matricula: "12345",
        MatriculaOab: "",
        TelefoneComercial: "(61) 2027-6400",
        TelefoneResidencial: "",
        TelefoneCelular: "(61) 99999-0000",
        DataNascimento: "01/01/1990",
        Email: "joao.silva@example.gov.br",
        SitioInternet: "https://example.gov.br",
        Observacao: "Contato de teste",
        Conjuge: "Maria da Silva",
        Funcao: "Titular",
        IdTitulo: "1",
        ExpressaoTitulo: "Doutor",
        AbreviaturaTitulo: "Dr.",
        SinAtivo: "S",
        IdCategoria: "10",
        IdNomeCategoria: "Servidores",
      },
    ])
    expect(contato?.idContato).toBe("200")
    expect(contato?.nomeSocial).toBe("João")
    expect(contato?.sinEnderecoAssociado).toBe(true)
    expect(contato?.email).toBe("joao.silva@example.gov.br")
    expect(contato?.abreviaturaTitulo).toBe("Dr.")
    expect(contato?.sinAtivo).toBe(true)
  })

  it("mapeia contato mínimo com defaults", () => {
    const [contato] = mapContatos([{ IdContato: "300" }])
    expect(contato).toMatchObject({
      idContato: "300",
      staOperacao: null,
      idTipoContato: "",
      nomeTipoContato: null,
      sigla: "",
      nome: "",
      nomeSocial: null,
      staNatureza: "",
      sinEnderecoAssociado: false,
      endereco: "",
      cep: "",
      cpf: "",
      email: "",
      sinAtivo: false,
      idCategoria: null,
    })
  })
})

describe("mapAndamentos / mapAndamento", () => {
  it("mapeia andamento completo com unidade, usuário e atributos", () => {
    const [andamento] = mapAndamentos([andamentoCompleto])
    expect(andamento?.idAndamento).toBe("9000001")
    expect(andamento?.unidade.sigla).toBe("CGTI")
    expect(andamento?.usuario.sigla).toBe("joao.silva")
    expect(andamento?.atributos).toEqual([
      { nome: "UNIDADE", valor: "CGTI", idOrigem: "110000001" },
    ])
  })

  it("aplica defaults quando unidade/usuário ausentes", () => {
    const [andamento] = mapAndamentos([{ Descricao: "Sem vínculos" }])
    expect(andamento?.idAndamento).toBeNull()
    expect(andamento?.unidade.idUnidade).toBe("")
    expect(andamento?.usuario.idUsuario).toBe("")
    expect(andamento?.atributos).toEqual([])
  })

  it("mapAndamento retorna null para valores não-mapa", () => {
    expect(mapAndamento(null)).toBeNull()
    expect(mapAndamento("texto")).toBeNull()
    expect(mapAndamento(andamentoCompleto)?.descricao).toBe("Processo recebido na unidade")
  })

  it("atributos sem valor recebem string vazia", () => {
    const [andamento] = mapAndamentos([{ Atributos: [{ Nome: "UNIDADE" }] }])
    expect(andamento?.atributos).toEqual([{ nome: "UNIDADE", valor: "", idOrigem: "" }])
  })
})

describe("mapAndamentosMarcadores", () => {
  it("mapeia andamento de marcador completo", () => {
    const [am] = mapAndamentosMarcadores([
      {
        IdAndamentoMarcador: "800",
        Texto: "Aguardando parecer",
        DataHora: "07/07/2026 09:00:00",
        Usuario: usuarioCompleto,
        Marcador: marcadorCompleto,
      },
    ])
    expect(am?.idAndamentoMarcador).toBe("800")
    expect(am?.usuario.sigla).toBe("joao.silva")
    expect(am?.marcador.nome).toBe("Urgente")
    expect(am?.marcador.sinAtivo).toBe(true)
  })

  it("aplica defaults quando usuário e marcador ausentes", () => {
    const [am] = mapAndamentosMarcadores([{ Texto: "Sem marcador" }])
    expect(am?.idAndamentoMarcador).toBeNull()
    expect(am?.dataHora).toBe("")
    expect(am?.usuario).toEqual({ idUsuario: "", sigla: "", nome: "" })
    expect(am?.marcador).toEqual({ idMarcador: "", nome: "", icone: "", sinAtivo: false })
  })
})

describe("mapRetornoGeracaoProcedimento", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoGeracaoProcedimento(null)).toBeNull()
    expect(mapRetornoGeracaoProcedimento("texto")).toBeNull()
  })

  it("mapeia retorno completo com documentos incluídos", () => {
    const retorno = mapRetornoGeracaoProcedimento({
      IdProcedimento: "120000001",
      ProcedimentoFormatado: "00000.000001/2026-01",
      LinkAcesso: "https://sei.example.gov.br/protocolo",
      RetornoInclusaoDocumentos: [
        {
          IdDocumento: "130000001",
          DocumentoFormatado: "0000001",
          LinkAcesso: "https://sei.example.gov.br/documento",
        },
      ],
    })
    expect(retorno?.idProcedimento).toBe("120000001")
    expect(retorno?.retornoInclusaoDocumentos).toHaveLength(1)
    expect(retorno?.retornoInclusaoDocumentos[0]?.idDocumento).toBe("130000001")
  })

  it("aplica defaults em retorno mínimo", () => {
    const retorno = mapRetornoGeracaoProcedimento({ IdProcedimento: "120000002" })
    expect(retorno?.procedimentoFormatado).toBe("")
    expect(retorno?.linkAcesso).toBe("")
    expect(retorno?.retornoInclusaoDocumentos).toEqual([])
  })
})

describe("mapRetornoInclusaoDocumento", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoInclusaoDocumento(null)).toBeNull()
  })

  it("mapeia retorno com e sem campos opcionais", () => {
    const completo = mapRetornoInclusaoDocumento({
      IdDocumento: "130000001",
      DocumentoFormatado: "0000001",
      LinkAcesso: "https://sei.example.gov.br/documento",
    })
    expect(completo?.documentoFormatado).toBe("0000001")

    const minimo = mapRetornoInclusaoDocumento({ IdDocumento: "130000002" })
    expect(minimo?.documentoFormatado).toBe("")
    expect(minimo?.linkAcesso).toBe("")
  })
})

describe("mapRetornoConsultaProcedimento", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoConsultaProcedimento(null)).toBeNull()
  })

  it("mapeia consulta completa com estruturas aninhadas", () => {
    const retorno = mapRetornoConsultaProcedimento({
      IdProcedimento: "120000001",
      ProcedimentoFormatado: "00000.000001/2026-01",
      Especificacao: "Integração",
      DataAutuacao: "07/07/2026",
      LinkAcesso: "https://sei.example.gov.br/protocolo",
      NivelAcessoLocal: "0",
      NivelAcessoGlobal: "0",
      TipoProcedimento: {
        IdTipoProcedimento: "100000001",
        Nome: "Processo de Teste",
        SinOuvidoriaAnonimo: "N",
      },
      AndamentoGeracao: andamentoCompleto,
      AndamentoConclusao: andamentoCompleto,
      UltimoAndamento: andamentoCompleto,
      UnidadesProcedimentoAberto: [
        { Unidade: unidadeCompleta, UsuarioAtribuicao: usuarioCompleto },
        {},
      ],
      Assuntos: [
        { CodigoEstruturado: "01.01", Descricao: "Assunto teste" },
        { CodigoEstruturado: "02.02" },
      ],
      Interessados: [
        {
          IdContato: "200",
          Cpf: "00000000000",
          Cnpj: null,
          Sigla: "joao.silva",
          Nome: "João da Silva",
        },
      ],
      Observacoes: [{ Descricao: "Observação", Unidade: unidadeCompleta }, {}],
      ProcedimentosRelacionados: [
        {
          IdProcedimento: "120000009",
          ProcedimentoFormatado: "00000.000009/2026-09",
          TipoProcedimento: {
            IdTipoProcedimento: "100000001",
            Nome: "Processo de Teste",
          },
        },
      ],
      ProcedimentosAnexados: [{ IdProcedimento: "120000010" }],
      TipoPrioridade: { IdTipoPrioridade: "1", Nome: "Alta" },
    })
    expect(retorno?.tipoProcedimento.nome).toBe("Processo de Teste")
    expect(retorno?.andamentoGeracao?.unidade.sigla).toBe("CGTI")
    expect(retorno?.unidadesProcedimentoAberto).toHaveLength(2)
    expect(retorno?.unidadesProcedimentoAberto[1]?.unidade.idUnidade).toBe("")
    expect(retorno?.assuntos[1]?.descricao).toBeNull()
    expect(retorno?.interessados[0]?.cpf).toBe("00000000000")
    expect(retorno?.observacoes[1]?.unidade.idUnidade).toBe("")
    expect(retorno?.procedimentosRelacionados[0]?.tipoProcedimento.sinOuvidoriaAnonimo).toBe(false)
    expect(retorno?.procedimentosAnexados[0]?.tipoProcedimento.idTipoProcedimento).toBe("")
    expect(retorno?.tipoPrioridade?.nome).toBe("Alta")
  })

  it("aplica defaults em consulta mínima", () => {
    const retorno = mapRetornoConsultaProcedimento({ IdProcedimento: "120000002" })
    expect(retorno?.tipoProcedimento).toEqual({
      idTipoProcedimento: "",
      nome: "",
      sinOuvidoriaAnonimo: false,
    })
    expect(retorno?.nivelAcessoLocal).toBeNull()
    expect(retorno?.andamentoGeracao).toBeNull()
    expect(retorno?.ultimoAndamento).toBeNull()
    expect(retorno?.assuntos).toEqual([])
    expect(retorno?.tipoPrioridade).toBeNull()
  })
})

describe("mapProcedimentoResumido / mapProcedimentoResumidoOuvidoria", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapProcedimentoResumido(null)).toBeNull()
    expect(mapProcedimentoResumidoOuvidoria("texto")).toBeNull()
  })

  it("mapeia resumo com e sem tipo de procedimento", () => {
    const completo = mapProcedimentoResumido({
      IdProcedimento: "120000001",
      ProcedimentoFormatado: "00000.000001/2026-01",
      TipoProcedimento: {
        IdTipoProcedimento: "100000001",
        Nome: "Ouvidoria",
        SinOuvidoriaAnonimo: "S",
      },
    })
    expect(completo?.tipoProcedimento.sinOuvidoriaAnonimo).toBe(true)

    const minimo = mapProcedimentoResumidoOuvidoria({ IdProcedimento: "120000002" })
    expect(minimo?.procedimentoFormatado).toBe("")
    expect(minimo?.tipoProcedimento.idTipoProcedimento).toBe("")
  })
})

describe("mapRetornoConsultaDocumento", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoConsultaDocumento(null)).toBeNull()
  })

  it("mapeia consulta completa com série, publicação, campos e blocos", () => {
    const retorno = mapRetornoConsultaDocumento({
      IdProcedimento: "120000001",
      ProcedimentoFormatado: "00000.000001/2026-01",
      IdDocumento: "130000001",
      DocumentoFormatado: "0000001",
      LinkAcesso: "https://sei.example.gov.br/documento",
      NivelAcessoLocal: "0",
      NivelAcessoGlobal: "0",
      Serie: { IdSerie: "5", Nome: "Ofício", Aplicabilidade: "T" },
      Numero: "42",
      NomeArvore: "Ofício 42",
      DinValor: "0",
      Descricao: "Documento de teste",
      Data: "07/07/2026",
      UnidadeElaboradora: unidadeCompleta,
      AndamentoGeracao: andamentoCompleto,
      Assinaturas: [assinaturaCompleta, {}],
      Publicacao: publicacaoCompleta,
      Campos: [{ Nome: "Campo1", Valor: "Valor1" }, { Nome: "Campo2" }],
      Blocos: [
        {
          IdBloco: "700",
          Unidade: unidadeCompleta,
          Usuario: usuarioCompleto,
          Descricao: "Bloco de assinatura",
          Tipo: "A",
          Estado: "A",
          SinPrioridade: "N",
          SinRevisao: "S",
          UsuarioAtribuicao: usuarioCompleto,
          UnidadesDisponibilizacao: [unidadeCompleta],
        },
        { IdBloco: "701" },
      ],
    })
    expect(retorno?.serie?.nome).toBe("Ofício")
    expect(retorno?.unidadeElaboradora?.sigla).toBe("CGTI")
    expect(retorno?.assinaturas[0]?.nome).toBe("João da Silva")
    expect(retorno?.assinaturas[1]?.nome).toBe("")
    expect(retorno?.publicacao?.imprensaNacional.siglaVeiculo).toBe("DOU")
    expect(retorno?.campos[1]?.valor).toBe("")
    expect(retorno?.blocos[0]?.sinRevisao).toBe(true)
    expect(retorno?.blocos[0]?.unidadesDisponibilizacao[0]?.sigla).toBe("CGTI")
    expect(retorno?.blocos[1]?.unidade.idUnidade).toBe("")
    expect(retorno?.blocos[1]?.usuarioAtribuicao.idUsuario).toBe("")
  })

  it("aplica defaults em consulta mínima", () => {
    const retorno = mapRetornoConsultaDocumento({ IdDocumento: "130000002" })
    expect(retorno?.idProcedimento).toBe("")
    expect(retorno?.serie).toBeNull()
    expect(retorno?.dinValor).toBeNull()
    expect(retorno?.unidadeElaboradora).toBeNull()
    expect(retorno?.andamentoGeracao).toBeNull()
    expect(retorno?.publicacao).toBeNull()
    expect(retorno?.assinaturas).toEqual([])
    expect(retorno?.blocos).toEqual([])
  })
})

describe("mapRetornoConsultaBloco", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoConsultaBloco(null)).toBeNull()
  })

  it("mapeia bloco completo com protocolos", () => {
    const retorno = mapRetornoConsultaBloco({
      IdBloco: "700",
      Unidade: unidadeCompleta,
      Usuario: usuarioCompleto,
      Descricao: "Bloco de assinatura",
      Tipo: "A",
      Estado: "A",
      SinPrioridade: "S",
      SinRevisao: "N",
      UsuarioAtribuicao: usuarioCompleto,
      UnidadesDisponibilizacao: [unidadeCompleta],
      Protocolos: [
        {
          ProtocoloFormatado: "0000001",
          Identificacao: "Ofício 42",
          Assinaturas: [assinaturaCompleta],
        },
        {},
      ],
    })
    expect(retorno?.unidade?.sigla).toBe("CGTI")
    expect(retorno?.sinPrioridade).toBe(true)
    expect(retorno?.protocolos[0]?.assinaturas[0]?.cargoFuncao).toBe("Coordenador")
    expect(retorno?.protocolos[1]?.protocoloFormatado).toBe("")
  })

  it("aplica defaults em bloco mínimo", () => {
    const retorno = mapRetornoConsultaBloco({ IdBloco: "701" })
    expect(retorno?.unidade).toBeNull()
    expect(retorno?.usuario).toBeNull()
    expect(retorno?.usuarioAtribuicao).toBeNull()
    expect(retorno?.protocolos).toEqual([])
  })
})

describe("mapRetornoConsultaPublicacao", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoConsultaPublicacao(null)).toBeNull()
  })

  it("mapeia publicação completa", () => {
    const retorno = mapRetornoConsultaPublicacao({
      Publicacao: publicacaoCompleta,
      Andamento: andamentoCompleto,
      Assinaturas: [assinaturaCompleta],
    })
    expect(retorno?.publicacao?.nomeVeiculo).toBe("Boletim Interno")
    expect(retorno?.publicacao?.imprensaNacional.pagina).toBe("15")
    expect(retorno?.andamento?.idAndamento).toBe("9000001")
    expect(retorno?.assinaturas).toHaveLength(1)
  })

  it("mapeia publicação sem Imprensa Nacional com defaults", () => {
    const retorno = mapRetornoConsultaPublicacao({
      Publicacao: { NomeVeiculo: "Boletim Interno" },
    })
    expect(retorno?.publicacao?.idPublicacao).toBeNull()
    expect(retorno?.publicacao?.imprensaNacional).toEqual({
      idVeiculo: null,
      siglaVeiculo: null,
      descricaoVeiculo: null,
      pagina: "",
      idSecao: null,
      secao: null,
      data: "",
    })
    expect(retorno?.andamento).toBeNull()
    expect(retorno?.assinaturas).toEqual([])
  })
})

describe("mapRetornoEnvioEmail", () => {
  it("retorna null para valores não-mapa", () => {
    expect(mapRetornoEnvioEmail(null)).toBeNull()
  })

  it("mapeia retorno com e sem campos opcionais", () => {
    const completo = mapRetornoEnvioEmail({
      IdDocumento: "130000001",
      DocumentoFormatado: "0000001",
      LinkAcesso: "https://sei.example.gov.br/documento",
    })
    expect(completo?.linkAcesso).toBe("https://sei.example.gov.br/documento")

    const minimo = mapRetornoEnvioEmail({ IdDocumento: "130000002" })
    expect(minimo?.documentoFormatado).toBe("")
    expect(minimo?.linkAcesso).toBe("")
  })
})
