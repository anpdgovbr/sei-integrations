# @anpdgovbr/sei-client

## 1.0.5

### Patch Changes

- 9826d3f: Corrige o registry de publicação dos pacotes públicos para o npmjs. Ajusta a configuração do TypeScript e amplia as validações do monorepo, incluindo os testes da camada SOAP compartilhada e corrigindo o comando de relatório de cobertura.
- Updated dependencies [9826d3f]
  - @anpdgovbr/sei-sip-soap@1.0.5

## 1.0.4

### Patch Changes

- 618f191: Atualiza as dependências e a configuração de CI para o catálogo ANPD v8.1.0,
  alinha o pnpm em 12.3.4 e fixa a dependência do Rolldown para permitir a execução
  dos testes com cobertura.
- Updated dependencies [618f191]
  - @anpdgovbr/sei-sip-soap@1.0.4

## 1.0.3

### Patch Changes

- 923b6de: Atualiza dependencias de desenvolvimento, ferramenta de release e parser XML usados pelo monorepo.
- Updated dependencies [923b6de]
  - @anpdgovbr/sei-sip-soap@1.0.3

## 1.0.2

### Patch Changes

- 923b6de: Atualiza a toolchain de desenvolvimento e corrige vulnerabilidades em dependências transitivas.
- Updated dependencies [923b6de]
  - @anpdgovbr/sei-sip-soap@1.0.2

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
