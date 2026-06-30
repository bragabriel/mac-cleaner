# PRD — Orphan Residues Flow

## Objetivo

Criar a experiencia de procurar residuos de apps que ja nao estao mais instalados no Mac.

## Entra nesta fase

- scan profundo do sistema em busca de residuos orfaos;
- tentativa de associacao com app de origem quando possivel;
- uso do rotulo `App nao identificado` quando nao houver associacao confiavel;
- classificacao de resultados por nivel de confianca.

## Fora desta fase

- limpeza generica do sistema;
- heuristica perfeita de atribuicao.

## Dependencias

- scanner profundo;
- modelo de confianca por item;
- UX de resultados.

## Criterios de validacao

- usuario consegue rodar um scan de residuos sem escolher app;
- resultados mostram candidato de origem quando possivel;
- itens sem associacao continuam visiveis e compreensiveis.

## Riscos

- excesso de ruido em scans muito amplos;
- baixa confianca demais reduzir utilidade do fluxo.

## Implementado

- fluxo dedicado de residuos sem depender de app selecionado;
- tentativa deterministica de adivinhar o app pai;
- fallback claro para `App nao identificado`;
- confianca baixa, media e alta visivel na lista.
