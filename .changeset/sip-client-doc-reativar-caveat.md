---
"@anpdgovbr/sip-client": patch
---

Documenta que `replicarUsuarios` com `operacao: "C"`, `"A"` e `"D"` está confirmado funcionando contra um ambiente SIP real (uso contínuo em produção). Documenta também um caso confirmado em que `operacao: "R"` (reativar) retornou sucesso sem aplicar a reativação — o retorno `true` não deve ser tratado como confirmação de que a reativação foi aplicada. Em `"R"`, somente `IdOrigem` é considerado contratualmente; CPF ausente pode indicar cadastro legado em recredenciamentos, mas não comprova a causa da falha. Sem mudança de código, apenas TSDoc e `doc/sip-contrato-wsdl.md`.
