import type {
  SipGrupoPerfil,
  SipItemMenu,
  SipMenu,
  SipOrgao,
  SipPerfil,
  SipPermissao,
  SipRawMap,
  SipRawValue,
  SipRecurso,
  SipUnidade,
  SipUsuario,
  SipUsuarioDiretorio,
} from "./types"

const asArray = (value: SipRawValue): SipRawValue[] => {
  if (Array.isArray(value)) {
    return value
  }
  if (value === null || value === undefined) {
    return []
  }
  return [value]
}

const isMap = (value: SipRawValue): value is SipRawMap =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const stringValue = (value: SipRawValue): string | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

const requiredString = (value: SipRawValue, field: string): string => {
  const normalized = stringValue(value)
  if (!normalized) {
    throw new Error(`Campo obrigatório ausente na resposta SIP: ${field}.`)
  }
  return normalized
}

const boolFromSin = (value: SipRawValue): boolean => stringValue(value) === "S"

const nonNullStrings = (value: SipRawValue): string[] =>
  asArray(value)
    .flatMap((item) => (Array.isArray(item) ? nonNullStrings(item) : [stringValue(item)]))
    .filter((item): item is string => item !== null && item !== "")

const isScalarLike = (value: SipRawValue): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

const mapNestedArray = (value: SipRawValue): string[][] => {
  const items = Array.isArray(value) && value.every(isScalarLike) ? [value] : asArray(value)
  return items
    .map((item) => {
      const source = isMap(item) && "value" in item ? (item.value ?? null) : item
      return asArray(source).map((child) => stringValue(child) ?? "")
    })
    .filter((item) => item.length > 0)
}

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
 * Map SOAP PHP: cada item tem `key` e `value`.
 * Depois do parser, isso vira objetos `{ key: "0", value: "..." }`.
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

export const mapOrgaos = (value: SipRawValue): SipOrgao[] =>
  mapNestedArray(value).map((item) => ({
    id: item[0] ?? "",
    sigla: item[1] ?? "",
    descricao: item[2] ?? "",
    ativo: item[3] === "S",
  }))

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

const mapGrupoPerfis = (value: SipRawValue): SipGrupoPerfil[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "GrupoPerfil.IdGrupoPerfil"),
    nome: requiredString(item[1] ?? null, "GrupoPerfil.Nome"),
    ativo: boolFromSin(item[2] ?? null),
  }))

const mapRecursosPerfil = (value: SipRawValue): SipRecurso[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "Recurso.IdRecurso"),
    nome: requiredString(item[1] ?? null, "Recurso.Nome"),
    descricao: stringValue(item[2] ?? null),
    ativo: boolFromSin(item[3] ?? null),
  }))

const mapItensMenu = (value: SipRawValue): SipItemMenu[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "ItemMenu.IdItemMenu"),
    idRecurso: stringValue(item[1] ?? null),
    rotulo: requiredString(item[2] ?? null, "ItemMenu.Rotulo"),
    ramificacao: stringValue(item[3] ?? null),
    ativo: boolFromSin(item[4] ?? null),
  }))

const mapMenus = (value: SipRawValue): SipMenu[] =>
  mapRecordArray(value).map((item) => ({
    id: requiredString(item[0] ?? null, "Menu.IdMenu"),
    nome: requiredString(item[1] ?? null, "Menu.Nome"),
    ativo: boolFromSin(item[2] ?? null),
    itens: mapItensMenu(item[3] ?? null),
  }))

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

export const mapRecursos = (value: SipRawValue): string[] => nonNullStrings(value)

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
