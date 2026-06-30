# Mac Cleaner

Cleaner para macOS focado em encontrar sobras de apps.

## Qual comando usar

### App real do Mac

Use este comando para testar o app de verdade, com Electron + acesso local ao sistema:

```bash
npm install
npm run dev:desktop
```

Esse e o modo certo para testar inventario de apps, scan real e integracao com o macOS.

### Frontend apenas

Use este comando somente para mexer na interface no navegador:

```bash
npm run dev
```

Esse modo sobe so o frontend Vite.
Nao e o app real do Mac.
Usa dados mockados para voce trabalhar na interface separado.
Nao deve ser usado para validar comportamento real do produto.

## Resumo rapido

- `npm run dev:desktop`: app real desktop via Electron.
- `npm run dev`: frontend web isolado para UI.
- `npm run start:desktop`: abre o Electron sem subir o servidor dev.
- `npm run dist:mac`: gera build desktop para Mac.

## Validacao basica

```bash
npm run lint
npm run build
npm run test:smoke
```
