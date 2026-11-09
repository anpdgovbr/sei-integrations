---
"@anpdgovbr/sei-client": patch
"@anpdgovbr/sip-client": patch
"@anpdgovbr/sei-sip-soap": patch
---

Revisa e complementa a documentação dos clientes SEI/SIP e da infraestrutura
SOAP compartilhada, com matriz de capacidades, exemplos corrigidos e orientações
de configuração, retornos, erros, timeout e repetição de escritas. Esclarece que
a ausência de listagem geral de processos por unidade decorre do contrato WS
base do SEI, documentando as combinações possíveis e seus limites de cobertura.

Atualiza as dependências de desenvolvimento ESLint, typescript-eslint e globals,
adiciona overrides para glob e minimatch e sincroniza o lockfile.

Corrige a geração do TypeDoc com minimatch 11 por meio de patch versionado que
usa a API pública de correspondência parcial. Mantém os overrides de segurança
e permite gerar a documentação pelo comando padrão `pnpm run docs`.
