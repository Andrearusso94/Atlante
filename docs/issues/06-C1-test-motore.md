# [C1] Test sulle funzioni pure del motore

**Blocco:** C — Abilitato dalla nuova architettura
**Etichette:** valore: alto · costo: basso · area: engine+test

## Cosa fare
Con il motore estratto in TypeScript, le funzioni geometriche diventano
testabili da sole. Aggiungiamo dei test che le proteggono.

## Passi
1. Aggiungi Vitest al progetto.
2. Copri prima `pointInPolygon` (il cuore del click sui confini) e `parseISO`
   (il cuore dello scrubber sulle date).
3. Aggiungi `slerp` e le conversioni lat/lon.

## Fatto quando
`npm test` passa e copre il picking e il parsing date.
