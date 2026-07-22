import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  SoapError,
  asArray,
  boolFromSin,
  buildSoapEnvelope,
  callSoap,
  createSoapArray,
  isMap,
  parseSoapResponse,
  requiredString,
  stringValue,
} from "../src"

const ns = { uri: "Teste", prefix: "tst", action: "TesteAction" } as const

const makeError = (message: string, operation: string, status: number, fault?: string): SoapError =>
  new SoapError(message, operation, status, fault)

const soapResponse = (operation: string, payload: string): string => `<?xml version="1.0"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <${operation}Response>
      <return>${payload}</return>
    </${operation}Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const response = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  })

describe("sei-sip-soap transporte", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("serializa escalares, structs, arrays SOAP e escape XML", () => {
    const envelope = buildSoapEnvelope(
      {
        operation: "executar",
        params: {
          Texto: "A&B <teste>",
          Numero: 10,
          Vazio: "",
          Filtro: { Sigla: "CGTI", Ativo: "S" },
          Itens: createSoapArray("ArrayOfItem", "Item", [{ Id: "1", Nome: "Primeiro" }, "solto"]),
        },
      },
      ns,
    )

    expect(envelope).toContain("<tst:executar")
    expect(envelope).toContain("A&amp;B &lt;teste&gt;")
    expect(envelope).toContain('<Numero xsi:type="xsd:long">10</Numero>')
    expect(envelope).toContain('<Vazio xsi:nil="true" />')
    expect(envelope).toContain("<Filtro>")
    expect(envelope).toContain('<Itens SOAP-ENC:arrayType="tst:Item[2]"')
    expect(envelope).toContain('<item xsi:type="tst:Item">')
  })

  it("normaliza mapas, arrays vazios, nil e item único", () => {
    const xml = `<?xml version="1.0"?>
<Envelope>
  <Body>
    <listarResponse>
      <return>
        <Nome>Teste</Nome>
        <Vazio nil="true"/>
        <Lista><item>A</item><item>B</item></Lista>
        <ArrayVazio arrayType="xsd:string[0]"/>
      </return>
    </listarResponse>
  </Body>
</Envelope>`

    expect(parseSoapResponse(xml, "listar")).toEqual({
      Nome: "Teste",
      Vazio: null,
      Lista: ["A", "B"],
      ArrayVazio: [],
    })
  })

  it("lança SoapError para fault e preserva operação/status", () => {
    const xml = `<?xml version="1.0"?>
<Envelope><Body><Fault><faultstring>Falha SOAP</faultstring></Fault></Body></Envelope>`

    expect(() => parseSoapResponse(xml, "falhar", makeError)).toThrow(SoapError)
    try {
      parseSoapResponse(xml, "falhar", makeError)
    } catch (error) {
      expect(error).toMatchObject({
        operation: "falhar",
        status: 500,
        fault: "Falha SOAP",
      })
    }
  })

  it("executa fetch com SOAPAction e retorna payload normalizado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(soapResponse("executar", "<Id>123</Id>")))

    const result = await callSoap(
      { endpointUrl: "https://sei.example/ws", requestTimeoutMs: 1000 },
      { operation: "executar", params: { Id: "1" } },
      ns,
      makeError,
    )

    expect(result).toEqual({ Id: "123" })
    expect(fetch).toHaveBeenCalledWith(
      "https://sei.example/ws",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ SOAPAction: "TesteAction" }),
      }),
    )
  })

  it("converte erro HTTP e timeout para SoapError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(soapResponse("executar", "<Id>123</Id>"), 500))

    await expect(
      callSoap(
        { endpointUrl: "https://sei.example/ws", requestTimeoutMs: 1000 },
        { operation: "executar", params: {} },
        ns,
        makeError,
      ),
    ).rejects.toMatchObject({ status: 500, operation: "executar" })

    vi.mocked(fetch).mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))

    await expect(
      callSoap(
        { endpointUrl: "https://sei.example/ws", requestTimeoutMs: 1 },
        { operation: "executar", params: {} },
        ns,
        makeError,
      ),
    ).rejects.toMatchObject({ status: 408, operation: "executar" })
  })
})

describe("sei-sip-soap mappers", () => {
  it("normaliza arrays, mapas, strings obrigatórias e flags S/N", () => {
    expect(asArray(null)).toEqual([])
    expect(asArray("x")).toEqual(["x"])
    expect(asArray(["x"])).toEqual(["x"])
    expect(isMap({ a: "b" })).toBe(true)
    expect(isMap(["a"])).toBe(false)
    expect(stringValue(10)).toBe("10")
    expect(stringValue(false)).toBe("false")
    expect(stringValue({})).toBeNull()
    expect(requiredString("abc", "Campo")).toBe("abc")
    expect(() => requiredString("", "Campo")).toThrow("Campo obrigatório ausente: Campo")
    expect(boolFromSin("S")).toBe(true)
    expect(boolFromSin("N")).toBe(false)
  })
})
