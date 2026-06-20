# [B3] Traduzione in italiano delle etichette degli stati

**Blocco:** B — Backlog funzionalità
**Etichette:** valore: medio · costo: medio · rischio: accuratezza · area: dati

## Cosa fare
Le etichette dei territori arrivano in inglese dalla fonte. Tradurle migliora
l'esperienza in aula.

## Passi
1. Crea un dizionario `NAME → etichetta IT` come modulo dati tipizzato (`src/data/`),
   **non** una traduzione al volo dell'IA.
2. Copri prima l'Europa (la zona a copertura ricca).
3. Per i nomi non mappati, mostra l'originale.

## Regola da rispettare
Se manca la mappatura, mostra il nome originale — mai inventare un nome italiano.
Così non introduci errori storici.

## Fatto quando
Gli stati europei principali appaiono in italiano; gli altri restano nel nome originale.
