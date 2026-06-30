# PRD — Uninstall App Flow

## Objetivo

Implementar o fluxo principal do produto: escolher um app instalado e removelo por completo, incluindo o `.app` principal e todo o rastro relacionado.

## Entra nesta fase

- listar apps instalados;
- escolher um app por nome;
- rodar scan profundo do `.app` e dos residuos relacionados;
- exibir resultados com selecao;
- confirmar remocao em modal;
- remover de forma direta os itens selecionados.

## Fora desta fase

- undo;
- lixeira intermediaria;
- multiplos scans em paralelo.

## Dependencias

- inventario real de apps;
- scanner profundo;
- UX de resultados e progresso.

## Criterios de validacao

- usuario consegue escolher um app instalado e ver `.app` principal + residuos;
- o fluxo deixa claro que se trata de desinstalacao completa;
- a remocao final acontece apenas apos confirmacao explicita.

## Riscos

- falso positivo em arquivos parecidos com o nome do app;
- experiencia ficar confusa se `.app` e residuos aparecerem misturados sem contexto.

## Implementado

- lista real de apps instalados no Mac;
- scan profundo incluindo o `.app` principal;
- resultados com selecao e confirmacao antes da delecao;
- remocao direta dos itens selecionados dentro dos roots seguros.
