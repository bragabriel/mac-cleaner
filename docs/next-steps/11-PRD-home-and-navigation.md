# PRD — Home And Navigation

## Objetivo

Redesenhar a arquitetura de navegacao para ficar clara, minimalista e escalavel.

## Entra nesta fase

- home com 3 entradas principais:
  - `Remover um app por completo`
  - `Encontrar residuos`
  - `Limpar lixo do sistema`
- navegacao clara entre as tres frentes;
- linguagem visual minimalista tipo Apple.

## Fora desta fase

- dashboard complexo;
- metricas pesadas na tela inicial;
- excesso de informacao tecnica.

## Dependencias

- definicao das tres frentes do produto.

## Criterios de validacao

- usuario entende rapidamente o que cada area faz;
- a tela inicial nao parece uma lista confusa de funcoes;
- o design continua simples mesmo com crescimento do produto.

## Riscos

- home bonita mas vaga demais;
- navegacao esconder a funcao principal de desinstalacao.

## Implementado

- home com 3 entradas principais;
- navegacao dedicada para `Home`, `Uninstall App`, `Residues` e `System`;
- profundidade horizontal maxima de duas colunas de conteudo alem da sidebar fixa;
- terceiro nivel em diante cresce para baixo dentro da coluna final, com scroll interno;
- viewport operacional fixa para notebook; quem rola sao os paineis internos;
- visual mais limpo e direto do que a tela anterior.
