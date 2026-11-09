## Problema e resultado

<!-- Descreva o problema concreto e o comportamento após a alteração. -->

## Contrato e alcance

<!-- Para mudanças SEI/SIP: operação SOAP, versão de referência e pré-requisitos.
Distinga operação ausente no WS, método ausente na lib, habilitação/permissões
no servidor e composição no consumidor. Informe efeitos de escrita e limites
de cobertura quando houver consultas em lote ou filtros locais. -->

## Validação

<!-- Informe comandos e resultados. Separe testes com fixtures de validação
real em homologação. Registre falhas, limitações e o que não foi executado. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:coverage` (inclui build dos pacotes)
- [ ] `pnpm run docs`
- [ ] READMEs, guias e comentários TypeDoc atualizados, quando aplicável
- [ ] Changeset incluído para alterações publicáveis, com todos os pacotes afetados
- [ ] Exemplos usam campos e retornos dos tipos atuais e valores fictícios
- [ ] Nenhum segredo, envelope não anonimizado ou dado real de processo/documento foi incluído

<!-- PRs de trabalho têm destino dev; promoção e PR de versões têm destino main.
Indique itens não aplicáveis. Não marque homologação como concluída apenas
porque o build ou testes unitários passaram. -->
