# Automação e colaboração no GitHub

## Workflows

| Workflow      | Gatilho e branch                             | Resultado                                                                                            |
| ------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ci.yml`      | Push/PR para `dev` e `main`; execução manual | Segredos, formatação, lint, tipos, build e testes com cobertura em Node 22/24/26; TypeDoc em Node 24 |
| `docs.yml`    | Push na `main`; manual somente na `main`     | Build TypeDoc e publicação no GitHub Pages                                                           |
| `release.yml` | Push na `main`; manual somente na `main`     | Validações e PR de versões ou publicação/reconciliação no npm                                        |

O pnpm é obtido de `packageManager` no `package.json`. Instalações usam
`--frozen-lockfile`. `test:coverage` já executa o build; não é necessário
compilar novamente antes desse script. A matriz CI testa as linhas de Node
explicitamente declaradas no projeto, sem afirmar compatibilidade com versões
futuras. Artefatos de cobertura são separados por versão do Node.

TypeDoc é validado antes da promoção; erros de dependência ou links quebrados
precisam ser resolvidos, sem ignorar a etapa. Sucesso em testes locais não
confirma execução no GitHub nem validação real contra SEI/SIP.

A detecção de segredos usa o binário OSS do Gitleaks, com versão explícita e
checksum verificado antes da instalação. Ao atualizar `GITLEAKS_VERSION` em
`ci.yml`, confira a distribuição e o formato dos checksums. Essa versão não é
atualizada pelo Dependabot de GitHub Actions.

## Configuração do repositório

- Configure GitHub Pages com origem **GitHub Actions** e permita o environment
  `github-pages` para `main`. Somente o job de deploy recebe permissões Pages/OIDC.
- Permita ao GitHub Actions criar PRs para o Changesets. O workflow concede
  escrita de conteúdo/PR apenas ao job de release.
- Configure um Trusted Publisher em **cada pacote npm**, apontando para a
  organização/repositório e o arquivo `release.yml`. Não configure um environment
  npm que o job não usa. A publicação usa OIDC, sem `NPM_TOKEN`; o registry público
  é definido pelo script `scripts/release-npmjs.mjs`.
- Configure regras de proteção para `dev`/`main` e revisores conforme a política
  da equipe. `CODEOWNERS` apenas declara responsáveis: não ativa revisão
  obrigatória sozinho. Ao mudar nomes de jobs ou a matriz, revise os checks
  obrigatórios nas regras de branch.

A PR automática criada com `GITHUB_TOKEN` pode não disparar os workflows de PR.
Confira os checks necessários antes do merge; as validações do próprio release
continuam sendo executadas no push resultante em `main`.

## Versionamento e publicação

1. PRs de trabalho seguem para `dev` com changesets dos pacotes afetados.
2. A promoção para `main` executa o workflow de release.
3. Com changesets pendentes, o Changesets abre/atualiza `chore: version packages`.
   O sucesso dessa execução ainda não significa publicação no npm.
4. Após o merge da PR de versões, sem changesets pendentes, `release:npmjs`
   verifica versões no registry e publica as ausentes, em ordem de dependência.
   O script confirma disponibilidade pública e reconcilia tags/GitHub Releases.
5. Em falhas parciais ou staging no npm, confira o log e execute novamente em
   `main`: o script verifica versões existentes antes de publicar.

A geração de Pages é independente da publicação npm. Um deploy de documentação
não confirma que os pacotes foram publicados.

## Dependabot e templates

O Dependabot abre atualizações de versão contra `dev`, semanalmente no fuso de
São Paulo. ESLint/typescript-eslint e Vitest/cobertura têm grupos próprios para
atualizações minor/patch coordenadas; majors permanecem separadas. Revise também
catálogos, overrides e lockfile. Não há merge automático nem changeset gerado
pelo Dependabot. Atualizações de segurança dependem da habilitação e política
do GitHub para a branch padrão.

Os formulários de bugs e melhorias pedem operação SOAP, versão, evidência
anonimizada e alcance esperado. Distinga limite do WS, método ausente na lib,
permissão do serviço e composição no consumidor. Relatos de segurança seguem
[SECURITY.md](SECURITY.md), sem issue pública.

Consulte também [CONTRIBUTING.md](../CONTRIBUTING.md),
[Capacidades SEI](../doc/sei-contrato-wsdl.md) e
[Integração e diagnóstico](../doc/integracao-e-diagnostico.md).
