# Logic Model-Building Game

Webová výuková hra, ve které hráč staví konečné Kripkeho modely splňující nebo
vyvracející modální formule. Aktuálně jsou hotové první tři etapy: typované
logické jádro, parser formulí, sandbox a první vizuální editor Kripkeho modelu.
Kampaň přijde v dalších etapách.

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
│   ├── parser.ts        # tokenizer a parser textových formulí
│   ├── evaluate.test.ts # testy sémantiky
│   └── parser.test.ts   # testy syntaxe a integrace s evaluátorem
├── App.tsx              # formulářový sandbox
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

Parser přijímá symboly `¬`, `∧`, `∨`, `→`, `□`, `◇` i textové alternativy
`!`, `&`, `|`, `->`, `box`, `diamond`. Priorita operátorů je
`¬/□/◇` > `∧` > `∨` > `→`; implikace je pravostranně asociativní. Závorkami
lze prioritu přepsat.

Sandbox umožňuje zadat formuli, vytvořit a odstranit světy, upravit jejich
valuace, přidat orientované hrany, zvolit hodnoticí svět a určit, zda má být
výsledkem model, nebo kontramodel. Výsledek kontroluje výhradně deterministické
logické jádro. Evaluator zároveň podává stručné deterministické vysvětlení —
například ukáže svět, který je svědkem `◇`, nebo protipříkladem pro `□`.
Rozehraný sandbox se automaticky ukládá do `localStorage` daného prohlížeče;
žádná data se neposílají na server.

Vizuální editor používá React Flow. Světy lze přesouvat po ploše a vytvářet
orientované relace tažením mezi jejich spojovacími body. Přesný název světa,
valuace a seznam hran zůstávají upravitelné také formulářem. Grafická vrstva je
oddělená od logického jádra a neúčastní se rozhodování o pravdivosti.

Editor nabízí režimy Edit/Evaluate, kontextovou kartu vybraného světa, undo a
redo, sbalitelné boční panely a mapový toolbar pro přizpůsobení pohledu nebo
skrytí odvozených hran.

Sandbox podporuje globální podmínky reflexivity, symetrie a tranzitivity.
Ručně zadané hrany tvoří základ relace a aplikace nad nimi deterministicky
spočítá nejmenší odpovídající uzávěr. Odvozené hrany jsou v grafu čárkované;
reflexivita je kvůli přehlednosti označena symbolem `↻` přímo u světa.

Nekonečné modely zatím podporované nejsou. Jejich budoucí reprezentace musí
nejprve přesně určit regulární strukturu a valuace; pouhá grafická značka
nekonečné větve by pro jednoznačnou sémantiku nestačila.

## Rozsah první etapy

Projekt úmyslně zatím neobsahuje backend, databázi, AI API, solver, grafický
editor, kampaň ani ukládání postupu. Aktuální produktový kontext je v souboru
`logic_model_building_game_kontext.txt`.

## Stav etap

- Etapa 1 — logické jádro: hotovo.
- Etapa 2 — parser formulí: hotovo.
- Etapa 3 — jednoduchý sandbox: hotovo.
- Etapa 4 — první vizuální editor: hotovo, čeká na praktické UX ověření.
- Etapy 5–6 — kampaň, doladění a nasazení: později.
