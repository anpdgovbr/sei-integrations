import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createSipClient, SipSoapError } from "../src"

const config = {
  endpointUrl: "https://sei.example.gov.br/sip/ws/SipWS.php",
  accessKey: "access-key",
  systemId: "100000100",
  requestTimeoutMs: 30_000,
}

const usuarioResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:ns2="http://xml.apache.org/xml-soap">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosResponse>
      <returnUsuarios xsi:type="ns2:Map">
        <item>
          <key xsi:type="xsd:int">100000103</key>
          <value xsi:type="ns2:Map">
            <item><key xsi:type="xsd:int">0</key><value xsi:type="xsd:string">100000103</value></item>
            <item><key xsi:type="xsd:int">1</key><value xsi:nil="true"/></item>
            <item><key xsi:type="xsd:int">2</key><value xsi:type="xsd:string">0</value></item>
            <item><key xsi:type="xsd:int">3</key><value xsi:type="xsd:string">usuario.teste</value></item>
            <item><key xsi:type="xsd:int">4</key><value xsi:type="xsd:string">Usuario Teste</value></item>
            <item><key xsi:type="xsd:int">5</key><value xsi:type="xsd:string">S</value></item>
            <item><key xsi:type="xsd:int">6</key><value SOAP-ENC:arrayType="xsd:ur-type[1]" xsi:type="SOAP-ENC:Array"><item xsi:type="xsd:string">110000075</item></value></item>
            <item><key xsi:type="xsd:int">7</key><value xsi:nil="true"/></item>
            <item><key xsi:type="xsd:int">8</key><value xsi:type="xsd:string">00000000000</value></item>
            <item><key xsi:type="xsd:int">9</key><value xsi:type="xsd:string">usuario.teste@example.gov.br</value></item>
          </value>
        </item>
      </returnUsuarios>
    </ns1:carregarUsuariosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const usuarioVazioResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosResponse>
      <returnUsuarios/>
    </ns1:carregarUsuariosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const usuariosSemPermissaoResponse = usuarioResponse.replaceAll(
  "carregarUsuariosResponse",
  "carregarUsuariosSemPermissaoResponse",
)

const permissaoResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <ns1:listarPermissaoResponse>
      <parametros>
        <item>
          <IdSistema>100000100</IdSistema>
          <IdOrgaoUsuario>0</IdOrgaoUsuario>
          <IdUsuario>100000103</IdUsuario>
          <IdOrigemUsuario xsi:nil="true"/>
          <IdOrgaoUnidade>0</IdOrgaoUnidade>
          <IdUnidade>110000075</IdUnidade>
          <IdOrigemUnidade xsi:nil="true"/>
          <IdPerfil>100000940</IdPerfil>
          <DataInicial>08/04/2026</DataInicial>
          <DataFinal xsi:nil="true"/>
          <SinSubunidades>N</SinSubunidades>
        </item>
      </parametros>
    </ns1:listarPermissaoResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const recursosResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarRecursosResponse>
      <returnRecursos>
        <item>documento_gerar</item>
        <item>processo_consultar</item>
      </returnRecursos>
    </ns1:carregarRecursosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const orgaosResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarOrgaosResponse>
      <returnOrgaos>
        <item><item>0</item><item>ANPD</item><item>Autoridade Nacional de Protecao de Dados</item><item>S</item></item>
        <item><item>1</item><item>TESTE</item><item>Orgao de Teste</item><item>N</item></item>
      </returnOrgaos>
    </ns1:carregarOrgaosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const unidadesResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarUnidadesResponse>
      <returnUnidades>
        <item><item>110000075</item><item>0</item><item>CGTI</item><item>Coordenacao-Geral de Tecnologia</item><item>S</item><item/><item/><item>cgti</item></item>
        <item><item>110000076</item><item>0</item><item>TESTE</item><item>Unidade de Teste</item><item>N</item><item/><item/><item>teste</item></item>
      </returnUnidades>
    </ns1:carregarUnidadesResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const perfisResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarPerfisResponse>
      <returnPerfis>
        <item><item>100000940</item><item>Informatica</item><item>Suporte SEI</item><item>S</item></item>
        <item><item>100000941</item><item>Consulta</item><item>Consulta SEI</item><item>N</item></item>
      </returnPerfis>
    </ns1:carregarPerfisResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const usuarioDiretorioResponse = (
  operation: string,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:${operation}Response>
      <returnUsuario>
        <IdOrgao>0</IdOrgao>
        <Sigla>usuario.teste</Sigla>
        <Nome>Usuario Teste</Nome>
        <NomeSocial/>
        <Cpf>00000000000</Cpf>
        <Email>usuario.teste@example.gov.br</Email>
      </returnUsuario>
    </ns1:${operation}Response>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const trueResponse = (
  operation: string,
  payloadName = "return",
): string => `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:${operation}Response>
      <${payloadName}>true</${payloadName}>
    </ns1:${operation}Response>
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

const response = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  })

const fetchMock = () => vi.mocked(fetch)

const requestBody = (callIndex: number): string => {
  const init = fetchMock().mock.calls[callIndex]?.[1] as RequestInit | undefined
  return String(init?.body ?? "")
}

describe("SipClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("busca usuario e permissoes em fluxo composto", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(usuarioResponse))
      .mockResolvedValueOnce(response(permissaoResponse))

    const sip = createSipClient(config)
    const result = await sip.consultas.buscarUsuarioComPermissoesPorSigla("usuario.teste")

    expect(result?.usuario).toMatchObject({
      id: "100000103",
      sigla: "usuario.teste",
      nome: "Usuario Teste",
    })
    expect(result?.permissoes).toHaveLength(1)
    expect(fetchMock()).toHaveBeenCalledTimes(2)
    expect(requestBody(0)).toContain("<sip:carregarUsuarios")
    expect(requestBody(0)).toContain('<IdSistema xsi:type="xsd:long">100000100</IdSistema>')
    expect(requestBody(0)).toContain("<SiglaUsuario")
    expect(requestBody(0)).toContain(">usuario.teste</SiglaUsuario>")
    expect(requestBody(1)).toContain("<sip:listarPermissao")
    expect(requestBody(1)).toContain('<IdSistema xsi:type="xsd:string">100000100</IdSistema>')
    expect(requestBody(1)).toContain("<IdUsuario")
    expect(requestBody(1)).toContain(">100000103</IdUsuario>")
  })

  it("retorna null no fluxo composto quando o usuario nao existe", async () => {
    fetchMock().mockResolvedValueOnce(response(usuarioVazioResponse))

    const sip = createSipClient(config)
    const result = await sip.consultas.buscarUsuarioComPermissoesPorSigla("usuario.inexistente")

    expect(result).toBeNull()
    expect(fetchMock()).toHaveBeenCalledTimes(1)
    expect(requestBody(0)).toContain("<sip:carregarUsuarios")
  })

  it("monta filtros de recursos como arrays SOAP tipados", async () => {
    fetchMock().mockResolvedValueOnce(response(recursosResponse))

    const sip = createSipClient(config)
    const recursos = await sip.consultas.listarRecursos({
      perfis: ["100000940"],
      recursos: ["documento_gerar"],
    })

    expect(recursos).toEqual(["documento_gerar", "processo_consultar"])
    expect(requestBody(0)).toContain('Perfis SOAP-ENC:arrayType="xsd:string[1]"')
    expect(requestBody(0)).toContain('xsi:type="sip:ArrayOfIdPerfil"')
    expect(requestBody(0)).toContain('Recursos SOAP-ENC:arrayType="xsd:string[1]"')
    expect(requestBody(0)).toContain('xsi:type="sip:ArrayOfNomeRecurso"')
  })

  it("executa consultas simples e mapeia respostas tipadas", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(orgaosResponse))
      .mockResolvedValueOnce(response(unidadesResponse))
      .mockResolvedValueOnce(response(perfisResponse))
      .mockResolvedValueOnce(response(usuarioDiretorioResponse("carregarUsuario")))
      .mockResolvedValueOnce(response(usuarioDiretorioResponse("pesquisarUsuario")))

    const sip = createSipClient(config)

    await expect(sip.consultas.listarOrgaos({ todos: false })).resolves.toEqual([
      {
        id: "0",
        sigla: "ANPD",
        descricao: "Autoridade Nacional de Protecao de Dados",
        ativo: true,
      },
      {
        id: "1",
        sigla: "TESTE",
        descricao: "Orgao de Teste",
        ativo: false,
      },
    ])
    await expect(
      sip.consultas.listarUnidades({ idUsuario: "100000103", idUnidade: "110000075" }),
    ).resolves.toEqual([
      {
        id: "110000075",
        idOrgao: "0",
        idOrigem: "cgti",
        sigla: "CGTI",
        descricao: "Coordenacao-Geral de Tecnologia",
        ativo: true,
        subunidades: [],
        unidadesSuperiores: [],
      },
      {
        id: "110000076",
        idOrgao: "0",
        idOrigem: "teste",
        sigla: "TESTE",
        descricao: "Unidade de Teste",
        ativo: false,
        subunidades: [],
        unidadesSuperiores: [],
      },
    ])
    await expect(
      sip.consultas.listarPerfis({
        idUsuario: "100000103",
        idUnidade: "110000075",
        filtroRecursosMenus: "R",
      }),
    ).resolves.toEqual([
      {
        id: "100000940",
        nome: "Informatica",
        descricao: "Suporte SEI",
        ativo: true,
        grupos: [],
        recursos: [],
        menus: [],
      },
      {
        id: "100000941",
        nome: "Consulta",
        descricao: "Consulta SEI",
        ativo: false,
        grupos: [],
        recursos: [],
        menus: [],
      },
    ])
    await expect(
      sip.consultas.carregarUsuario({
        tipoServidorAutenticacao: "AD",
        idOrgaoUsuario: "0",
        siglaUsuario: "usuario.teste",
      }),
    ).resolves.toMatchObject({ sigla: "usuario.teste", nome: "Usuario Teste" })
    await expect(
      sip.consultas.pesquisarUsuario({
        tipoServidorAutenticacao: "AD",
        idOrgao: "0",
        sigla: "usuario.teste",
      }),
    ).resolves.toMatchObject({ sigla: "usuario.teste", nome: "Usuario Teste" })

    expect(requestBody(0)).toContain("<sip:carregarOrgaos")
    expect(requestBody(0)).toContain('<IdSistema xsi:type="xsd:long">100000100</IdSistema>')
    expect(requestBody(0)).toContain("<SinTodos")
    expect(requestBody(0)).toContain(">N</SinTodos>")
    expect(requestBody(1)).toContain("<sip:carregarUnidades")
    expect(requestBody(1)).toContain('<IdSistema xsi:type="xsd:long">100000100</IdSistema>')
    expect(requestBody(1)).toContain(">100000103</IdUsuario>")
    expect(requestBody(2)).toContain("<sip:carregarPerfis")
    expect(requestBody(2)).toContain('<IdSistema xsi:type="xsd:long">100000100</IdSistema>')
    expect(requestBody(2)).toContain(">R</StaFiltroRecursosMenus>")
    expect(requestBody(3)).toContain("<sip:carregarUsuario")
    expect(requestBody(3)).toContain('<IdSistema xsi:type="xsd:string">100000100</IdSistema>')
    expect(requestBody(3)).toContain(">AD</TipoServidorAutenticacao>")
    expect(requestBody(4)).toContain("<sip:pesquisarUsuario")
    expect(requestBody(4)).toContain(">0</IdOrgao>")
  })

  it("mantem atalhos de consulta na raiz da fachada", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(orgaosResponse))
      .mockResolvedValueOnce(response(unidadesResponse))
      .mockResolvedValueOnce(response(usuarioResponse))
      .mockResolvedValueOnce(response(usuarioResponse))
      .mockResolvedValueOnce(response(usuariosSemPermissaoResponse))
      .mockResolvedValueOnce(response(perfisResponse))
      .mockResolvedValueOnce(response(recursosResponse))
      .mockResolvedValueOnce(response(permissaoResponse))
      .mockResolvedValueOnce(response(usuarioResponse))
      .mockResolvedValueOnce(response(permissaoResponse))

    const sip = createSipClient(config)

    await expect(sip.listarOrgaos()).resolves.toHaveLength(2)
    await expect(sip.listarUnidades()).resolves.toHaveLength(2)
    await expect(sip.buscarUsuarios({ siglaUsuario: "usuario.teste" })).resolves.toHaveLength(1)
    await expect(sip.buscarUsuarioPorSigla("usuario.teste")).resolves.toMatchObject({
      sigla: "usuario.teste",
    })
    await expect(
      sip.buscarUsuariosSemPermissao({ siglaUsuario: "usuario.teste" }),
    ).resolves.toHaveLength(1)
    await expect(sip.listarPerfis()).resolves.toHaveLength(2)
    await expect(sip.listarRecursos()).resolves.toEqual(["documento_gerar", "processo_consultar"])
    await expect(sip.listarPermissoes({ idUsuario: "100000103" })).resolves.toHaveLength(1)
    await expect(sip.buscarUsuarioComPermissoesPorSigla("usuario.teste")).resolves.toMatchObject({
      usuario: { sigla: "usuario.teste" },
      permissoes: [{ idPerfil: "100000940" }],
    })

    expect(fetchMock()).toHaveBeenCalledTimes(10)
  })

  it("monta payloads de replicacao de usuario e permissao", async () => {
    fetchMock()
      .mockResolvedValueOnce(response(trueResponse("replicarUsuario", "returnReplicarUsuario")))
      .mockResolvedValueOnce(response(trueResponse("replicarPermissao", "returnReplicarPermissao")))
      .mockResolvedValueOnce(response(trueResponse("validarReplicacao", "returnValidarReplicacao")))

    const sip = createSipClient(config)

    await expect(
      sip.replicacao.replicarUsuarios([
        {
          operacao: "C",
          idOrigem: "ad:usuario.teste",
          idOrgao: "0",
          sigla: "usuario.teste",
          nome: "Usuario Teste",
          cpf: "00000000000",
          email: "usuario.teste@example.gov.br",
        },
      ]),
    ).resolves.toBe(true)

    await expect(
      sip.replicacao.replicarPermissoes([
        {
          operacao: "A",
          idUsuario: "100000103",
          idUnidade: "110000075",
          idPerfil: "100000940",
          dataInicial: "08/04/2026",
          sinSubunidades: false,
        },
      ]),
    ).resolves.toBe(true)

    await expect(sip.replicacao.validarReplicacao("rep-1")).resolves.toBe(true)

    expect(requestBody(0)).toContain("<sip:replicarUsuario")
    expect(requestBody(0)).toContain('Usuarios SOAP-ENC:arrayType="sip:Usuario[1]"')
    expect(requestBody(0)).toContain(">C</StaOperacao>")
    expect(requestBody(0)).toContain("<SistemasReplicacao")
    expect(requestBody(1)).toContain("<sip:replicarPermissao")
    expect(requestBody(1)).toContain('Permissoes SOAP-ENC:arrayType="sip:Permissao[1]"')
    expect(requestBody(1)).toContain(">A</StaOperacao>")
    expect(requestBody(1)).toContain('<IdSistema xsi:type="xsd:string">100000100</IdSistema>')
    expect(requestBody(1)).toContain(">N</SinSubunidades>")
    expect(requestBody(2)).toContain("<sip:validarReplicacao")
    expect(requestBody(2)).toContain(">rep-1</IdReplicacao>")
  })

  it("rejeita IdSistema que não é um inteiro seguro", async () => {
    const sip = createSipClient({ ...config, systemId: "abc" })

    await expect(sip.consultas.listarOrgaos()).rejects.toThrow(/IdSistema invalido para o SIP: abc/)
    expect(fetchMock()).not.toHaveBeenCalled()
  })

  it("converte SinSubunidades true para 'S' na replicação de permissão", async () => {
    fetchMock().mockResolvedValueOnce(
      response(trueResponse("replicarPermissao", "returnReplicarPermissao")),
    )

    const sip = createSipClient(config)
    await sip.replicacao.replicarPermissoes([
      {
        operacao: "A",
        idUsuario: "100000103",
        idUnidade: "110000075",
        idPerfil: "100000940",
        dataInicial: "08/04/2026",
        sinSubunidades: true,
      },
    ])

    expect(requestBody(0)).toContain(">S</SinSubunidades>")
  })

  it("interpreta '1' como resultado booleano verdadeiro do SIP", async () => {
    fetchMock().mockResolvedValueOnce(
      response(
        trueResponse("validarReplicacao", "returnValidarReplicacao").replace(">true<", ">1<"),
      ),
    )

    const sip = createSipClient(config)

    await expect(sip.replicacao.validarReplicacao("rep-1")).resolves.toBe(true)
  })

  it("propaga erros de rede sem envolver em SipSoapError", async () => {
    const networkError = new Error("network down")
    fetchMock().mockRejectedValueOnce(networkError)

    const sip = createSipClient(config)

    await expect(sip.consultas.listarOrgaos()).rejects.toBe(networkError)
  })

  it("converte timeout de requisição em SipSoapError 408", async () => {
    vi.useFakeTimers()
    fetchMock().mockImplementation(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("The operation was aborted.")
            abortError.name = "AbortError"
            reject(abortError)
          })
        }),
    )

    const sip = createSipClient({ ...config, requestTimeoutMs: 10 })
    const assertion = expect(sip.consultas.listarOrgaos()).rejects.toMatchObject({
      name: "SipSoapError",
      operation: "carregarOrgaos",
      status: 408,
    } satisfies Partial<SipSoapError>)

    await vi.advanceTimersByTimeAsync(10)
    await assertion
    vi.useRealTimers()
  })

  it("preserva status HTTP em SOAP Faults", async () => {
    fetchMock().mockResolvedValueOnce(response(faultResponse, 403))

    const sip = createSipClient(config)

    await expect(sip.consultas.listarPermissoes({ idUsuario: "100000103" })).rejects.toMatchObject({
      name: "SipSoapError",
      message: "Servico nao liberado.",
      operation: "listarPermissao",
      status: 403,
      fault: "Servico nao liberado.",
    } satisfies Partial<SipSoapError>)
  })

  it("falha explicitamente em HTTP sem SOAP Fault", async () => {
    fetchMock().mockResolvedValueOnce(response("<html>erro</html>", 500))

    const sip = createSipClient(config)

    await expect(sip.consultas.listarOrgaos()).rejects.toMatchObject({
      name: "SipSoapError",
      message: "Erro HTTP 500 chamando carregarOrgaos.",
      operation: "carregarOrgaos",
      status: 500,
    } satisfies Partial<SipSoapError>)
  })
})
