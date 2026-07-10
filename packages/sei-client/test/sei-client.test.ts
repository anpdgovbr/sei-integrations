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
})
