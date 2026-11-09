# Patches de dependências

## TypeDoc 0.28.20 e minimatch 11

`typedoc@0.28.20.patch` adapta a recursão de diretórios do TypeDoc para usar
`Minimatch.match(path, true)`, API pública de correspondência parcial, no lugar
de `Minimatch.matchOne`, removido no minimatch 11.

O override do workspace mantém minimatch em `^11.0.1` ou superior para corrigir
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
Voltar ao minimatch 10 não resolve esse requisito de segurança. A configuração
`patchedDependencies` e o hash no lockfile aplicam o patch durante a instalação;
não é necessário modificar `node_modules` manualmente ou usar um loader.

Ao atualizar TypeDoc, verifique se a versão nova suporta minimatch 11. Se
suportar, remova o registro de patch e seu arquivo, atualize o lockfile e execute
`pnpm install --frozen-lockfile` e `pnpm run docs`. Caso ainda precise de adaptação,
prepare e registre um patch específico da nova versão com `pnpm patch` e
`pnpm patch-commit`.
