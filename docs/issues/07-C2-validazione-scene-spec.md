# [C2] Validazione scene spec — collegare i validatori già scritti

**Blocco:** C — Abilitato dalla nuova architettura
**Etichette:** valore: alto · costo: basso · area: client
**Codice già pronto:** `src/types/scene.ts` (Zod + `parseSceneSpec`, `safeParseSceneSpec`, `parseLessonCard`)

## Cosa resta da fare
Lo schema Zod e i validatori sono già scritti. Manca solo usarli nel client.

## Passi
1. In `src/api/genera.ts`, dopo aver ricevuto la risposta dal Worker, passala a
   `parseSceneSpec` (o `safeParseSceneSpec`) prima di darla al motore.
2. In `src/api/lezione.ts`, valida con `parseLessonCard`.
3. Collega l'eventuale errore di validazione al messaggio gentile della issue A3.

## Fatto quando
Una scene spec malformata produce un messaggio chiaro, non un crash della scena.
