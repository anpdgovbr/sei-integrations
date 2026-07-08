import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildSeiSoapEnvelope,
  createSeiClient,
  createSeiSoapArray,
  encodeSeiLatin1Base64,
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

const fetchMock = () => vi.mocked(fetch)

const requestBody = (callIndex: number): string => {
  const init = fetchMock().mock.calls[callIndex]?.[1] as RequestInit | undefined
  return String(init?.body ?? "")
}

describe("Sei SOAP", () => {
  it("codifica conteúdo textual do editor SEI em Base64 Latin-1", () => {
    expect(encodeSeiLatin1Base64("Ação")).toBe("Qefjbw==")
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
})
