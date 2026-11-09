---
title: Integração e diagnóstico
group: Guias
---

# Integração e diagnóstico

Este guia se aplica aos clientes SEI e SIP. Use o [guia SEI](sei-client.md), o
[contrato SEI](sei-contrato-wsdl.md), o [guia SIP](sip-client.md) e o
[contrato SIP](sip-contrato-wsdl.md) para os detalhes de cada serviço.

## Responsabilidades e limites

| Camada                 | O que determina                                                   | Exemplo                                                              |
| ---------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Servidor e contrato WS | Operações expostas, dados retornados, regras de negócio e acesso  | O SOAP SEI não oferece listagem geral de processos por unidade       |
| Cliente de integração  | Tipos, envelopes, transporte, timeout e normalização              | `consultarProcedimento` exige protocolo e normaliza unidades abertas |
| Aplicação consumidora  | Configuração, autorização final, cache, persistência e composição | Consultar protocolos conhecidos e filtrar pela unidade               |

Operação existente no WSDL sem método de domínio é uma possível lacuna do
cliente. Operação ausente do WSDL exige outra capacidade do servidor; XML de
baixo nível não cria essa capacidade. Operação existente mas não liberada no
cadastro é um problema de habilitação/acesso. Essas situações exigem soluções
diferentes.

O SIP fornece cadastros e permissões vinculadas ao sistema alvo. Uma permissão
no SIP não garante acesso a todo processo do SEI nem substitui os critérios do
serviço de integração. A autorização do usuário final continua na aplicação.

## Configuração e execução

- Configure a URL de execução SOAP, não a página de WSDL ou de login.
- Carregue credenciais no servidor e valide variáveis obrigatórias: `!` nos
  exemplos TypeScript não valida valores em runtime.
- `requestTimeoutMs` é obrigatório e limita cada chamada, não o fluxo inteiro.
- O cliente não lê `.env`, carrega WSDL dinamicamente, implementa paginação
  automática, cache ou retry. Use somente filtros e paginação presentes no
  tipo da operação; não há paginação universal.
- Preserve IDs como strings. Datas de negócio usam os formatos do serviço;
  data/hora não é convertida automaticamente para UTC ou para `Date`.
- O subclient indica organização da API. No SEI, upload temporário está em
  `consultas`, embora grave dados. Autorize por operação e efeito real.

## Retornos e falhas

| Situação                            | Interpretação e tratamento                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Lista vazia                         | Nenhum item retornado para aquele contexto; não prova inexistência global                    |
| DTO `null`                          | Mapper não produziu objeto; não equivale automaticamente a “não encontrado”                  |
| SOAP Fault                          | Verificar `operation`, `status`, `fault` e mensagem; pode indicar regra de negócio ou acesso |
| HTTP fora de 2xx                    | Verificar endpoint, proxy e servidor; status é preservado                                    |
| Timeout (`status === 408`)          | Limite local atingido; não confirma que o servidor cancelou o processamento                  |
| Erro de rede, parsing ou mapeamento | Pode propagar erro fora de `SeiSoapError`/`SipSoapError`; preservar causa no tratamento      |

Os mappers têm padrões por campo. Coleções podem virar `[]`, textos podem virar
`""`, campos anuláveis podem virar `null` e alguns objetos recebem valores
padrão. Consulte os tipos e mappers, sem inferir presença no XML só pela presença
no DTO.

Não registre envelopes ou credenciais indiscriminadamente. Ao diagnosticar,
preserve nome da operação, status e contexto mínimo, com dados sensíveis
removidos.

## Escrita, repetição e consistência

Não há retry automático nem garantia geral de idempotência. Se uma escrita
expirar ou perder a resposta, ela pode já ter produzido efeito no servidor.
Reconcilie o estado antes de repetir criação de processo/documento, envio de
e-mail, tramitação, replicação ou outra alteração.

Grave os identificadores retornados para acompanhamento. Fluxos com várias
chamadas não são uma transação única: mantenha resultados parciais e falhas por
item. Limite concorrência em consultas em lote. Cache de permissões ou estado
de processos deve ter política de atualização definida pelo consumidor.

## Evidência de compatibilidade

Tipos e testes com fixtures verificam o comportamento do cliente, não a
habilitação de um serviço na instalação de destino. Build e TypeDoc também não
validam acesso real ao SEI/SIP.

Uma validação em homologação se aplica à operação, aos parâmetros e ao ambiente
exercitados. Métodos marcados como **Experimental** na referência de API ainda
exigem validação de ponta a ponta. A versão do contrato de referência não é uma
garantia irrestrita para versões, módulos e configurações diferentes.

Para relatar um problema, informe versão do pacote, versão do servidor, operação,
parâmetros anonimizados, status/erro e comportamento esperado. Identifique se a
operação existe no WSDL, se está liberada e se o comportamento diverge do
contrato ou da normalização documentada.
