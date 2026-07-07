# Inconsistências SIP para avaliação da equipe SEI

Data da análise: 2026-07-07

Ambiente observado:

- SEI/SIP HML: `https://hmlsei.anpd.gov.br`
- Endpoint SOAP: `https://hmlsei.anpd.gov.br/sip/ws/SipWS.php`
- Sistema consultado: `100000100` - `SEI` - Sistema Eletrônico de Informações
- Fonte de referência local: SEI/SIP 5.0.4 em `/home/luciano/anpdgovbr/sei`

Fontes consultadas:

- `sip/web/ws/sip.wsdl`
- `sip/web/ws/SipWS.php`
- `sip/web/bd/PermissaoBD.php`
- `sip/web/rn/PermissaoRN.php`

Este documento é append-only para evidências relevantes. Antes de encaminhar à
equipe SEI/SIP, usar a classificação abaixo para não reportar problemas que eram
do cliente TypeScript ou de fixture sintética.

## Encaminhar para avaliação

### 1. `IdSistema` não tem tipo uniforme no WSDL

O WSDL do SIP 5.0.4 declara `IdSistema` como `xsd:long` em algumas operações e
como `xsd:string` em outras.

Operações com `IdSistema` como `xsd:long`:

- `validarLogin`
- `carregarOrgaos`
- `carregarUnidades`
- `carregarUsuarios`
- `carregarUsuariosSemPermissao`
- `carregarPerfis`
- `listarAcessos`

Operações/estruturas com `IdSistema` como `xsd:string`:

- estruturas `Acesso`, `Permissao` e `CoordenacaoPerfil`
- `carregarUsuario`
- `carregarRecursos`
- `listarPermissao`
- `listarCoordenacaoPerfil`
- itens de `ArrayOfIdSistema`, usado por `replicarUsuario`

Impacto para integradores:

- clientes gerados ou implementados manualmente precisam tratar `IdSistema` por
  operação;
- a documentação de consumo fica ambígua se o integrador espera um tipo global;
- payloads válidos para uma operação podem divergir de outra chamada do mesmo
  serviço.

Mitigação aplicada na lib:

- operações cujo WSDL declara `xsd:long` enviam `IdSistema` como `xsd:long`;
- operações cujo WSDL declara `xsd:string` enviam `IdSistema` como `xsd:string`.

Pergunta para a equipe SEI/SIP:

- a divergência de tipos é intencional e deve ser mantida como contrato, ou é
  legado do WSDL que poderia ser documentado/corrigido em versão futura?

### 2. `carregarUsuarios` falha com erro interno quando há permissão fora da hierarquia

Falha observada inicialmente em HML:

```text
Data: 07/07/2026 15:20:49
Web Service: Erro processando operação carregarUsuarios.
Detalhes: SipWS

Error: Call to a member function getArrUnidadesInferiores() on null
Arquivo: /opt/sip/web/bd/PermissaoBD.php:414

Stack:
PermissaoBD->carregarUsuarios(Object(PermissaoDTO))
PermissaoRN->carregarUsuariosConectado(Object(PermissaoDTO))
SipWS->carregarUsuarios('', '', NULL, NULL, NULL, NULL, NULL, NULL, '')
```

Novo log após ajuste parcial da hierarquia:

```text
Data: 07/07/2026 16:16:45
Web Service: Erro processando operação carregarUsuarios.
Detalhes: SipWS

Error: Call to a member function getArrUnidadesInferiores() on null
Arquivo: /opt/sip/web/bd/PermissaoBD.php:414

Stack:
PermissaoBD->carregarUsuarios(Object(PermissaoDTO))
PermissaoRN->carregarUsuariosConectado(Object(PermissaoDTO))
SipWS->carregarUsuarios('', 100000100, '', NULL, NULL, NULL, NULL, NULL, NULL)
```

Trecho relevante do SEI/SIP 5.0.4 em `PermissaoBD.php`:

```php
if ($item['sin_subunidades'] === 'S') {
  $arrFilhas = $arrHierarquia[$numIdUnidade]->getArrUnidadesInferiores();
  foreach ($arrFilhas as $filha) {
    ...
  }
}
```

Leitura técnica:

- a chamada chegou ao método `SipWS::carregarUsuarios`;
- no segundo log, `IdSistema=100000100` chegou ao servidor;
- havia permissão com `sin_subunidades='S'` apontando para unidade ausente em
  `$arrHierarquia`;
- ao acessar `$arrHierarquia[$numIdUnidade]`, o código tentou chamar método em
  valor nulo;
- após ajuste das permissões/hierarquia no HML, `carregarUsuarios` passou a
  responder com sucesso.

Resultado validado após correção de dados HML:

```json
{
  "orgaos": 1,
  "perfis": 16,
  "recursos": 2126,
  "usuario": {
    "id": "100000103",
    "sigla": "luciano.psilva"
  },
  "usuarioErro": null,
  "permissoes": 6
}
```

Classificação:

- não é erro de envelope SOAP da lib TypeScript;
- não é necessariamente erro cadastral do SIP em produção;
- é comportamento interno relevante: dado inconsistente em permissões/hierarquia
  gera SOAP Fault genérico HTTP 500, sem mensagem orientativa para integradores.

Sugestão para equipe SEI/SIP:

- avaliar guarda nula em `PermissaoBD::carregarUsuarios` antes de chamar
  `getArrUnidadesInferiores()`;
- avaliar mensagem de erro mais diagnóstica quando permissão com subunidades
  referencia unidade fora da hierarquia do sistema;
- se possível, validar essa inconsistência no cadastro antes de permitir salvar
  permissão/hierarquia incompatível.

### 3. SOAP Fault de serviço não liberado retorna HTTP 500

Persona HML validada:

- `SIP_SMOKE_PERSONA=sem-servico`
- `IdSistema=100000100`
- sistema consumidor com todos os serviços do smoke liberados, exceto
  `Pesquisa de Usuários`

Resposta real observada em `carregarUsuarios`:

```xml
<SOAP-ENV:Fault>
  <faultcode>SOAP-ENV:Client</faultcode>
  <faultstring>Serviço "Pesquisa de Usuários" não foi liberado para o sistema SGI-Persona-3/ANPD.</faultstring>
  <detail>
    <item>
      <key>infra_tipo_excecao</key>
      <value>INFRA_ERRO</value>
    </item>
  </detail>
</SOAP-ENV:Fault>
```

Resultado do smoke:

```json
{
  "persona": "sem-servico",
  "expected": "fault",
  "systemId": "100000100",
  "orgaos": 1,
  "perfis": 16,
  "recursos": 2126,
  "usuario": null,
  "usuarioErro": {
    "operation": "carregarUsuarios",
    "status": 500,
    "fault": "Serviço \"Pesquisa de Usuários\" não foi liberado para o sistema SGI-Persona-3/ANPD."
  },
  "permissoes": 0
}
```

Classificação:

- o Fault é semanticamente correto e informa o serviço ausente;
- o `faultcode` vem como `SOAP-ENV:Client`;
- o status HTTP observado foi 500.

Pergunta para a equipe SEI/SIP:

- para falha de autorização/configuração do cliente, o HTTP 500 é contrato
  esperado do SOAP legado ou poderia ser documentado/ajustado para evitar
  interpretação como indisponibilidade do servidor?

## Não encaminhar como inconsistência do SEI/SIP

### A. Smoke exibindo `orgaos: 4`

Diagnóstico:

- o SIP retornou um único órgão como array plano:

```json
["0", "ANPD", "Agência Nacional de Proteção de Dados", "S"]
```

- o parser inicial da lib TypeScript interpretou as quatro posições como quatro
  registros.

Correção aplicada:

- arrays planos de escalares agora são tratados como um único registro;
- o smoke passou a retornar `orgaos: 1`.

Classificação:

- erro nosso no parser;
- não encaminhar como inconsistência do SEI/SIP.

### B. Fixture inicial simplificada de `carregarUnidades`

Diagnóstico:

- a fixture sintética inicial esperava unidade como `[id, sigla, descricao,
ativo]`;
- o SEI/SIP 5.0.4 retorna a ordem real de `InfraSip::$WS_UNIDADE_*`:
  `IdUnidade`, `IdOrgao`, `Sigla`, `Descricao`, `SinAtivo`, `Subunidades`,
  `UnidadesSuperiores`, `IdOrigem`;
- o retorno real pode vir como mapa `{ key, value }` do PHP SOAP.

Correção aplicada:

- `mapUnidades` foi ajustado à ordem real;
- o parser passou a aceitar registros `{ key, value }`.

Classificação:

- divergência da fixture sintética da lib;
- não encaminhar como inconsistência do SEI/SIP.

### C. SOAP Array vazio tratado como erro pelo cliente

Diagnóstico:

- o PHP SoapServer pode retornar array vazio apenas com metadado
  `SOAP-ENC:arrayType="xsd:ur-type[0]"`;
- o cliente tratava esse metadado como dado e tentava mapear usuário sem
  `IdUsuario`.

Correção aplicada:

- objetos SOAP com `arrayType` e sem itens agora são normalizados como `[]`.

Classificação:

- bug de normalização da lib;
- não encaminhar como inconsistência do SEI/SIP.

### D. HTTP não-2xx sem SOAP Fault virando resposta vazia

Diagnóstico:

- a lib poderia mascarar falha HTTP sem Fault parseável como payload nulo.

Correção aplicada:

- HTTP não-2xx sem SOAP Fault agora lança `SipSoapError`.

Classificação:

- robustez do cliente;
- não encaminhar como inconsistência do SEI/SIP.

## Evidências versionadas na lib

Fixtures reais anonimizadas adicionadas:

- `packages/sip-client/test/fixtures/sip/carregar-usuarios-sucesso.xml`
- `packages/sip-client/test/fixtures/sip/listar-permissao-sucesso.xml`
- `packages/sip-client/test/fixtures/sip/carregar-usuarios-fault-servico-nao-liberado.xml`

Critérios:

- preservar envelope SOAP, namespaces, `ns2:Map`, `SOAP-ENC:Array`,
  `xsi:type`, `xsi:nil`, `faultcode`, `faultstring` e `detail`;
- substituir dados pessoais e nome de sistema de teste quando não forem
  necessários para validar o contrato;
- manter IDs técnicos suficientes para validar shape de resposta.
