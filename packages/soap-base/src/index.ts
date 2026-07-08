export type {
  BaseSoapConfig,
  RawMap,
  RawValue,
  ScalarSoapValue,
  SoapArrayValue,
  SoapCallOptions,
  SoapNamespaceConfig,
  SoapParamValue,
  SoapStructValue,
} from "./types.base"
export {
  SoapError,
  buildSoapEnvelope,
  callSoap,
  createSoapArray,
  parseSoapResponse,
} from "./soap.base"
export type { SoapErrorFactory } from "./soap.base"
export { asArray, boolFromSin, isMap, requiredString, stringValue } from "./mappers.base"
