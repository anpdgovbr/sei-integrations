# @anpdgovbr/sip-client

Cliente TypeScript para chamadas SOAP RPC/encoded ao webservice do SIP.

```ts
import { createSipClient } from "@anpdgovbr/sip-client"

const sip = createSipClient({
  endpointUrl: "https://sei.anpd.gov.br/sip/ws/SipWS.php",
  accessKey: process.env.SIP_ACCESS_KEY!,
  systemId: "100000100",
  requestTimeoutMs: 30_000,
})

const usuario = await sip.consultas.buscarUsuarioPorSigla("usuario.exemplo")
```

O pacote não lê variáveis de ambiente. Cada aplicação consumidora deve montar a
configuração conforme seu ambiente e suas regras de segurança.

Guia completo de uso: [../../doc/sip-client.md](../../doc/sip-client.md).
