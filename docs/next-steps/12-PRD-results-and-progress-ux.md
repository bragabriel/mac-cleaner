# PRD — Results And Progress UX

## Objetivo

Definir como scans profundos, resultados e acoes aparecem sem deixar o usuario no escuro.

## Entra nesta fase

- barra ou indicador de progresso para scans;
- lista amigavel com detalhe expandivel;
- acoes por item: `Copy Path`, `Open`, selecao;
- classificacao por confianca;
- suporte a agrupamento escalavel, possivelmente hibrido entre categoria e arvore;
- resumo fixo de itens selecionados;
- modal final de confirmacao listando os itens selecionados.

## Fora desta fase

- IA para agrupar resultados;
- visualizacao tecnicamente densa por padrao.

## Dependencias

- scanner real;
- dados por item com metadados suficientes.

## Criterios de validacao

- usuario ve que o scan esta em andamento;
- resultados ficam compreensiveis sem mostrar caminho tecnico completo por padrao;
- a confirmacao final deixa claro o que sera removido.

## Riscos

- arvore pura ficar pesada demais;
- agrupamento por categoria sozinho esconder estrutura real dos caminhos.

## Implementado

- progresso visivel durante scans;
- resultados agrupados por categoria;
- detalhes expansivos por item;
- `Copy Path`, `Open` e `Reveal`;
- modal final de confirmacao antes da delecao direta.
