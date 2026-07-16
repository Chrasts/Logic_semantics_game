# Logic Model-Building Game

Webová výuková hra, ve které hráč staví konečné Kripkeho modely splňující nebo
vyvracející modální formule. Aktuálně je hotový první milestone: typované a
otestované logické jádro. Editor modelů, parser formulí a kampaň přijdou v
dalších etapách.

## Požadavky a spuštění

Je potřeba Node.js 20 LTS nebo novější (včetně npm).

```bash
npm install
npm run dev
```

Vite vypíše lokální adresu aplikace. Další příkazy:

```bash
npm test          # jednorázově spustí unit testy
npm run test:watch # spouští testy při změnách
npm run build     # provede typovou kontrolu a produkční build
```

## Struktura

```text
src/
├── logic/
│   ├── formula.ts       # typovaný AST modálních formulí
│   ├── model.ts         # konečný Kripkeho model M = (W, R, V)
│   ├── evaluate.ts      # deterministická sémantika M,w ⊨ φ
│   └── evaluate.test.ts # testy logického jádra
├── App.tsx              # dočasná úvodní obrazovka
└── main.tsx             # vstup React aplikace
```

Logické jádro nemá závislost na Reactu. Díky tomu zůstává snadno testovatelné a
později je lze používat v sandboxu i kampani.

## Matematické konvence

Konečný Kripkeho model je `M = (W, R, V)`, kde `W` je konečná množina světů,
`R` je orientovaná relace dostupnosti a `V` přiřazuje každému světu množinu
atomů, které v něm platí.

- `M,w ⊨ p` právě když `p ∈ V(w)`.
- Booleovské spojky mají standardní klasickou sémantiku.
- `M,w ⊨ □φ` právě když `φ` platí ve všech světech dostupných z `w`.
- `M,w ⊨ ◇φ` právě když `φ` platí alespoň v jednom světě dostupném z `w`.
- Ve světě bez následníků je `□φ` vakuózně pravdivé a `◇φ` nepravdivé.
- Reflexivní hrany, cykly a větvení jsou povolené.

AST se zatím vytváří programově pomocí funkcí `atom`, `not`, `and`, `or`,
`implies`, `box` a `diamond`. Převod textové formule na AST bude samostatný
druhý milestone.

## Rozsah první etapy

Projekt úmyslně zatím neobsahuje backend, databázi, AI API, solver, grafický
editor, parser, kampaň ani ukládání postupu. Aktuální produktový kontext je v
souboru `logic_model_building_game_kontext.txt`.
