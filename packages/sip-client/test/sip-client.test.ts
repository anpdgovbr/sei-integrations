import { describe, expect, it } from "vitest"

import { mapPerfis, mapPermissoes, mapUsuarios } from "../src/mappers"
import { buildSipSoapEnvelope, createSoapArray, parseSipSoapResponse, SipSoapError } from "../src"

const usuarioResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:ns2="http://xml.apache.org/xml-soap" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosResponse>
      <returnUsuarios xsi:type="ns2:Map">
        <item>
          <key xsi:type="xsd:int">100000103</key>
          <value xsi:type="ns2:Map">
            <item><key xsi:type="xsd:int">0</key><value xsi:type="xsd:string">100000103</value></item>
            <item><key xsi:type="xsd:int">1</key><value xsi:nil="true"/></item>
            <item><key xsi:type="xsd:int">2</key><value xsi:type="xsd:string">0</value></item>
            <item><key xsi:type="xsd:int">3</key><value xsi:type="xsd:string">luciano.psilva</value></item>
            <item><key xsi:type="xsd:int">4</key><value xsi:type="xsd:string">Luciano Édipo Pereira da Silva</value></item>
            <item><key xsi:type="xsd:int">7</key><value xsi:nil="true"/></item>
            <item><key xsi:type="xsd:int">8</key><value xsi:type="xsd:string">00000000000</value></item>
            <item><key xsi:type="xsd:int">9</key><value xsi:type="xsd:string">luciano.psilva@anpd.gov.br</value></item>
            <item><key xsi:type="xsd:int">5</key><value xsi:type="xsd:string">S</value></item>
            <item><key xsi:type="xsd:int">6</key><value SOAP-ENC:arrayType="xsd:ur-type[2]" xsi:type="SOAP-ENC:Array"><item xsi:type="xsd:string">110000001</item><item xsi:type="xsd:string">110000075</item></value></item>
          </value>
        </item>
      </returnUsuarios>
    </ns1:carregarUsuariosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const permissaoResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <ns1:listarPermissaoResponse>
      <parametros SOAP-ENC:arrayType="ns1:Permissao[1]" xsi:type="ns1:ArrayOfPermissoes">
        <item xsi:type="ns1:Permissao">
          <IdSistema xsi:type="xsd:string">100000100</IdSistema>
          <IdOrgaoUsuario xsi:type="xsd:string">0</IdOrgaoUsuario>
          <IdUsuario xsi:type="xsd:string">100000103</IdUsuario>
          <IdOrigemUsuario xsi:nil="true"/>
          <IdOrgaoUnidade xsi:type="xsd:string">0</IdOrgaoUnidade>
          <IdUnidade xsi:type="xsd:string">110000075</IdUnidade>
          <IdOrigemUnidade xsi:nil="true"/>
          <IdPerfil xsi:type="xsd:string">100000940</IdPerfil>
          <DataInicial xsi:type="xsd:string">08/04/2026</DataInicial>
          <DataFinal xsi:nil="true"/>
          <SinSubunidades xsi:type="xsd:string">N</SinSubunidades>
        </item>
      </parametros>
    </ns1:listarPermissaoResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const emptyUsuariosResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosResponse>
      <returnUsuarios/>
    </ns1:carregarUsuariosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const faultResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <SOAP-ENV:Fault>
      <faultcode>SOAP-ENV:Server</faultcode>
      <faultstring>Serviço não liberado.</faultstring>
    </SOAP-ENV:Fault>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

describe("sei-sip SOAP", () => {
  it("monta envelope com nil e escape XML", () => {
    const envelope = buildSipSoapEnvelope({
      operation: "carregarUsuarios",
      params: {
        ChaveAcesso: "abc",
        SiglaUsuario: "a&b",
        IdUsuario: null,
      },
    })

    expect(envelope).toContain("<sip:carregarUsuarios")
    expect(envelope).toContain('<SiglaUsuario xsi:type="xsd:string">a&amp;b</SiglaUsuario>')
    expect(envelope).toContain('<IdUsuario xsi:nil="true" />')
  })

  it("monta arrays SOAP tipados para operações de replicação", () => {
    const envelope = buildSipSoapEnvelope({
      operation: "replicarUsuario",
      params: {
        ChaveAcesso: "abc",
        Usuarios: createSoapArray("ArrayOfUsuarios", "Usuario", [
          {
            StaOperacao: "C",
            IdOrigem: "ad:luciano.psilva",
            IdOrgao: "0",
            Sigla: "luciano.psilva",
            Nome: "Usuario Teste",
            NomeSocial: null,
            Cpf: "00000000000",
            Email: "luciano.psilva@anpd.gov.br",
          },
        ]),
      },
    })

    expect(envelope).toContain('<Usuarios SOAP-ENC:arrayType="sip:Usuario[1]"')
    expect(envelope).toContain('xsi:type="sip:ArrayOfUsuarios"')
    expect(envelope).toContain('<item xsi:type="sip:Usuario">')
    expect(envelope).toContain("<StaOperacao")
    expect(envelope).toContain("<NomeSocial xsi:nil")
  })

  it("usa operações de replicação de usuário compatíveis com o SIP 5.0.4", () => {
    const envelope = buildSipSoapEnvelope({
      operation: "replicarUsuario",
      params: {
        ChaveAcesso: "abc",
        Usuarios: createSoapArray("ArrayOfUsuarios", "Usuario", [
          {
            StaOperacao: "C",
            IdOrigem: "ad:usuario.teste",
            IdOrgao: "0",
            Sigla: "usuario.teste",
            Nome: "Usuario Teste",
          },
        ]),
      },
    })

    expect(envelope).toContain("<StaOperacao")
    expect(envelope).toContain(">C</StaOperacao>")
    expect(envelope).not.toContain(">I</StaOperacao>")
  })

  it("parseia usuário retornado pelo Map SOAP do SIP", () => {
    const payload = parseSipSoapResponse(usuarioResponse, "carregarUsuarios")
    const usuarios = mapUsuarios(payload)

    expect(usuarios).toEqual([
      {
        id: "100000103",
        idOrigem: null,
        idOrgao: "0",
        sigla: "luciano.psilva",
        nome: "Luciano Édipo Pereira da Silva",
        nomeSocial: null,
        cpf: "00000000000",
        email: "luciano.psilva@anpd.gov.br",
        ativo: true,
        unidades: ["110000001", "110000075"],
      },
    ])
  })

  it("parseia permissões tipadas", () => {
    const payload = parseSipSoapResponse(permissaoResponse, "listarPermissao")
    const permissoes = mapPermissoes(payload)

    expect(permissoes).toEqual([
      {
        idSistema: "100000100",
        idOrgaoUsuario: "0",
        idUsuario: "100000103",
        idOrigemUsuario: null,
        idOrgaoUnidade: "0",
        idUnidade: "110000075",
        idOrigemUnidade: null,
        idPerfil: "100000940",
        dataInicial: "08/04/2026",
        dataFinal: null,
        sinSubunidades: false,
      },
    ])
  })

  it("parseia perfis em blocos de id, nome, descrição e ativo", () => {
    const perfis = mapPerfis([
      ["100000938", "Básico", "Acesso básico", "S"],
      ["100000940", "Informática", "Suporte SEI", "S"],
    ])

    expect(perfis).toEqual([
      { id: "100000938", nome: "Básico", descricao: "Acesso básico", ativo: true },
      { id: "100000940", nome: "Informática", descricao: "Suporte SEI", ativo: true },
    ])
  })

  it("normaliza respostas vazias como lista vazia nos mappers", () => {
    const payload = parseSipSoapResponse(emptyUsuariosResponse, "carregarUsuarios")

    expect(payload).toBe("")
    expect(mapUsuarios(payload)).toEqual([])
    expect(mapPermissoes(null)).toEqual([])
  })

  it("transforma SOAP fault em erro de domínio", () => {
    expect(() => parseSipSoapResponse(faultResponse, "listarPermissao")).toThrow(SipSoapError)

    try {
      parseSipSoapResponse(faultResponse, "listarPermissao")
      expect.unreachable("parseSipSoapResponse deveria lançar SipSoapError")
    } catch (error) {
      expect(error).toBeInstanceOf(SipSoapError)
      expect(error).toMatchObject({
        message: "Serviço não liberado.",
        operation: "listarPermissao",
        status: 500,
        fault: "Serviço não liberado.",
      })
    }
  })
})
