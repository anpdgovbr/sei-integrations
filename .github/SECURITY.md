# Política de Segurança

## Reportando uma vulnerabilidade

Se você encontrar uma vulnerabilidade de segurança em algum dos pacotes deste
monorepo (`@anpdgovbr/sip-client`, `@anpdgovbr/sei-client`,
`@anpdgovbr/sei-sip-soap`), **não abra uma issue pública**.

Reporte de uma das formas abaixo:

- [GitHub Security Advisories](https://github.com/anpdgovbr/sei-integrations/security/advisories/new)
  deste repositório (preferencial);
- e-mail para `desenvolvimento@anpd.gov.br`.

Inclua, se possível: versão do pacote afetado, descrição do impacto e passos
para reprodução. Não inclua chaves de acesso, tokens ou dados reais de
ambiente SEI/SIP no relato.

## Escopo

Este projeto é composto por clientes SOAP para os sistemas SEI e SIP. Ele não
gerencia autenticação, autorização, cache ou persistência — essas
responsabilidades pertencem à aplicação consumidora. Vulnerabilidades em
`SeiWS`/`SipWS` ou nos sistemas SEI/SIP em si estão fora do escopo deste
repositório e devem ser reportadas diretamente à equipe responsável por esses
sistemas.

## Versões suportadas

Apenas a última versão publicada de cada pacote recebe correções de
segurança.
