# [B4] Modelli 3D veri per le navi (GLTFLoader)

**Blocco:** B — Backlog funzionalità
**Etichette:** valore: basso (cosmetico) · costo: medio · area: engine

## Cosa fare
Oggi le navi sono geometrie semplici. Sostituirle con un modello 3D vero
(caravella). Con il motore in `GlobeEngine` l'aggancio è isolato.

## Passi
1. Carica un GLTF leggero con `GLTFLoader`, da CDN versionato o asset locale.
2. Sostituisci le geometrie semplici nelle scene `journey`.
3. Se il caricamento fallisce, torna alla geometria semplice (mai scena vuota).

## Fatto quando
Nelle scene di viaggio si vede una vera caravella, con ripiego sicuro.
