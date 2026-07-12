# Estilos padrao do editor SEI

Este documento registra onde o SEI fonte resolve os estilos do editor HTML e
lista os seletores de interesse para extracao da formatacao CSS real.

## Origem no SEI

No checkout analisado em `/home/luciano/anpdgovbr/sei`, os estilos padrao nao
aparecem como classes CSS estaticas em arquivos `.css`. O SEI resolve esses
valores a partir do banco:

- `src/sei/web/int/EDocINT.php:49-62` consulta todos os registros de `estilo`
  via `EstiloRN`, usa `nome` como chave e `formatacao` como CSS. Para o editor
  interno legado, remove aspas simples e troca virgulas por ponto-e-virgula.
- `src/sei/web/editor/int/ConjuntoEstilosINT.php:16-47` consulta
  `conjunto_estilos_item`, usando o ultimo conjunto quando nenhum
  `id_conjunto_estilos` e informado, e normaliza o formato antigo
  `'propriedade':'valor'` para `propriedade:valor;`.
- `src/sei/web/editor/rn/EditorCk5RN.php:614-633` monta a formatacao entregue ao
  CKEditor 5 como `.NomeDoEstilo{...}` a partir de
  `ConjuntoEstilosINT::montarArrEstilos()`.
- `src/sei/web/editor/rn/ConjuntoEstilosRN.php:114-207` sincroniza um novo
  conjunto de estilos copiando os registros da tabela mestre `estilo` para
  `conjunto_estilos_item`.
- `docs/schema_sei/estilo.md` define `estilo.nome` e `estilo.formatacao`.
- `docs/schema_sei/conjunto_estilos_item.md` define
  `conjunto_estilos_item.nome` e `conjunto_estilos_item.formatacao`.

Ou seja: a formatacao CSS correspondente e resolvida a partir do banco SEI do
ambiente-alvo. O fonte do SEI registra o mecanismo e o schema; a carga de
referencia foi localizada em `/home/luciano/anpdgovbr/sei-db-ref-executivo`.

Neste documento, a extracao abaixo usa
`mysql/v5.0.0/sei_5_0_0_BD_Ref_Exec.sql` como referencia textual mais recente:

- `mysql/v5.0.0/sei_5_0_0_BD_Ref_Exec.sql:1917` contem a carga mestre
  `INSERT INTO estilo`.
- `mysql/v5.0.0/sei_5_0_0_BD_Ref_Exec.sql:1339` contem a carga de
  `conjunto_estilos_item`. O conjunto `id_conjunto_estilos=82` espelha os
  estilos atuais da tabela mestre nesta carga.

## Web service SEI

O WSDL publico do SEI (`src/sei/web/ws/sei.wsdl`) nao expoe operacao para listar
ou consultar estilos do editor. A busca por `Estilo`, `estilo` e `Conjunto` nos
WSDLs e classes em `src/sei/web/ws/` nao retornou metodo publico relacionado a
essa area.

As operacoes de estilo existem no codigo como regras internas e telas
administrativas, por exemplo `EstiloRN`, `ConjuntoEstilosRN`,
`ConjuntoEstilosINT`, `estilo_lista.php` e `estilo_cadastro.php`. Elas exigem o
fluxo interno do SEI, permissao de tela/sessao e acesso ao banco; nao aparecem
como contrato SOAP consumivel pelo `@anpdgovbr/sei-client`.

## Consulta para extrair do conjunto atual

Use esta consulta para extrair a versao efetivamente entregue ao editor atual:

```sql
SELECT
  cei.nome,
  cei.formatacao
FROM conjunto_estilos_item cei
JOIN conjunto_estilos ce
  ON ce.id_conjunto_estilos = cei.id_conjunto_estilos
WHERE ce.sin_ultimo = 'S'
  AND cei.nome IN (
    'Citacao',
    'Item_Alinea_Letra',
    'Item_Alinea_Letra:before',
    'Item_Inciso_Romano',
    'Item_Inciso_Romano:before',
    'Item_Nivel1',
    'Item_Nivel1:before',
    'Item_Nivel2',
    'Item_Nivel2:before',
    'Item_Nivel3',
    'Item_Nivel3:before',
    'Item_Nivel4',
    'Item_Nivel4:before',
    'Item_Nivel5',
    'Item_Nivel5:before',
    'Item_Nivel6',
    'Item_Nivel6:before',
    'Paragrafo_Numerado_Nivel1',
    'Paragrafo_Numerado_Nivel1:before',
    'Paragrafo_Numerado_Nivel2',
    'Paragrafo_Numerado_Nivel2:before',
    'Paragrafo_Numerado_Nivel3',
    'Paragrafo_Numerado_Nivel3:before',
    'Paragrafo_Numerado_Nivel4',
    'Paragrafo_Numerado_Nivel4:before',
    'Tabela_Texto_8_Centralizado',
    'Tabela_Texto_8_Direita',
    'Tabela_Texto_8_Esquerda',
    'Tabela_Texto_Alinhado_Direita',
    'Tabela_Texto_Alinhado_Esquerda',
    'Tabela_Texto_Centralizado',
    'Texto_Alinhado_Direita',
    'Texto_Alinhado_Esquerda',
    'Texto_Alinhado_Esquerda_Espacamento_Simples',
    'Texto_Alinhado_Esquerda_Espacamento_Simples_Maiusc',
    'Texto_Centralizado',
    'Texto_Centralizado_Maiusculas',
    'Texto_Centralizado_Maiusculas_Negrito',
    'Texto_Espaco_Duplo_Recuo_Primeira_Linha',
    'Texto_Fundo_Cinza_Maiusculas_Negrito',
    'Texto_Fundo_Cinza_Negrito',
    'Texto_Grande_Centralizado',
    'Texto_Justificado',
    'Texto_Justificado_Maiusculas',
    'Texto_Justificado_Recuo_Primeira_Linha',
    'Texto_Justificado_Recuo_Primeira_Linha_Esp_Simples'
  )
ORDER BY cei.nome;
```

Para extrair a tabela mestre, sem depender do ultimo conjunto sincronizado:

```sql
SELECT
  e.nome,
  e.formatacao
FROM estilo e
WHERE e.nome IN (
    'Citacao',
    'Item_Alinea_Letra',
    'Item_Alinea_Letra:before',
    'Item_Inciso_Romano',
    'Item_Inciso_Romano:before',
    'Item_Nivel1',
    'Item_Nivel1:before',
    'Item_Nivel2',
    'Item_Nivel2:before',
    'Item_Nivel3',
    'Item_Nivel3:before',
    'Item_Nivel4',
    'Item_Nivel4:before',
    'Item_Nivel5',
    'Item_Nivel5:before',
    'Item_Nivel6',
    'Item_Nivel6:before',
    'Paragrafo_Numerado_Nivel1',
    'Paragrafo_Numerado_Nivel1:before',
    'Paragrafo_Numerado_Nivel2',
    'Paragrafo_Numerado_Nivel2:before',
    'Paragrafo_Numerado_Nivel3',
    'Paragrafo_Numerado_Nivel3:before',
    'Paragrafo_Numerado_Nivel4',
    'Paragrafo_Numerado_Nivel4:before',
    'Tabela_Texto_8_Centralizado',
    'Tabela_Texto_8_Direita',
    'Tabela_Texto_8_Esquerda',
    'Tabela_Texto_Alinhado_Direita',
    'Tabela_Texto_Alinhado_Esquerda',
    'Tabela_Texto_Centralizado',
    'Texto_Alinhado_Direita',
    'Texto_Alinhado_Esquerda',
    'Texto_Alinhado_Esquerda_Espacamento_Simples',
    'Texto_Alinhado_Esquerda_Espacamento_Simples_Maiusc',
    'Texto_Centralizado',
    'Texto_Centralizado_Maiusculas',
    'Texto_Centralizado_Maiusculas_Negrito',
    'Texto_Espaco_Duplo_Recuo_Primeira_Linha',
    'Texto_Fundo_Cinza_Maiusculas_Negrito',
    'Texto_Fundo_Cinza_Negrito',
    'Texto_Grande_Centralizado',
    'Texto_Justificado',
    'Texto_Justificado_Maiusculas',
    'Texto_Justificado_Recuo_Primeira_Linha',
    'Texto_Justificado_Recuo_Primeira_Linha_Esp_Simples'
  )
ORDER BY e.nome;
```

## Normalizacao aplicada pelo SEI

Quando a formatacao vier no formato legado:

```text
'text-align':'center','font-size':'12pt'
```

o SEI normaliza para:

```css
text-align: center;
font-size: 12pt;
```

Para reproduzir a saida do CKEditor 5, envolva a formatacao normalizada no
seletor:

```css
.Texto_Centralizado {
  text-align: center;
  font-size: 12pt;
}
```

Se o registro usar pseudo-elemento no nome, como `Item_Nivel1:before`, a saida
equivalente fica:

```css
.Item_Nivel1:before {
  /* formatacao extraida de conjunto_estilos_item.formatacao */
}
```

## CSS extraido da carga de referencia

Os seletores abaixo foram normalizados a partir de `estilo.formatacao` na carga
`mysql/v5.0.0/sei_5_0_0_BD_Ref_Exec.sql`.

```css
.Citacao {
  font-size: 10pt;
  font-family: Calibri;
  word-wrap: normal;
  margin: 4pt 0 4pt 160px;
  text-align: justify;
}

.Item_Alinea_Letra {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt 6pt 6pt 120px;
  counter-increment: letra_minuscula;
}

.Item_Alinea_Letra:before {
  content: counter(letra_minuscula, lower-latin) ") ";
  display: inline-block;
  width: 5mm;
  font-weight: normal;
}

.Item_Inciso_Romano {
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0mm;
  margin: 6pt 6pt 6pt 120px;
  counter-increment: romano_maiusculo;
  counter-reset: letra_minuscula;
}

.Item_Inciso_Romano:before {
  content: counter(romano_maiusculo, upper-roman) " - ";
  display: inline-block;
  width: 15mm;
  font-weight: normal;
}

.Item_Nivel1 {
  text-transform: uppercase;
  font-weight: bold;
  background-color: #e6e6e6;
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0;
  margin: 6pt;
  counter-increment: item-n1;
  counter-reset: item-n2 item-n3 item-n4 romano_maiusculo letra_minuscula;
}

.Item_Nivel1:before {
  content: counter(item-n1) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Item_Nivel2 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: item-n2;
  counter-reset: item-n3 item-n4 romano_maiusculo letra_minuscula;
}

.Item_Nivel2:before {
  content: counter(item-n1) "." counter(item-n2) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Item_Nivel3 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: item-n3;
  counter-reset: item-n4 romano_maiusculo letra_minuscula;
  margin-left: 40px;
}

.Item_Nivel3:before {
  content: counter(item-n1) "." counter(item-n2) "." counter(item-n3) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Item_Nivel4 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: item-n4;
  counter-reset: romano_maiusculo letra_minuscula;
  margin-left: 80px;
}

.Item_Nivel4:before {
  content: counter(item-n1) "." counter(item-n2) "." counter(item-n3) "." counter(item-n4) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Paragrafo_Numerado_Nivel1 {
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0mm;
  margin: 6pt;
  counter-increment: paragrafo-n1;
  counter-reset: paragrafo-n2 paragrafo-n3 paragrafo-n4 romano_maiusculo letra_minuscula;
}

.Paragrafo_Numerado_Nivel1:before {
  content: counter(paragrafo-n1) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Paragrafo_Numerado_Nivel2 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: paragrafo-n2;
  counter-reset: paragrafo-n3 paragrafo-n4 romano_maiusculo letra_minuscula;
  margin-left: 40px;
}

.Paragrafo_Numerado_Nivel2:before {
  content: counter(paragrafo-n1) "." counter(paragrafo-n2) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Paragrafo_Numerado_Nivel3 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: paragrafo-n3;
  counter-reset: paragrafo-n4 romano_maiusculo letra_minuscula;
  margin-left: 80px;
}

.Paragrafo_Numerado_Nivel3:before {
  content: counter(paragrafo-n1) "." counter(paragrafo-n2) "." counter(paragrafo-n3) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Paragrafo_Numerado_Nivel4 {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 0mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
  counter-increment: paragrafo-n4;
  counter-reset: romano_maiusculo letra_minuscula;
  margin-left: 120px;
}

.Paragrafo_Numerado_Nivel4:before {
  content: counter(paragrafo-n1) "." counter(paragrafo-n2) "." counter(paragrafo-n3) "."
    counter(paragrafo-n4) ".";
  display: inline-block;
  width: 25mm;
  font-weight: normal;
}

.Tabela_Texto_Alinhado_Direita {
  font-size: 11pt;
  font-family: Calibri;
  text-align: right;
  word-wrap: normal;
  margin: 0 3pt 0 3pt;
}

.Tabela_Texto_Alinhado_Esquerda {
  font-size: 11pt;
  font-family: Calibri;
  text-align: left;
  word-wrap: normal;
  margin: 0 3pt 0 3pt;
}

.Tabela_Texto_Centralizado {
  font-size: 11pt;
  font-family: Calibri;
  text-align: center;
  word-wrap: normal;
  margin: 0 3pt 0;
}

.Texto_Alinhado_Direita {
  font-size: 12pt;
  font-family: Calibri;
  text-align: right;
  word-wrap: normal;
  margin: 6pt;
}

.Texto_Alinhado_Esquerda {
  font-size: 12pt;
  font-family: Calibri;
  text-align: left;
  word-wrap: normal;
  margin: 6pt;
}

.Texto_Alinhado_Esquerda_Espacamento_Simples {
  font-size: 12pt;
  font-family: Calibri;
  text-align: left;
  word-wrap: normal;
  margin: 0 0 0 6pt;
}

.Texto_Alinhado_Esquerda_Espacamento_Simples_Maiusc {
  font-size: 12pt;
  font-family: Calibri;
  text-align: left;
  text-transform: uppercase;
  word-wrap: normal;
  margin: 0 0 0 6pt;
}

.Texto_Centralizado {
  font-size: 12pt;
  font-family: Calibri;
  text-align: center;
  word-wrap: normal;
  margin: 6pt;
}

.Texto_Centralizado_Maiusculas {
  font-size: 13pt;
  font-family: Calibri;
  text-align: center;
  text-transform: uppercase;
  word-wrap: normal;
}

.Texto_Centralizado_Maiusculas_Negrito {
  font-weight: bold;
  font-size: 13pt;
  font-family: Calibri;
  text-align: center;
  text-transform: uppercase;
  word-wrap: normal;
}

.Texto_Espaco_Duplo_Recuo_Primeira_Linha {
  letter-spacing: 1px;
  font-weight: bold;
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 25mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
}

.Texto_Fundo_Cinza_Maiusculas_Negrito {
  text-transform: uppercase;
  font-weight: bold;
  background-color: #e6e6e6;
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0;
  margin: 6pt;
}

.Texto_Fundo_Cinza_Negrito {
  font-weight: bold;
  background-color: #e6e6e6;
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0;
  margin: 6pt;
}

.Texto_Justificado {
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0;
  margin: 6pt;
}

.Texto_Justificado_Maiusculas {
  font-size: 12pt;
  font-family: Calibri;
  text-align: justify;
  word-wrap: normal;
  text-indent: 0;
  margin: 6pt;
  text-transform: uppercase;
}

.Texto_Justificado_Recuo_Primeira_Linha {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 25mm;
  text-align: justify;
  word-wrap: normal;
  margin: 6pt;
}

.Texto_Justificado_Recuo_Primeira_Linha_Esp_Simples {
  font-size: 12pt;
  font-family: Calibri;
  text-indent: 25mm;
  text-align: justify;
  word-wrap: normal;
  margin: 0 0 0 6pt;
}
```

## Nomes solicitados ausentes na carga v5

Estes nomes foram solicitados, mas nao existem literalmente em `estilo` na carga
`mysql/v5.0.0/sei_5_0_0_BD_Ref_Exec.sql`:

- `Item_Nivel5`
- `Item_Nivel5:before`
- `Item_Nivel6`
- `Item_Nivel6:before`
- `Tabela_Texto_8_Centralizado`
- `Tabela_Texto_8_Direita`
- `Tabela_Texto_8_Esquerda`
- `Texto_Grande_Centralizado`

A carga possui `Tabela_Texto_8`, mas nao as variantes centralizado/direita/
esquerda:

```css
.Tabela_Texto_8 {
  font-size: 8pt;
  font-family: Calibri;
  text-align: left;
  word-wrap: normal;
  margin: 0 3pt 0 3pt;
}
```
