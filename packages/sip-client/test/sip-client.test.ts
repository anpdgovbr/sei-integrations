import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  mapOrgaos,
  mapPerfis,
  mapPermissoes,
  mapUnidades,
  mapUsuarioDiretorio,
  mapUsuarios,
} from "../src/mappers"
import { buildSipSoapEnvelope, createSoapArray, parseSipSoapResponse, SipSoapError } from "../src"

const readFixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/sip/${name}`, import.meta.url), "utf8")

const usuarioResponse = readFixture("carregar-usuarios-sucesso.xml")
const permissaoResponse = readFixture("listar-permissao-sucesso.xml")
const faultServicoNaoLiberadoResponse = readFixture(
  "carregar-usuarios-fault-servico-nao-liberado.xml",
)

const emptyUsuariosResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosResponse>
      <returnUsuarios/>
    </ns1:carregarUsuariosResponse>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`

const emptySoapArrayUsuariosResponse = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="sipns" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SOAP-ENV:Body>
    <ns1:carregarUsuariosSemPermissaoResponse>
      <returnUsuarios SOAP-ENC:arrayType="xsd:ur-type[0]" xsi:type="SOAP-ENC:Array"/>
    </ns1:carregarUsuariosSemPermissaoResponse>
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

  it("monta parâmetro struct aninhado fora de um array SOAP", () => {
    const envelope = buildSipSoapEnvelope({
      operation: "carregarUsuario",
      params: {
        ChaveAcesso: "abc",
        Filtro: {
          Sigla: "usuario.teste",
          Ativo: "S",
        },
      },
    })

    expect(envelope).toContain("<Filtro>")
    expect(envelope).toContain('<Sigla xsi:type="xsd:string">usuario.teste</Sigla>')
    expect(envelope).toContain('<Ativo xsi:type="xsd:string">S</Ativo>')
    expect(envelope).toContain("</Filtro>")
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
        sigla: "usuario.teste",
        nome: "Usuario Teste",
        nomeSocial: null,
        cpf: "00000000000",
        email: "usuario.teste@example.gov.br",
        ativo: true,
        unidades: ["110000068"],
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
        idUnidade: "110000068",
        idOrigemUnidade: null,
        idPerfil: "100000938",
        dataInicial: "08/08/2024",
        dataFinal: null,
        sinSubunidades: true,
      },
      {
        idSistema: "100000100",
        idOrgaoUsuario: "0",
        idUsuario: "100000103",
        idOrigemUsuario: null,
        idOrgaoUnidade: "0",
        idUnidade: "110000030",
        idOrigemUnidade: null,
        idPerfil: "100000938",
        dataInicial: "16/09/2024",
        dataFinal: "17/09/2024",
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
      {
        id: "100000938",
        nome: "Básico",
        descricao: "Acesso básico",
        ativo: true,
        grupos: [],
        recursos: [],
        menus: [],
      },
      {
        id: "100000940",
        nome: "Informática",
        descricao: "Suporte SEI",
        ativo: true,
        grupos: [],
        recursos: [],
        menus: [],
      },
    ])
  })

  it("parseia campos aninhados de perfil", () => {
    const perfis = mapPerfis([
      [
        "100000949",
        "Acervo de Sigilosos da Unidade",
        null,
        "S",
        [["10", "Grupo Teste", "S"]],
        [["100015455", "procedimento_acervo_sigilosos_unidade", null, "S"]],
        [["20", "Menu Teste", "S", [["30", "100015455", "Acervo", "0", "S"]]]],
      ],
    ])

    expect(perfis).toEqual([
      {
        id: "100000949",
        nome: "Acervo de Sigilosos da Unidade",
        descricao: null,
        ativo: true,
        grupos: [{ id: "10", nome: "Grupo Teste", ativo: true }],
        recursos: [
          {
            id: "100015455",
            nome: "procedimento_acervo_sigilosos_unidade",
            descricao: null,
            ativo: true,
          },
        ],
        menus: [
          {
            id: "20",
            nome: "Menu Teste",
            ativo: true,
            itens: [
              {
                id: "30",
                idRecurso: "100015455",
                rotulo: "Acervo",
                ramificacao: "0",
                ativo: true,
              },
            ],
          },
        ],
      },
    ])
  })

  it("mapeia listas indexadas por key/value retornadas pelo PHP SOAP", () => {
    expect(mapOrgaos(["0", "ANPD", "Agência Nacional de Proteção de Dados", "S"])).toEqual([
      {
        id: "0",
        sigla: "ANPD",
        descricao: "Agência Nacional de Proteção de Dados",
        ativo: true,
      },
    ])

    expect(
      mapOrgaos([
        {
          key: "0",
          value: ["0", "ANPD", "Autoridade Nacional de Protecao de Dados", "S"],
        },
      ]),
    ).toEqual([
      {
        id: "0",
        sigla: "ANPD",
        descricao: "Autoridade Nacional de Protecao de Dados",
        ativo: true,
      },
    ])

    expect(
      mapUnidades([
        {
          key: "110000029",
          value: [
            "110000029",
            "0",
            "CGTI",
            "Coordenação-Geral de Tecnologia da Informação",
            "S",
            "110000084",
            "110000083",
            null,
          ],
        },
      ]),
    ).toEqual([
      {
        id: "110000029",
        idOrgao: "0",
        idOrigem: null,
        sigla: "CGTI",
        descricao: "Coordenação-Geral de Tecnologia da Informação",
        ativo: true,
        subunidades: ["110000084"],
        unidadesSuperiores: ["110000083"],
      },
    ])
  })

  it("normaliza respostas vazias como lista vazia nos mappers", () => {
    const payload = parseSipSoapResponse(emptyUsuariosResponse, "carregarUsuarios")

    expect(payload).toBe("")
    expect(mapUsuarios(payload)).toEqual([])
    expect(mapPermissoes(null)).toEqual([])
  })

  it("normaliza SOAP Array vazio como lista vazia", () => {
    const payload = parseSipSoapResponse(
      emptySoapArrayUsuariosResponse,
      "carregarUsuariosSemPermissao",
    )

    expect(payload).toEqual([])
    expect(mapUsuarios(payload)).toEqual([])
  })

  it("mapeia unidades com registros de 4 e de 3 campos", () => {
    expect(mapUnidades([["110000029", "CGTI", "Coordenação de TI", "S"]])).toEqual([
      {
        id: "110000029",
        idOrgao: null,
        sigla: "CGTI",
        descricao: "Coordenação de TI",
        ativo: true,
        subunidades: [],
        unidadesSuperiores: [],
        idOrigem: null,
      },
    ])

    expect(mapUnidades([["CGTI", "Coordenação de TI", "N"]])).toEqual([
      {
        id: "",
        idOrgao: null,
        sigla: "CGTI",
        descricao: "Coordenação de TI",
        ativo: false,
        subunidades: [],
        unidadesSuperiores: [],
        idOrigem: null,
      },
    ])
  })

  it("normaliza idOrgao/idOrigem quando o SIP retorna número ou booleano", () => {
    expect(mapUnidades([["110000029", 0, "CGTI", "Coordenação de TI", "S", [], [], true]])).toEqual(
      [
        {
          id: "110000029",
          idOrgao: "0",
          idOrigem: "true",
          sigla: "CGTI",
          descricao: "Coordenação de TI",
          ativo: true,
          subunidades: [],
          unidadesSuperiores: [],
        },
      ],
    )

    expect(
      mapUnidades([
        ["110000029", "0", "CGTI", "Coordenação de TI", "S", [], [], ["formato", "inesperado"]],
      ]),
    ).toEqual([
      {
        id: "110000029",
        idOrgao: "0",
        idOrigem: null,
        sigla: "CGTI",
        descricao: "Coordenação de TI",
        ativo: true,
        subunidades: [],
        unidadesSuperiores: [],
      },
    ])
  })

  it("lança erro de domínio quando um campo obrigatório está ausente", () => {
    expect(() => mapUnidades([[null, "0", "CGTI", "Coordenação de TI", "S"]])).toThrow(
      /Unidade\.IdUnidade/,
    )
  })

  it("mapeia múltiplos usuários retornados como lista de Maps PHP", () => {
    const usuarios = mapUsuarios([
      {
        key: "1",
        value: [
          { key: "0", value: "100000103" },
          { key: "1", value: null },
          { key: "2", value: null },
          { key: "3", value: "usuario.um" },
          { key: "4", value: "Usuario Um" },
          { key: "5", value: "S" },
        ],
      },
      {
        key: "2",
        value: [
          { key: "0", value: "100000104" },
          { key: "1", value: null },
          { key: "2", value: null },
          { key: "3", value: "usuario.dois" },
          { key: "4", value: "Usuario Dois" },
          { key: "5", value: "N" },
        ],
      },
    ])

    expect(usuarios.map((usuario) => usuario.sigla)).toEqual(["usuario.um", "usuario.dois"])
    expect(usuarios[1]).toMatchObject({ id: "100000104", nome: "Usuario Dois", ativo: false })
  })

  it("mapeia usuários quando o item do Map não segue o formato key/value", () => {
    const usuarios = mapUsuarios([
      {
        "0": [
          { key: "0", value: "100000105" },
          { key: "1", value: null },
          { key: "2", value: null },
          { key: "3", value: "usuario.tres" },
          { key: "4", value: "Usuario Tres" },
          { key: "5", value: "S" },
        ],
      },
    ])

    expect(usuarios).toEqual([expect.objectContaining({ id: "100000105", sigla: "usuario.tres" })])
  })

  it("retorna null ao mapear diretório de usuário sem estrutura de Map", () => {
    expect(mapUsuarioDiretorio(null)).toBeNull()
    expect(mapUsuarioDiretorio("usuario.teste")).toBeNull()
  })

  it("mapeia permissão sem campos opcionais informados", () => {
    const permissoes = mapPermissoes([
      {
        IdSistema: "100000100",
        IdUsuario: "100000103",
        IdUnidade: "110000068",
        IdPerfil: "100000938",
        DataInicial: "08/08/2024",
      },
    ])

    expect(permissoes).toEqual([
      {
        idSistema: "100000100",
        idOrgaoUsuario: null,
        idUsuario: "100000103",
        idOrigemUsuario: null,
        idOrgaoUnidade: null,
        idUnidade: "110000068",
        idOrigemUnidade: null,
        idPerfil: "100000938",
        dataInicial: "08/08/2024",
        dataFinal: null,
        sinSubunidades: false,
      },
    ])
  })

  it.each([
    ["IdSistema", "Permissao.IdSistema"],
    ["IdUsuario", "Permissao.IdUsuario"],
    ["IdUnidade", "Permissao.IdUnidade"],
    ["IdPerfil", "Permissao.IdPerfil"],
    ["DataInicial", "Permissao.DataInicial"],
  ])("lança erro de domínio quando %s está ausente na permissão", (field, campoEsperado) => {
    const base: Record<string, string> = {
      IdSistema: "100000100",
      IdUsuario: "100000103",
      IdUnidade: "110000068",
      IdPerfil: "100000938",
      DataInicial: "08/08/2024",
    }
    delete base[field]

    expect(() => mapPermissoes([base])).toThrow(campoEsperado)
  })

  it("mapeia grupo, recurso, item de menu e menu sem campos opcionais", () => {
    const perfis = mapPerfis([
      [
        "100000949",
        "Acervo de Sigilosos da Unidade",
        null,
        "S",
        [["10", "Grupo Teste"]],
        [["100015455", "procedimento_acervo_sigilosos_unidade"]],
        [["20", "Menu Teste", "S", [["30", "100015455", "Acervo"]]]],
      ],
    ])

    expect(perfis).toEqual([
      {
        id: "100000949",
        nome: "Acervo de Sigilosos da Unidade",
        descricao: null,
        ativo: true,
        grupos: [{ id: "10", nome: "Grupo Teste", ativo: false }],
        recursos: [
          {
            id: "100015455",
            nome: "procedimento_acervo_sigilosos_unidade",
            descricao: null,
            ativo: false,
          },
        ],
        menus: [
          {
            id: "20",
            nome: "Menu Teste",
            ativo: true,
            itens: [
              {
                id: "30",
                idRecurso: "100015455",
                rotulo: "Acervo",
                ramificacao: null,
                ativo: false,
              },
            ],
          },
        ],
      },
    ])
  })

  it("mapeia perfil em formato curto sem id/grupos/recursos/menus", () => {
    const perfis = mapPerfis([["Consulta", "Consulta SEI", "S"]])

    expect(perfis).toEqual([
      {
        id: "",
        nome: "Consulta",
        descricao: "Consulta SEI",
        ativo: true,
        grupos: [],
        recursos: [],
        menus: [],
      },
    ])
  })

  it("transforma SOAP fault em erro de domínio", () => {
    expect(() => parseSipSoapResponse(faultServicoNaoLiberadoResponse, "carregarUsuarios")).toThrow(
      SipSoapError,
    )

    try {
      parseSipSoapResponse(faultServicoNaoLiberadoResponse, "carregarUsuarios")
      expect.unreachable("parseSipSoapResponse deveria lançar SipSoapError")
    } catch (error) {
      expect(error).toBeInstanceOf(SipSoapError)
      expect(error).toMatchObject({
        message:
          'Serviço "Pesquisa de Usuários" não foi liberado para o sistema Sistema Teste/ANPD.',
        operation: "carregarUsuarios",
        status: 500,
        fault: 'Serviço "Pesquisa de Usuários" não foi liberado para o sistema Sistema Teste/ANPD.',
      })
    }
  })
})
