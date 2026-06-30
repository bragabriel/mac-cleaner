# PRD — System Junk Flow

## Objetivo

Mapear a terceira frente do produto: limpar lixo generico do sistema, como caches e logs nao necessariamente ligados a apps removidos.

## Entra nesta fase

- definir a aba `Sistema`;
- propor categorias iniciais de limpeza generica;
- separar claramente essa experiencia de `Desinstalar App` e `Residuos`.

## Fora desta fase

- implementacao imediata do fluxo;
- prometer cobertura total do sistema na v1.

## Dependencias

- clareza da arquitetura de navegacao;
- taxonomia de categorias de lixo generico.

## Criterios de validacao

- existe definicao clara do que entra em `Sistema`;
- o escopo nao se confunde com residuos de apps removidos.

## Riscos

- misturar cedo demais com o produto principal;
- virar um “cleaner de tudo” sem foco.

## Implementado

- aba dedicada de `System`;
- scan real de caches e logs genericos;
- separacao explicita entre lixo de sistema, residuos e desinstalacao profunda.
