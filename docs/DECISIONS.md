# Decisions

| Decisao | Escolha | Motivo |
| --- | --- | --- |
| Plataforma inicial | macOS only | escopo explicitamente restrito por enquanto |
| Forma da v1 | app desktop empacotada | necessario para testar no Mac de forma real |
| Stack da v1 | Electron + React + Vite + TypeScript | menor caminho reaproveitando o prototipo atual |
| Estrutura do produto | `Desinstalar App`, `Residuos`, `Sistema` | separa jobs diferentes e reduz confusao da UI |
| Escopo funcional inicial | desinstalacao profunda e residuos | produto principal deixou de ser so detector de sobras |
| Cobertura de scan | varrer o maximo possivel, inclusive pastas ocultas | preferencia explicita do projeto |
| Scan da v1 | apenas scan profundo | simplifica UX e bate com expectativa do produto |
| Fluxo de limpeza final | listar -> selecionar -> confirmar -> remover | fluxo aprovado pelo usuario |
| Escopo de desinstalacao | incluir o `.app` principal e residuos relacionados | desinstalar app precisa remover tudo dele |
| Scans simultaneos | nao | um scan por vez evita confusao operacional |
| UX visual | minimalista tipo Apple | preferencia explicita do produto |
| Resultados incertos | mostrar e classificar por confianca | nao esconder candidatos de residuo |
| Residuos sem associacao | rotulo `App nao identificado` | linguagem mais clara para o usuario |
| Confirmacao de remocao | modal final com lista dos itens selecionados | delecao direta pede revisao clara |

## Goal Status

| Goal | Status | Descricao |
| --- | --- | --- |
| App macOS testavel | TODO | sair do prototipo web e rodar como app no Mac |
| Desinstalacao profunda de app | TODO | remover `.app` principal e rastro relacionado |
| Deteccao real de residuos | TODO | identificar restos de apps ja removidos no sistema |
| UI integrada com scanner real | TODO | substituir mocks por dados do sistema |
| Limpeza generica do sistema | TODO | frente posterior para caches e logs genericos |
| Remocao real | TODO | implementacao com confirmacao e delecao direta |

## PRD Tracking

| Status | Feature | Motivation | PRD |
| --- | --- | --- | --- |
| DONE | Electron shell | sair do browser e virar app macOS real | `docs/next-steps/01-PRD-electron-shell.md` |
| DONE | App inventory | trocar lista mockada por apps reais do sistema | `docs/next-steps/02-PRD-app-inventory.md` |
| DONE | Residue scanner | detectar sobras reais em caminhos conhecidos do macOS | `docs/next-steps/03-PRD-residue-scanner.md` |
| DONE | Results UI integration | ligar o fluxo visual atual aos dados reais | `docs/next-steps/04-PRD-results-ui-integration.md` |
| DONE | Permissions and safety | explicitar limites de acesso e comportamento seguro | `docs/next-steps/05-PRD-permissions-and-safety.md` |
| DONE | Direct removal | implementar remocao real apos selecao | `docs/next-steps/06-PRD-direct-removal.md` |
| DONE | MVP packaging | fechar uma build testavel para Mac | `docs/next-steps/07-PRD-mvp-packaging.md` |
| DONE | Uninstall app flow | transformar o produto em desinstalador profundo | `docs/next-steps/08-PRD-uninstall-app-flow.md` |
| TODO | Orphan residues flow | criar a experiencia de residuos de apps removidos | `docs/next-steps/09-PRD-orphan-residues-flow.md` |
| TODO | System junk flow | mapear a terceira aba de limpeza generica | `docs/next-steps/10-PRD-system-junk-flow.md` |
| DONE | Minimal home and navigation | reduzir confusao com home e navegacao claras | `docs/next-steps/11-PRD-home-and-navigation.md` |
| DONE | Results model and progress UX | exibir progresso, confianca e detalhes expansivos | `docs/next-steps/12-PRD-results-and-progress-ux.md` |
| TODO | Future recoverable-size ideas | registrar ideias futuras de espaco recuperavel | `docs/next-steps/13-PRD-recoverable-size-ideas.md` |

## Regra de atualizacao

- A IA deve atualizar esta tabela sempre que um PRD mudar de status.
- Status esperados: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Notas

- O prototipo atual serve como base visual e de fluxo.
- O `README.md` raiz ainda precisa ser alinhado ao produto real em uma fase seguinte.
