import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildSeiSoapEnvelope,
  createSeiClient,
  createSeiSoapArray,
  encodeSeiBase64,
  parseSeiSoapResponse,
  SeiSoapError,
} from "../src"
import { mapRetornoConsultaProcedimento, mapUnidades } from "../src/mappers"

const config = {
  endpointUrl: "https://sei.example.gov.br/sei/ws/SeiWS.php",
  siglaSistema: "SGI",
  identificacaoServico: "sei-access-key",
  requestTimeoutMs: 30_000,
}

const response = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  })

const unidadesResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="Sei">
  <SOAP-ENV:Body>
    <ns1:listarUnidadesResponse>
      <return>
        <item>
          <IdUnidade>110000001</IdUnidade>
          <Sigla>CGTI</Sigla>
          <Descricao>Coordenacao-Geral de Tecnologia</Descricao>
          <SinProtocolo>S</SinProtocolo>
          <SinArquivamento>N</SinArquivamento>
          <SinOuvidoria>N</SinOuvidoria>
        </item>
      </return>
    </ns1:listarUnidadesResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const procedimentoResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="Sei">
  <SOAP-ENV:Body>
    <ns1:consultarProcedimentoResponse>
      <return>
        <IdProcedimento>120000001</IdProcedimento>
        <ProcedimentoFormatado>00000.000001/2026-01</ProcedimentoFormatado>
        <Especificacao>Teste</Especificacao>
        <DataAutuacao>07/07/2026</DataAutuacao>
        <LinkAcesso>https://sei.example.gov.br/protocolo</LinkAcesso>
        <NivelAcessoLocal>0</NivelAcessoLocal>
        <NivelAcessoGlobal>0</NivelAcessoGlobal>
        <TipoProcedimento>
          <IdTipoProcedimento>100000001</IdTipoProcedimento>
          <Nome>Processo de Teste</Nome>
          <SinOuvidoriaAnonimo>N</SinOuvidoriaAnonimo>
        </TipoProcedimento>
        <Assuntos>
          <item>
            <CodigoEstruturado>01.01</CodigoEstruturado>
            <Descricao>Assunto teste</Descricao>
          </item>
        </Assuntos>
        <Interessados>
          <item>
            <IdContato>200</IdContato>
            <Nome>Interessado Teste</Nome>
          </item>
        </Interessados>
      </return>
    </ns1:consultarProcedimentoResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const faultResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <SOAP-ENV:Fault>
      <faultstring>Servico nao liberado.</faultstring>
    </SOAP-ENV:Fault>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const stringResponse = (operation: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="Sei">
  <SOAP-ENV:Body>
    <ns1:${operation}Response>
      <return>OK</return>
    </ns1:${operation}Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const emptyResponse = (
  operation: string,
  returnTag = "return",
): string => `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="Sei">
  <SOAP-ENV:Body>
    <ns1:${operation}Response>
      <${returnTag}/>
    </ns1:${operation}Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const fetchMock = () => vi.mocked(fetch)

const requestBody = (callIndex: number): string => {
  const init = fetchMock().mock.calls[callIndex]?.[1] as RequestInit | undefined
  return String(init?.body ?? "")
}

describe("Sei SOAP", () => {
  it("codifica conteúdo em Base64 UTF-8", () => {
    expect(encodeSeiBase64("Ação")).toBe("QcOnw6Nv")
  })

  it("monta envelope RPC/encoded com namespace, nil e arrays tipados", () => {
    const envelope = buildSeiSoapEnvelope({
      operation: "gerarProcedimento",
      params: {
        SiglaSistema: "SGI",
        IdentificacaoServico: "abc&123",
        IdUnidade: "110000001",
        ProcedimentosRelacionados: createSeiSoapArray("ArrayOfIdProcedimento", "xsd:string", [
          "120000001",
        ]),
        DataRetornoProgramado: null,
      },
    })

    expect(envelope).toContain("<sei:gerarProcedimento")
    expect(envelope).toContain(
      '<IdentificacaoServico xsi:type="xsd:string">abc&amp;123</IdentificacaoServico>',
    )
    expect(envelope).toContain('<DataRetornoProgramado xsi:nil="true" />')
    expect(envelope).toContain(
      '<ProcedimentosRelacionados SOAP-ENC:arrayType="xsd:string[1]" xsi:type="sei:ArrayOfIdProcedimento">',
    )
  })

  it("parseia e mapeia listagem de unidades", () => {
    const payload = parseSeiSoapResponse(unidadesResponse, "listarUnidades")

    expect(mapUnidades(payload)).toEqual([
      {
        idUnidade: "110000001",
        sigla: "CGTI",
        descricao: "Coordenacao-Geral de Tecnologia",
        sinProtocolo: true,
        sinArquivamento: false,
        sinOuvidoria: false,
      },
    ])
  })

  it("parseia e mapeia consulta de procedimento", () => {
    const payload = parseSeiSoapResponse(procedimentoResponse, "consultarProcedimento")

    expect(mapRetornoConsultaProcedimento(payload)).toMatchObject({
      idProcedimento: "120000001",
      procedimentoFormatado: "00000.000001/2026-01",
      tipoProcedimento: {
        idTipoProcedimento: "100000001",
        nome: "Processo de Teste",
      },
      assuntos: [
        {
          codigoEstruturado: "01.01",
          descricao: "Assunto teste",
        },
      ],
      interessados: [
        {
          idContato: "200",
          nome: "Interessado Teste",
        },
      ],
    })
  })

  it("lança SeiSoapError para SOAP Fault", () => {
    expect(() => parseSeiSoapResponse(faultResponse, "listarUnidades")).toThrow(SeiSoapError)
  })
})

describe("SeiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("lista unidades sem enviar IdUnidade, conforme assinatura do SeiWS.php", async () => {
    fetchMock().mockResolvedValueOnce(response(unidadesResponse))

    const sei = createSeiClient(config)
    const unidades = await sei.consultas.listarUnidades({ idTipoProcedimento: "100000001" })

    expect(unidades).toHaveLength(1)
    expect(requestBody(0)).toContain("<sei:listarUnidades")
    expect(requestBody(0)).toContain("<SiglaSistema")
    expect(requestBody(0)).toContain("<IdentificacaoServico")
    expect(requestBody(0)).toContain("<IdTipoProcedimento")
    expect(requestBody(0)).not.toContain("<IdUnidade")
  })

  it("consulta procedimento com parâmetros de retorno padrão", async () => {
    fetchMock().mockResolvedValueOnce(response(procedimentoResponse))

    const sei = createSeiClient(config)
    const procedimento = await sei.consultas.consultarProcedimento({
      idUnidade: "110000001",
      protocoloProcedimento: "00000.000001/2026-01",
    })

    expect(procedimento?.idProcedimento).toBe("120000001")
    expect(requestBody(0)).toContain("<sei:consultarProcedimento")
    expect(requestBody(0)).toContain("<IdUnidade")
    expect(requestBody(0)).toContain("<ProtocoloProcedimento")
    expect(requestBody(0)).toContain("<SinRetornarAssuntos")
    expect(requestBody(0)).toContain(">S</SinRetornarAssuntos>")
  })

  it("executa operações reversíveis do ciclo 4 com protocolos esperados", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(stringResponse("concluirProcesso")))
      .mockResolvedValueOnce(response(stringResponse("reabrirProcesso")))
      .mockResolvedValueOnce(response(stringResponse("relacionarProcesso")))
      .mockResolvedValueOnce(response(stringResponse("desanexarProcesso")))
      .mockResolvedValueOnce(response(stringResponse("sobrestarProcesso")))

    const sei = createSeiClient(config)

    await expect(
      sei.operacoes.concluirProcesso({
        idUnidade: "110000036",
        protocoloProcedimento: "00261.000004/2026-64",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.reabrirProcesso({
        idUnidade: "110000036",
        protocoloProcedimento: "00261.000004/2026-64",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.relacionarProcesso({
        idUnidade: "110000036",
        protocoloProcedimento1: "00261.000004/2026-64",
        protocoloProcedimento2: "00261.000005/2026-17",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.desanexarProcesso({
        idUnidade: "110000036",
        protocoloProcedimentoPrincipal: "00261.000005/2026-17",
        protocoloProcedimentoAnexado: "00261.000004/2026-64",
        motivo: "Smoke ciclo 4",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.sobrestarProcesso({
        idUnidade: "110000036",
        protocoloProcedimento: "00261.000004/2026-64",
        protocoloProcedimentoVinculado: "00261.000005/2026-17",
        motivo: "Smoke ciclo 4",
      }),
    ).resolves.toBe("OK")

    expect(requestBody(0)).toContain("<sei:concluirProcesso")
    expect(requestBody(0)).toContain("<ProtocoloProcedimento")
    expect(requestBody(0)).toContain(">00261.000004/2026-64</ProtocoloProcedimento>")
    expect(requestBody(2)).toContain("<sei:relacionarProcesso")
    expect(requestBody(2)).toContain("<ProtocoloProcedimento2")
    expect(requestBody(2)).toContain(">00261.000005/2026-17</ProtocoloProcedimento2>")
    expect(requestBody(3)).toContain("<sei:desanexarProcesso")
    expect(requestBody(3)).toContain("<Motivo")
    expect(requestBody(3)).toContain(">Smoke ciclo 4</Motivo>")
    expect(requestBody(4)).toContain("<sei:sobrestarProcesso")
    expect(requestBody(4)).toContain("<ProtocoloProcedimentoVinculado")
    expect(requestBody(4)).toContain(">00261.000005/2026-17</ProtocoloProcedimentoVinculado>")
  })

  it("executa operações de bloco do ciclo 5 com id e protocolos esperados", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(stringResponse("gerarBloco").replace(">OK<", ">1500<")))
      .mockResolvedValueOnce(response(stringResponse("alterarBloco")))
      .mockResolvedValueOnce(response(stringResponse("incluirDocumentoBloco")))
      .mockResolvedValueOnce(response(stringResponse("retirarProcessoBloco")))
      .mockResolvedValueOnce(response(stringResponse("excluirBloco")))
      .mockResolvedValueOnce(response(stringResponse("devolverBloco")))

    const sei = createSeiClient(config)

    await expect(
      sei.operacoes.gerarBloco({
        idUnidade: "110000036",
        tipo: "A",
        descricao: "Smoke bloco",
        unidadesDisponibilizacao: ["110000029"],
      }),
    ).resolves.toBe("1500")
    await expect(
      sei.operacoes.alterarBloco({
        idUnidade: "110000036",
        idBloco: "1500",
        descricao: "Smoke bloco alterado",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.incluirDocumentoBloco({
        idUnidade: "110000036",
        idBloco: "1500",
        protocoloDocumento: "0178401",
        anotacao: "Smoke",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.retirarProcessoBloco({
        idUnidade: "110000036",
        idBloco: "1500",
        protocoloProcedimento: "00261.000004/2026-64",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.excluirBloco({
        idUnidade: "110000036",
        idBloco: "1500",
      }),
    ).resolves.toBe("OK")
    await expect(
      sei.operacoes.devolverBloco({
        idUnidade: "110000036",
        idBloco: "865",
      }),
    ).resolves.toBe("OK")

    expect(requestBody(0)).toContain("<sei:gerarBloco")
    expect(requestBody(0)).toContain("<Tipo")
    expect(requestBody(0)).toContain(">A</Tipo>")
    expect(requestBody(0)).toContain("<UnidadesDisponibilizacao")
    expect(requestBody(1)).toContain("<sei:alterarBloco")
    expect(requestBody(1)).toContain(">1500</IdBloco>")
    expect(requestBody(2)).toContain("<sei:incluirDocumentoBloco")
    expect(requestBody(2)).toContain(">0178401</ProtocoloDocumento>")
    expect(requestBody(3)).toContain("<sei:retirarProcessoBloco")
    expect(requestBody(3)).toContain(">00261.000004/2026-64</ProtocoloProcedimento>")
    expect(requestBody(4)).toContain("<sei:excluirBloco")
    expect(requestBody(4)).toContain(">1500</IdBloco>")
    expect(requestBody(5)).toContain("<sei:devolverBloco")
    expect(requestBody(5)).toContain(">865</IdBloco>")
  })

  it("cobre consultas e operações SOAP restantes com payloads mínimos", async () => {
    const sei = createSeiClient(config)
    const calls: Array<{
      operation: string
      responseXml?: string
      run: () => Promise<unknown>
      expected?: string[]
    }> = [
      {
        operation: "listarTiposProcedimento",
        run: () => sei.consultas.listarTiposProcedimento({ idUnidade: "110000036" }),
        expected: ["<IdUnidade", "110000036"],
      },
      {
        operation: "listarTiposPrioridade",
        run: () => sei.consultas.listarTiposPrioridade({ idUnidade: "110000036" }),
      },
      {
        operation: "listarSeries",
        run: () => sei.consultas.listarSeries({ idUnidade: "110000036" }),
      },
      {
        operation: "listarContatos",
        run: () => sei.consultas.listarContatos({ idUnidade: "110000036", paginaAtual: "1" }),
      },
      {
        operation: "consultarProcedimentoIndividual",
        run: () =>
          sei.consultas.consultarProcedimentoIndividual({
            idUnidade: "110000036",
            idOrgaoProcedimento: "0",
            idTipoProcedimento: "100000337",
            idOrgaoUsuario: "0",
            siglaUsuario: "usuario.teste",
          }),
      },
      {
        operation: "consultarDocumento",
        run: () =>
          sei.consultas.consultarDocumento({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "consultarBloco",
        run: () => sei.consultas.consultarBloco({ idUnidade: "110000036", idBloco: "1500" }),
      },
      {
        operation: "listarExtensoesPermitidas",
        run: () => sei.consultas.listarExtensoesPermitidas({ idUnidade: "110000036" }),
      },
      {
        operation: "listarUsuarios",
        run: () => sei.consultas.listarUsuarios({ idUnidade: "110000036" }),
      },
      {
        operation: "listarHipotesesLegais",
        run: () => sei.consultas.listarHipotesesLegais({ idUnidade: "110000036" }),
      },
      {
        operation: "listarTiposConferencia",
        run: () => sei.consultas.listarTiposConferencia({ idUnidade: "110000036" }),
      },
      {
        operation: "listarPaises",
        run: () => sei.consultas.listarPaises({ idUnidade: "110000036" }),
      },
      {
        operation: "listarEstados",
        run: () => sei.consultas.listarEstados({ idUnidade: "110000036", idPais: "1" }),
      },
      {
        operation: "listarCidades",
        run: () => sei.consultas.listarCidades({ idUnidade: "110000036", idEstado: "1" }),
      },
      {
        operation: "listarTiposProcedimentoOuvidoria",
        run: () => sei.consultas.listarTiposProcedimentoOuvidoria(),
      },
      {
        operation: "listarCargos",
        run: () => sei.consultas.listarCargos({ idUnidade: "110000036" }),
      },
      {
        operation: "adicionarArquivo",
        responseXml: stringResponse("adicionarArquivo"),
        run: () =>
          sei.consultas.adicionarArquivo({
            idUnidade: "110000036",
            nome: "teste.txt",
            tamanho: "4",
            hash: "abcd",
            conteudo: "dGVzdA==",
          }),
      },
      {
        operation: "adicionarConteudoArquivo",
        responseXml: stringResponse("adicionarConteudoArquivo"),
        run: () =>
          sei.consultas.adicionarConteudoArquivo({
            idUnidade: "110000036",
            idArquivo: "140563",
            conteudo: "dGU=",
          }),
      },
      {
        operation: "listarAndamentos",
        run: () =>
          sei.consultas.listarAndamentos({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "listarMarcadoresUnidade",
        run: () => sei.consultas.listarMarcadoresUnidade({ idUnidade: "110000036" }),
      },
      {
        operation: "listarAndamentosMarcadores",
        run: () =>
          sei.consultas.listarAndamentosMarcadores({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "consultarPublicacao",
        run: () => sei.consultas.consultarPublicacao({ idUnidade: "110000036" }),
      },
      {
        operation: "listarFeriados",
        run: () => sei.consultas.listarFeriados({ idUnidade: "110000036" }),
      },
      {
        operation: "gerarProcedimento",
        run: () =>
          sei.operacoes.gerarProcedimento({
            idUnidade: "110000036",
            procedimento: {
              idTipoProcedimento: "100000337",
              especificacao: "Teste",
              assuntos: [{ codigoEstruturado: "01.01" }],
              interessados: [{ nome: "Interessado" }],
              nivelAcesso: "0",
            },
          }),
      },
      {
        operation: "incluirDocumento",
        run: () =>
          sei.operacoes.incluirDocumento({
            idUnidade: "110000036",
            documento: {
              tipo: "G",
              idSerie: "100",
              numero: "1",
              descricao: "Teste",
              conteudo: "PHA+VGVzdGU8L3A+",
              nivelAcesso: "0",
            },
          }),
      },
      {
        operation: "atualizarContatos",
        responseXml: stringResponse("atualizarContatos"),
        run: () =>
          sei.operacoes.atualizarContatos({
            idUnidade: "110000036",
            contatos: [
              {
                staOperacao: "R",
                idContato: "100000196",
                idTipoContato: "",
                sigla: "",
                nome: "Smoke",
                staNatureza: "",
                sinEnderecoAssociado: "N",
                endereco: "",
                complemento: "",
                bairro: "",
                cep: "",
                staGenero: "",
                cpf: "",
                cnpj: "",
                rg: "",
                orgaoExpedidor: "",
                matricula: "",
                matriculaOab: "",
                telefoneComercial: "",
                telefoneResidencial: "",
                telefoneCelular: "",
                dataNascimento: "",
                email: "",
                sitioInternet: "",
                observacao: "Teste",
                sinAtivo: "S",
              },
            ],
          }),
      },
      {
        operation: "cancelarDocumento",
        responseXml: stringResponse("cancelarDocumento"),
        run: () =>
          sei.operacoes.cancelarDocumento({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
            motivo: "Teste",
          }),
      },
      {
        operation: "bloquearDocumento",
        responseXml: stringResponse("bloquearDocumento"),
        run: () =>
          sei.operacoes.bloquearDocumento({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "excluirProcesso",
        responseXml: stringResponse("excluirProcesso"),
        run: () =>
          sei.operacoes.excluirProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "excluirDocumento",
        responseXml: stringResponse("excluirDocumento"),
        run: () =>
          sei.operacoes.excluirDocumento({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "disponibilizarBloco",
        responseXml: stringResponse("disponibilizarBloco"),
        run: () => sei.operacoes.disponibilizarBloco({ idUnidade: "110000036", idBloco: "1500" }),
      },
      {
        operation: "cancelarDisponibilizacaoBloco",
        responseXml: stringResponse("cancelarDisponibilizacaoBloco"),
        run: () =>
          sei.operacoes.cancelarDisponibilizacaoBloco({
            idUnidade: "110000036",
            idBloco: "1500",
          }),
      },
      {
        operation: "concluirBloco",
        responseXml: stringResponse("concluirBloco"),
        run: () => sei.operacoes.concluirBloco({ idUnidade: "110000036", idBloco: "1500" }),
      },
      {
        operation: "reabrirBloco",
        responseXml: stringResponse("reabrirBloco"),
        run: () => sei.operacoes.reabrirBloco({ idUnidade: "110000036", idBloco: "1500" }),
      },
      {
        operation: "incluirProcessoBloco",
        responseXml: stringResponse("incluirProcessoBloco"),
        run: () =>
          sei.operacoes.incluirProcessoBloco({
            idUnidade: "110000036",
            idBloco: "1500",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "retirarDocumentoBloco",
        responseXml: stringResponse("retirarDocumentoBloco"),
        run: () =>
          sei.operacoes.retirarDocumentoBloco({
            idUnidade: "110000036",
            idBloco: "1500",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "enviarProcesso",
        responseXml: stringResponse("enviarProcesso"),
        run: () =>
          sei.operacoes.enviarProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            unidadesDestino: ["110000029"],
            sinManterAbertoUnidade: "S",
          }),
      },
      {
        operation: "atribuirProcesso",
        responseXml: stringResponse("atribuirProcesso"),
        run: () =>
          sei.operacoes.atribuirProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            idUsuario: "100000001",
          }),
      },
      {
        operation: "lancarAndamento",
        run: () =>
          sei.operacoes.lancarAndamento({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            idTarefa: "65",
          }),
      },
      {
        operation: "bloquearProcesso",
        responseXml: stringResponse("bloquearProcesso"),
        run: () =>
          sei.operacoes.bloquearProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "desbloquearProcesso",
        responseXml: stringResponse("desbloquearProcesso"),
        run: () =>
          sei.operacoes.desbloquearProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "removerRelacionamentoProcesso",
        responseXml: stringResponse("removerRelacionamentoProcesso"),
        run: () =>
          sei.operacoes.removerRelacionamentoProcesso({
            idUnidade: "110000036",
            protocoloProcedimento1: "00261.000004/2026-64",
            protocoloProcedimento2: "00261.000005/2026-17",
          }),
      },
      {
        operation: "removerSobrestamentoProcesso",
        responseXml: stringResponse("removerSobrestamentoProcesso"),
        run: () =>
          sei.operacoes.removerSobrestamentoProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "anexarProcesso",
        responseXml: stringResponse("anexarProcesso"),
        run: () =>
          sei.operacoes.anexarProcesso({
            idUnidade: "110000036",
            protocoloProcedimentoPrincipal: "00261.000005/2026-17",
            protocoloProcedimentoAnexado: "00261.000004/2026-64",
          }),
      },
      {
        operation: "definirMarcador",
        responseXml: stringResponse("definirMarcador"),
        run: () =>
          sei.operacoes.definirMarcador({
            idUnidade: "110000036",
            definicoes: [
              {
                protocoloProcedimento: "00261.000004/2026-64",
                idMarcador: "140",
                texto: "Teste",
              },
            ],
          }),
      },
      {
        operation: "definirControlePrazo",
        responseXml: stringResponse("definirControlePrazo"),
        run: () =>
          sei.operacoes.definirControlePrazo({
            idUnidade: "110000036",
            definicoes: [
              {
                protocoloProcedimento: "00261.000004/2026-64",
                dataPrazo: "",
                dias: "1",
                sinDiasUteis: "S",
              },
            ],
          }),
      },
      {
        operation: "concluirControlePrazo",
        responseXml: stringResponse("concluirControlePrazo"),
        run: () =>
          sei.operacoes.concluirControlePrazo({
            idUnidade: "110000036",
            protocolosProcedimentos: ["00261.000004/2026-64"],
          }),
      },
      {
        operation: "removerControlePrazo",
        responseXml: stringResponse("removerControlePrazo"),
        run: () =>
          sei.operacoes.removerControlePrazo({
            idUnidade: "110000036",
            protocolosProcedimentos: ["00261.000004/2026-64"],
          }),
      },
      {
        operation: "registrarAnotacao",
        responseXml: stringResponse("registrarAnotacao"),
        run: () =>
          sei.operacoes.registrarAnotacao({
            idUnidade: "110000036",
            anotacoes: [
              {
                protocoloProcedimento: "00261.000004/2026-64",
                descricao: "Teste",
                sinPrioridade: "N",
              },
            ],
          }),
      },
      {
        operation: "agendarPublicacao",
        responseXml: stringResponse("agendarPublicacao"),
        run: () =>
          sei.operacoes.agendarPublicacao({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
            staMotivo: "1",
            idVeiculoPublicacao: "1",
            dataDisponibilizacao: "13/07/2026",
          }),
      },
      {
        operation: "alterarPublicacao",
        responseXml: stringResponse("alterarPublicacao"),
        run: () =>
          sei.operacoes.alterarPublicacao({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
            staMotivo: "1",
            idVeiculoPublicacao: "1",
            dataDisponibilizacao: "14/07/2026",
          }),
      },
      {
        operation: "cancelarAgendamentoPublicacao",
        responseXml: stringResponse("cancelarAgendamentoPublicacao"),
        run: () =>
          sei.operacoes.cancelarAgendamentoPublicacao({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "confirmarDisponibilizacaoPublicacao",
        responseXml: stringResponse("confirmarDisponibilizacaoPublicacao"),
        run: () =>
          sei.operacoes.confirmarDisponibilizacaoPublicacao({
            idVeiculoPublicacao: "1",
            dataDisponibilizacao: "13/07/2026",
            dataPublicacao: "14/07/2026",
            numero: "1",
            idDocumentos: ["196908"],
          }),
      },
      {
        operation: "enviarEmail",
        run: () =>
          sei.operacoes.enviarEmail({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            para: "destinatario.teste@example.gov.br",
            assunto: "Teste",
            mensagem: "Mensagem",
          }),
      },
      {
        operation: "registrarOuvidoria",
        run: () =>
          sei.operacoes.registrarOuvidoria({
            idOrgao: "0",
            nome: "Manifestante",
            email: "manifestante@example.gov.br",
            idTipoProcedimento: "100000337",
            mensagem: "Manifestacao",
            sinAnonimo: "N",
          }),
      },
    ]

    for (const [index, call] of calls.entries()) {
      fetchMock().mockResolvedValueOnce(response(call.responseXml ?? emptyResponse(call.operation)))
      await expect(call.run()).resolves.not.toThrow()
      expect(requestBody(index)).toContain(`<sei:${call.operation}`)
      for (const expected of call.expected ?? []) {
        expect(requestBody(index)).toContain(expected)
      }
    }
  })

  it("expõe atalhos da fachada principal para consultas e operações comuns", async () => {
    const sei = createSeiClient(config)
    const calls: Array<{ operation: string; responseXml?: string; run: () => Promise<unknown> }> = [
      {
        operation: "listarUnidades",
        responseXml: unidadesResponse,
        run: () => sei.listarUnidades({ idTipoProcedimento: "100000337" }),
      },
      {
        operation: "listarTiposProcedimento",
        run: () => sei.listarTiposProcedimento({ idUnidade: "110000036" }),
      },
      {
        operation: "listarTiposPrioridade",
        run: () => sei.listarTiposPrioridade({ idUnidade: "110000036" }),
      },
      {
        operation: "listarSeries",
        run: () => sei.listarSeries({ idUnidade: "110000036" }),
      },
      {
        operation: "listarContatos",
        run: () => sei.listarContatos({ idUnidade: "110000036" }),
      },
      {
        operation: "consultarProcedimento",
        responseXml: procedimentoResponse,
        run: () =>
          sei.consultarProcedimento({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "consultarProcedimentoIndividual",
        run: () =>
          sei.consultarProcedimentoIndividual({
            idUnidade: "110000036",
            idOrgaoProcedimento: "0",
            idTipoProcedimento: "100000337",
            idOrgaoUsuario: "0",
            siglaUsuario: "usuario.teste",
          }),
      },
      {
        operation: "consultarDocumento",
        run: () =>
          sei.consultarDocumento({
            idUnidade: "110000036",
            protocoloDocumento: "0178401",
          }),
      },
      {
        operation: "consultarBloco",
        run: () => sei.consultarBloco({ idUnidade: "110000036", idBloco: "1500" }),
      },
      {
        operation: "listarExtensoesPermitidas",
        run: () => sei.listarExtensoesPermitidas({ idUnidade: "110000036" }),
      },
      {
        operation: "listarUsuarios",
        run: () => sei.listarUsuarios({ idUnidade: "110000036" }),
      },
      {
        operation: "listarHipotesesLegais",
        run: () => sei.listarHipotesesLegais({ idUnidade: "110000036" }),
      },
      {
        operation: "listarTiposConferencia",
        run: () => sei.listarTiposConferencia({ idUnidade: "110000036" }),
      },
      {
        operation: "listarPaises",
        run: () => sei.listarPaises({ idUnidade: "110000036" }),
      },
      {
        operation: "listarEstados",
        run: () => sei.listarEstados({ idUnidade: "110000036", idPais: "1" }),
      },
      {
        operation: "listarCidades",
        run: () => sei.listarCidades({ idUnidade: "110000036", idEstado: "1" }),
      },
      {
        operation: "listarTiposProcedimentoOuvidoria",
        run: () => sei.listarTiposProcedimentoOuvidoria(),
      },
      {
        operation: "listarCargos",
        run: () => sei.listarCargos({ idUnidade: "110000036" }),
      },
      {
        operation: "listarAndamentos",
        run: () =>
          sei.listarAndamentos({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "listarMarcadoresUnidade",
        run: () => sei.listarMarcadoresUnidade({ idUnidade: "110000036" }),
      },
      {
        operation: "consultarPublicacao",
        run: () => sei.consultarPublicacao({ idUnidade: "110000036" }),
      },
      {
        operation: "listarFeriados",
        run: () => sei.listarFeriados({ idUnidade: "110000036" }),
      },
      {
        operation: "gerarProcedimento",
        run: () =>
          sei.gerarProcedimento({
            idUnidade: "110000036",
            procedimento: {
              idTipoProcedimento: "100000337",
              especificacao: "Teste",
              assuntos: [{ codigoEstruturado: "01.01" }],
              interessados: [{ nome: "Interessado" }],
              nivelAcesso: "0",
            },
          }),
      },
      {
        operation: "incluirDocumento",
        run: () =>
          sei.incluirDocumento({
            idUnidade: "110000036",
            documento: {
              tipo: "G",
              idSerie: "100",
              numero: "1",
              descricao: "Teste",
              conteudo: "PHA+VGVzdGU8L3A+",
              nivelAcesso: "0",
            },
          }),
      },
      {
        operation: "enviarProcesso",
        responseXml: stringResponse("enviarProcesso"),
        run: () =>
          sei.enviarProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            unidadesDestino: ["110000029"],
          }),
      },
      {
        operation: "concluirProcesso",
        responseXml: stringResponse("concluirProcesso"),
        run: () =>
          sei.concluirProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "reabrirProcesso",
        responseXml: stringResponse("reabrirProcesso"),
        run: () =>
          sei.reabrirProcesso({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "lancarAndamento",
        run: () =>
          sei.lancarAndamento({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
          }),
      },
      {
        operation: "enviarEmail",
        run: () =>
          sei.enviarEmail({
            idUnidade: "110000036",
            protocoloProcedimento: "00261.000004/2026-64",
            para: "teste@example.gov.br",
            assunto: "Teste",
            mensagem: "Mensagem",
          }),
      },
    ]

    for (const [index, call] of calls.entries()) {
      fetchMock().mockResolvedValueOnce(response(call.responseXml ?? emptyResponse(call.operation)))
      await expect(call.run()).resolves.not.toThrow()
      expect(requestBody(index)).toContain(`<sei:${call.operation}`)
    }
  })
})
