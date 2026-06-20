# [A3] Gestione errori — completare il lato client

**Blocco:** A — Indurimento pre-pubblico
**Etichette:** valore: medio · costo: basso · area: worker+client
**Codice già pronto:** `worker/index.ts` (codici 400/429/502/504, nessun segreto nei log)

## Cosa resta da fare
Il Worker già distingue gli errori. Manca soprattutto il lato client.

## Passi
1. Nel client, mostra un messaggio diverso per ogni codice: `429` (troppe richieste),
   `400` (input), `502` (IA in errore/JSON non valido), `504` (timeout).
2. Quando l'IA non risponde, degrada con grazia ai fallback offline (Roma/Colombo/Peste).
3. Verifica i casi simulando un errore (es. chiave assente → `no_key`).

## Fatto quando
Se l'IA non risponde, l'utente vede qualcosa di sensato, non una pagina rotta.
