# @anpdgovbr/sip-client

## 1.0.0

### Major Changes

- 0c33192: Primeira versão estável (1.0.0) dos clientes de integração SEI/SIP.

  - Documentação TypeDoc completa em todos os símbolos exportados dos três
    pacotes, validada com `notDocumented`, `invalidLink` e `notExported`
    (warnings tratados como erro no build de docs).
  - `sei-client`: todos os métodos de `SeiConsultasClient`, `SeiOperacoesClient`
    e da fachada `SeiClient` documentados com parâmetros, retornos, erros e
    exemplos; semânticas validadas contra o código-fonte oficial do SEI 5.0.4
    (níveis de acesso, tipos de documento e tipos/estados de bloco).
  - `sei-client`: `listarAndamentosMarcadores` agora declara o tipo público
    `SeiAndamentoMarcador[]` em vez de tipo anônimo; exportados os tipos
    `SeiAndamentoMarcador`, `SeiAtributoOuvidoria` e `SeiAnexo`.
  - READMEs dos pacotes e do monorepo atualizados (instalação, uso, tabelas de
    métodos, tratamento de erros e responsabilidades do consumidor).

  Sem breaking changes de comportamento em relação à 0.2.0 — o bump major marca
  o compromisso de estabilidade da API pública.

### Patch Changes

- Updated dependencies [0c33192]
  - @anpdgovbr/sei-sip-soap@1.0.0

## 0.2.0

### Minor Changes

- e94b97d: Prepara a publicação conjunta da infraestrutura SOAP compartilhada e dos
  clientes SIP e SEI, com documentação de pacote, smoke de validação SEI ampliado
  e TypeDocs mais completos para operações sensíveis.

### Patch Changes

- Updated dependencies [e94b97d]
  - @anpdgovbr/sei-sip-soap@0.2.0

## 0.1.4

### Patch Changes

- Corrige a configuração de release por pacote no pipeline do monorepo.

## 0.1.3

### Patch Changes

- d9fee8d: Corrige a configuração de release por pacote no pipeline do monorepo.

## 0.1.2

### Patch Changes

- 17dcc0e: Corrige a configuração de release por pacote no pipeline do monorepo.
- 17dcc0e: Adiciona metadados de publicação e documentos distribuídos no pacote.

## 0.1.1

### Patch Changes

- 8b2cc1e: Adiciona metadados de publicação e documentos distribuídos no pacote.

## 0.1.0

### Initial release

- Cliente TypeScript para SOAP RPC/encoded do SIP.
- Consultas para órgãos, unidades, usuários, usuários sem permissão, perfis,
  recursos e permissões.
- Operações de replicação expostas para uso controlado por consumidores
  autorizados.
- DTOs normalizados para consumo por aplicações TypeScript.
- Tratamento de SOAP Faults, respostas vazias e HTTP não-2xx.
- Fixtures reais anonimizadas de sucesso e falha de autorização.
