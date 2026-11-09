---
title: Migração de consumidores
group: Guias
---

# Migração de consumidores

Este guia ajuda a extrair integrações SIP implementadas dentro de aplicações
consumidoras para o pacote `@anpdgovbr/sip-client`.

## Modelo recomendado

A aplicação consumidora deve manter apenas uma fachada local para:

- ler variáveis de ambiente;
- montar `SipConfig`;
- aplicar cache, auditoria e autorização próprios;
- preservar imports internos durante a migração;
- compor fluxos de negócio específicos.

O pacote `@anpdgovbr/sip-client` deve receber somente configuração explícita:

```ts
import { createSipClient, type SipConfig } from "@anpdgovbr/sip-client"

export const loadSipConfig = (): SipConfig => ({
  endpointUrl: process.env.SIP_SOAP_ENDPOINT!,
  accessKey: process.env.SIP_ACCESS_KEY!,
  systemId: process.env.SIP_SYSTEM_ID!,
  requestTimeoutMs: Number(process.env.SIP_REQUEST_TIMEOUT_MS ?? 30_000),
})

export const getSipClient = () => createSipClient(loadSipConfig())
```

## O que mover para a lib

Mova para `@anpdgovbr/sip-client`:

- montagem de envelopes SOAP RPC/encoded;
- parsing de SOAP Fault;
- normalização de arrays SOAP e mapas PHP;
- tipos públicos do SIP;
- mappers de usuários, unidades, perfis, recursos e permissões;
- cliente de consultas e replicação;
- testes de contrato com fixtures SOAP.

## O que manter no consumidor

Mantenha na aplicação consumidora:

- `.env` e nomes reais das variáveis;
- autorização de usuário final;
- auditoria de quem consultou ou replicou dados;
- cache;
- persistência;
- regras de negócio;
- API routes, controllers, jobs e filas;
- decisões de UI;
- composição com RBAC, banco ou outros serviços.

## Cuidados durante a migração

- Não exponha a chave do SIP em frontend.
- Prefira `client.consultas.*` para código novo.
- Trate `client.replicacao.*` como operação sensível.
- Não libere serviços de replicação no SIP para consumidores somente leitura.
- Não confunda SIP com SEI direto: permissões e cadastros vêm do SIP; operações
  próprias do SEI (processos, documentos, envios) usam o `@anpdgovbr/sei-client`.
  Veja [sei-client.md](sei-client.md).
- Preserve a compatibilidade do consumidor com uma fachada local até trocar os
  imports internos.

## Adoção do cliente SEI

Para SEI, a fachada local recebe `SeiConfig` e usa `createSeiClient`; mantenha
configuração, cache, autorização, auditoria e persistência no consumidor, como
no SIP. Preserve a distinção entre ID interno e protocolo formatado.

Antes de substituir uma integração existente, confira a origem dos dados:
consultas diretas ao banco, automação de interface e módulos locais podem ter
capacidades que o SOAP base não expõe. Não assuma equivalência só porque a tela
do SEI possui a função. Use a [matriz SEI](sei-contrato-wsdl.md) para verificar
os pré-requisitos de cada fluxo, principalmente listagens por unidade.

Preserve os protocolos conhecidos e os IDs de blocos durante a migração.
Registre resultados parciais e reconcilie escritas antes de repetir chamadas
que perderam a resposta. Veja [Integração e diagnóstico](integracao-e-diagnostico.md).

## Validação sugerida

No repositório da lib:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

No consumidor, instale as dependências de forma reprodutível com o gerenciador
de pacotes do projeto:

```bash
npm ci
# ou
yarn install --frozen-lockfile
# ou
pnpm install --frozen-lockfile
```

E rode os scripts de qualidade já configurados no projeto consumidor (nomes
podem variar, mas normalmente incluem):

```bash
<seu-gerenciador> run typecheck
<seu-gerenciador> run lint
<seu-gerenciador> run test
```

Quando houver acesso ao ambiente SIP, faça um smoke test server-side usando um
usuário de teste anonimizado ou controlado e valide apenas contagens/IDs
necessários, sem registrar dados sensíveis em logs permanentes.
