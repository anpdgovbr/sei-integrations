/**
 * @packageDocumentation
 *
 * Funções de mapeamento de respostas SOAP do SIP para entidades de domínio.
 *
 * Este módulo converte os valores brutos ({@link SipRawValue}) normalizados
 * por {@link index!parseSipSoapResponse | parseSipSoapResponse} nas entidades tipadas do domínio expostas
 * pelo pacote. Cada função exportada corresponde a uma operação SOAP do SIP:
 *
 * | Função                    | Operação SOAP                        | Retorno                     |
 * |---------------------------|--------------------------------------|-----------------------------|
 * | {@link mapOrgaos}         | `carregarOrgaos`                     | {@link SipOrgao}`[]`        |
 * | {@link mapUnidades}       | `carregarUnidades`                   | {@link SipUnidade}`[]`      |
 * | {@link mapUsuarios}       | `carregarUsuarios` / sem permissão   | {@link SipUsuario}`[]`      |
 * | {@link mapUsuarioDiretorio} | `carregarUsuario` / `pesquisarUsuario` | {@link SipUsuarioDiretorio} \| `null` |
 * | {@link mapPerfis}         | `carregarPerfis`                     | {@link SipPerfil}`[]`       |
 * | {@link mapRecursos}       | `carregarRecursos`                   | `string[]`                  |
 * | {@link mapPermissoes}     | `listarPermissao`                    | {@link SipPermissao}`[]`    |
 *
 * As funções auxiliares internas (marcadas individualmente como `@internal`)
 * não fazem parte da API pública.
 *
 * @categoryDescription Mappers
 * Funções que convertem respostas SOAP brutas em entidades de domínio tipadas.
 */
import type {
  SipGrupoPerfil,
  SipItemMenu,
  SipMenu,
  SipOrgao,
  SipPerfil,
  SipPermissao,
  SipRawValue,
  SipRecurso,
  SipUnidade,
  SipUsuario,
  SipUsuarioDiretorio,
} from "./types"

import { asArray, boolFromSin, isMap, requiredString, stringValue } from "@anpdgovbr/sei-sip-soap"

/** @internal */
const nonNullStrings = (value: SipRawValue): string[] =>
  asArray(value)
    .flatMap((item) => (Array.isArray(item) ? nonNullStrings(item) : [stringValue(item)]))
    .filter((item): item is string => item !== null && item !== "")

/** @internal */
const isScalarLike = (value: SipRawValue): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

/** @internal */
const mapNestedArray = (value: SipRawValue): string[][] => {
  const items = Array.isArray(value) && value.every(isScalarLike) ? [value] : asArray(value)
  return items
    .map((item) => {
      const source = isMap(item) && "value" in item ? (item.value ?? null) : item
      return asArray(source).map((child) => stringValue(child) ?? "")
    })
    .filter((item) => item.length > 0)
}

/** @internal */
const mapRecordArray = (value: SipRawValue): SipRawValue[][] => {
  const items = Array.isArray(value) && value.every(isScalarLike) ? [value] : asArray(value)
  return items
    .map((item) => {
      const source = isMap(item) && "value" in item ? (item.value ?? null) : item
      return asArray(source)
    })
    .filter((item) => item.length > 0)
}

/**
 * Extrai e ordena as entradas de um mapa SOAP PHP.
 *
 * No SIP, dados de usuários são retornados como maps PHP serializados em SOAP,
 * onde cada entrada tem `<key>` (índice inteiro) e `<value>` (dado). Após o
 * parser, cada entrada vira `{ key: "0", value: "..." }`. Esta função ordena
 * pelo índice numérico e retorna apenas os valores, preservando a ordem
 * posicional esperada pelo {@link mapUsuarios}.
 *
 * @internal
 */
const mapPhpMapEntries = (value: SipRawValue): SipRawValue[] => {
  const entries = asArray(value)
    .filter(isMap)
    .map((entry) => ({
      key: Number.parseInt(stringValue(entry.key ?? null) ?? "0", 10),
      value: entry.value ?? null,
    }))
    .sort((left, right) => left.key - right.key)

  return entries.map((entry) => entry.value)
}

/**
 * Converte o payload bruto de `carregarOrgaos` em uma lista de {@link SipOrgao}.
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}
 *   para a operação `carregarOrgaos`.
 * @returns Lista de órgãos, possivelmente vazia.
 *
 * @see {@link index!SipConsultasClient.listarOrgaos | SipConsultasClient.listarOrgaos}
 * @category Mappers
 */
export const mapOrgaos = (value: SipRawValue): SipOrgao[] =>
  mapNestedArray(value).map((item) => ({
    id: item[0] ?? "",
    sigla: item[1] ?? "",
    descricao: item[2] ?? "",
    ativo: item[3] === "S",
  }))

/**
 * Converte o payload bruto de `carregarUnidades` em uma lista de {@link SipUnidade}.
 *
 * @remarks
 * O SIP retorna unidades em dois formatos diferentes dependendo da versão e dos
 * filtros aplicados:
 * - **Formato completo** (8+ campos): inclui `idOrgao`, `subunidades`,
 *   `unidadesSuperiores` e `idOrigem`.
 * - **Formato reduzido** (4 campos): omite `idOrgao` e os arrays hierárquicos.
 * - **Formato mínimo** (3 campos): sem `id`, apenas `sigla`, `descricao` e `ativo`.
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}
 *   para a operação `carregarUnidades`.
 * @returns Lista de unidades, possivelmente vazia.
 *
 * @see {@link index!SipConsultasClient.listarUnidades | SipConsultasClient.listarUnidades}
 * @category Mappers
 */
export const mapUnidades = (value: SipRawValue): SipUnidade[] =>
  mapRecordArray(value).map((item) => {
    if (item.length >= 5) {
      return {
        id: requiredString(item[0] ?? null, "Unidade.IdUnidade"),
        idOrgao: stringValue(item[1] ?? null),
        sigla: requiredString(item[2] ?? null, "Unidade.Sigla"),
        descricao: stringValue(item[3] ?? null) ?? "",
        ativo: boolFromSin(item[4] ?? null),
        subunidades: nonNullStrings(item[5] ?? null),
        unidadesSuperiores: nonNullStrings(item[6] ?? null),
        idOrigem: stringValue(item[7] ?? null),
      }
    }

    if (item.length >= 4) {
      return {
        id: requiredString(item[0] ?? null, "Unidade.IdUnidade"),
        idOrgao: null,
        sigla: requiredString(item[1] ?? null, "Unidade.Sigla"),
        descricao: stringValue(item[2] ?? null) ?? "",
        ativo: boolFromSin(item[3] ?? null),
        subunidades: [],
        unidadesSuperiores: [],
        idOrigem: null,
      }
    }

    return {
      id: "",
      idOrgao: null,
      sigla: stringValue(item[0] ?? null) ?? "",
      descricao: stringValue(item[1] ?? null) ?? "",
      ativo: boolFromSin(item[2] ?? null),
      subunidades: [],
      unidadesSuperiores: [],
      idOrigem: null,
    }
  })

/**
 * Converte o payload bruto de `carregarUsuarios` ou
 * `carregarUsuariosSemPermissao` em uma lista de {@link SipUsuario}.
 *
 * @remarks
 * O SIP serializa usuários como mapas PHP aninhados (`ns2:Map`), onde cada
 * usuário é um mapa de índices inteiros para valores. `mapPhpMapEntries`
 * ordena essas entradas e extrai os valores na posição esperada.
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}.
 * @returns Lista de usuários, possivelmente vazia.
 * @throws `Error` se um campo obrigatório (`IdUsuario`, `Sigla`, `Nome`)
 *   estiver ausente na resposta.
 *
 * @see {@link index!SipConsultasClient.buscarUsuarios | SipConsultasClient.buscarUsuarios}
 * @see {@link index!SipConsultasClient.buscarUsuariosSemPermissao | SipConsultasClient.buscarUsuariosSemPermissao}
 * @category Mappers
 */
export const mapUsuarios = (value: SipRawValue): SipUsuario[] => {
  const userMaps =
    isMap(value) && "key" in value && "value" in value
      ? [value.value ?? null]
      : asArray(value).flatMap((item) => {
          if (isMap(item) && "value" in item) {
            return [item.value ?? null]
          }
          return isMap(item) ? Object.values(item) : []
        })

  return userMaps.map(mapPhpMapEntries).map((item) => ({
    id: requiredString(item[0] ?? null, "Usuario.IdUsuario"),
    idOrigem: stringValue(item[1] ?? null),
    idOrgao: stringValue(item[2] ?? null),
    sigla: requiredString(item[3] ?? null, "Usuario.Sigla"),
    nome: requiredString(item[4] ?? null, "Usuario.Nome"),
    ativo: boolFromSin(item[5] ?? null),
    unidades: asArray(item[6] ?? null)
      .map(stringValue)
      .filter((child): child is string => child !== null),
    nomeSocial: stringValue(item[7] ?? null),
    cpf: stringValue(item[8] ?? null),
    email: stringValue(item[9] ?? null),
  }))
}

/**
 * Converte o payload bruto de `carregarUsuario` ou `pesquisarUsuario` em um
 * {@link SipUsuarioDiretorio}, ou `null` se a resposta estiver vazia.
 *
 * @remarks
 * Aceita tanto nomes de campos com inicial maiúscula (`Sigla`, `Nome`) quanto
 * minúscula (`sigla`, `nome`), pois diferentes versões do SIP variam a
 * capitalização.
 *
 * @param value - Payload normalizado.
 * @returns O usuário do diretório, ou `null` se o servidor retornou nulo ou
 *   um valor não mapeado.
 * @throws `Error` se `Sigla` ou `Nome` estiverem ausentes na resposta.
 *
 * @see {@link index!SipConsultasClient.carregarUsuario | SipConsultasClient.carregarUsuario}
 * @see {@link index!SipConsultasClient.pesquisarUsuario | SipConsultasClient.pesquisarUsuario}
 * @category Mappers
 */
export const mapUsuarioDiretorio = (value: SipRawValue): SipUsuarioDiretorio | null => {
  if (!isMap(value)) {
    return null
  }

  return {
    idOrgao: stringValue(value.IdOrgao ?? value.idOrgao ?? null),
    sigla: requiredString(value.Sigla ?? value.sigla ?? null, "UsuarioDiretorio.Sigla"),
    nome: requiredString(value.Nome ?? value.nome ?? null, "UsuarioDiretorio.Nome"),
    nomeSocial: stringValue(value.NomeSocial ?? value.nomeSocial ?? null),
    cpf: stringValue(value.Cpf ?? value.cpf ?? null),
    email: stringValue(value.Email ?? value.email ?? null),
  }
}

/** @internal */
const mapGrupoPerfis = (value: SipRawValue): SipGrupoPerfil[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "GrupoPerfil.IdGrupoPerfil"),
    nome: requiredString(item[1] ?? null, "GrupoPerfil.Nome"),
    ativo: boolFromSin(item[2] ?? null),
  }))

/** @internal */
const mapRecursosPerfil = (value: SipRawValue): SipRecurso[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "Recurso.IdRecurso"),
    nome: requiredString(item[1] ?? null, "Recurso.Nome"),
    descricao: stringValue(item[2] ?? null),
    ativo: boolFromSin(item[3] ?? null),
  }))

/** @internal */
const mapItensMenu = (value: SipRawValue): SipItemMenu[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "ItemMenu.IdItemMenu"),
    idRecurso: stringValue(item[1] ?? null),
    rotulo: requiredString(item[2] ?? null, "ItemMenu.Rotulo"),
    ramificacao: stringValue(item[3] ?? null),
    ativo: boolFromSin(item[4] ?? null),
  }))

/** @internal */
const mapMenus = (value: SipRawValue): SipMenu[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "Menu.IdMenu"),
    nome: requiredString(item[1] ?? null, "Menu.Nome"),
    ativo: boolFromSin(item[2] ?? null),
    itens: mapItensMenu(item[3] ?? null),
  }))

/**
 * Converte o payload bruto de `carregarPerfis` em uma lista de {@link SipPerfil}.
 *
 * @remarks
 * Perfis retornam em dois formatos:
 * - **Formato completo** (4+ campos): inclui `id`, `nome`, `descricao`, `ativo`,
 *   `grupos`, `recursos` e `menus`. A profundidade de `recursos` e `menus`
 *   depende do parâmetro `StaFiltroRecursosMenus` enviado na requisição.
 * - **Formato reduzido** (3 campos): apenas `nome`, `descricao` e `ativo`,
 *   sem `id`. Esses registros recebem `id: ""`.
 *
 * Perfis com `nome` vazio são filtrados do resultado.
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}
 *   para a operação `carregarPerfis`.
 * @returns Lista de perfis, possivelmente vazia.
 *
 * @see {@link index!SipConsultasClient.listarPerfis | SipConsultasClient.listarPerfis}
 * @see {@link index!SipFiltroRecursosMenus | SipFiltroRecursosMenus}
 * @category Mappers
 */
export const mapPerfis = (value: SipRawValue): SipPerfil[] =>
  mapRecordArray(value)
    .map((item) => {
      if (item.length >= 4) {
        return {
          id: requiredString(item[0] ?? null, "Perfil.IdPerfil"),
          nome: requiredString(item[1] ?? null, "Perfil.Nome"),
          descricao: stringValue(item[2] ?? null),
          ativo: boolFromSin(item[3] ?? null),
          grupos: mapGrupoPerfis(item[4] ?? null),
          recursos: mapRecursosPerfil(item[5] ?? null),
          menus: mapMenus(item[6] ?? null),
        }
      }

      return {
        id: "",
        nome: stringValue(item[0] ?? null) ?? "",
        descricao: stringValue(item[1] ?? null),
        ativo: boolFromSin(item[2] ?? null),
        grupos: [],
        recursos: [],
        menus: [],
      }
    })
    .filter((item) => item.nome)

/**
 * Converte o payload bruto de `carregarRecursos` em uma lista de nomes de
 * recursos (strings).
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}
 *   para a operação `carregarRecursos`.
 * @returns Lista de nomes de recursos (ex.: `["documento_gerar", "processo_consultar"]`),
 *   possivelmente vazia.
 *
 * @see {@link index!SipConsultasClient.listarRecursos | SipConsultasClient.listarRecursos}
 * @category Mappers
 */
export const mapRecursos = (value: SipRawValue): string[] => nonNullStrings(value)

/**
 * Converte o payload bruto de `listarPermissao` em uma lista de
 * {@link SipPermissao}.
 *
 * @remarks
 * Diferente da maioria das operações do SIP, `listarPermissao` retorna
 * objetos nomeados (`Permissao`) com campos `PascalCase`, não arrays
 * posicionais.
 *
 * @param value - Payload normalizado retornado por {@link index!parseSipSoapResponse | parseSipSoapResponse}
 *   para a operação `listarPermissao`.
 * @returns Lista de permissões, possivelmente vazia.
 * @throws `Error` se campos obrigatórios (`IdSistema`, `IdUsuario`,
 *   `IdUnidade`, `IdPerfil`, `DataInicial`) estiverem ausentes.
 *
 * @see {@link index!SipConsultasClient.listarPermissoes | SipConsultasClient.listarPermissoes}
 * @category Mappers
 */
export const mapPermissoes = (value: SipRawValue): SipPermissao[] =>
  asArray(value)
    .filter(isMap)
    .map((item) => ({
      idSistema: requiredString(item.IdSistema ?? null, "Permissao.IdSistema"),
      idOrgaoUsuario: stringValue(item.IdOrgaoUsuario ?? null),
      idUsuario: requiredString(item.IdUsuario ?? null, "Permissao.IdUsuario"),
      idOrigemUsuario: stringValue(item.IdOrigemUsuario ?? null),
      idOrgaoUnidade: stringValue(item.IdOrgaoUnidade ?? null),
      idUnidade: requiredString(item.IdUnidade ?? null, "Permissao.IdUnidade"),
      idOrigemUnidade: stringValue(item.IdOrigemUnidade ?? null),
      idPerfil: requiredString(item.IdPerfil ?? null, "Permissao.IdPerfil"),
      dataInicial: requiredString(item.DataInicial ?? null, "Permissao.DataInicial"),
      dataFinal: stringValue(item.DataFinal ?? null),
      sinSubunidades: boolFromSin(item.SinSubunidades ?? null),
    }))
