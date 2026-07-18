# @anpdgovbr/sei-sip-soap

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

## 0.2.0

### Minor Changes

- e94b97d: Prepara a publicação conjunta da infraestrutura SOAP compartilhada e dos
  clientes SIP e SEI, com documentação de pacote, smoke de validação SEI ampliado
  e TypeDocs mais completos para operações sensíveis.
