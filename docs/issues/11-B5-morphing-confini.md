# [B5] Morphing vero dei confini (il pezzo pesante)

**Blocco:** B — Backlog funzionalità
**Etichette:** valore: medio · costo: alto · rischio: alto · area: engine

## Cosa fare
Oggi il passaggio tra epoche è un cross-fade. Obiettivo: interpolazione vera,
vertice-per-vertice, tra confini di forma diversa. È il lavoro più difficile —
**da fare per ultimo**.

## Passi
1. Ricognizione: come allineare contorni con numero di vertici diverso (resampling).
2. Prototipa su **due** soli snapshot vicini (es. 1300 → 1400) prima di generalizzare.
3. Misura il costo runtime sul globo; tienilo dietro uno switch opzionale.

## Fatto quando
I confini si trasformano in modo fluido tra due epoche vicine, senza rallentare l'app.
