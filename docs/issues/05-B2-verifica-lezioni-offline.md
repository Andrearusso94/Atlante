# [B2] Verifica lezioni offline (probabilmente già fatto nel v12)

**Blocco:** B — Backlog funzionalità
**Etichette:** valore: medio · costo: minimo · tipo: verifica

## Cosa fare
Nel v12 i tre esempi fallback (Roma, Colombo, Peste) hanno già le timeline con
i campi `detail` pieni. Questo lavoro è solo **controllare** che la migrazione
non li perda.

## Passi
1. Controlla che i campi `detail` dei `FALLBACK` siano portati nei tipi
   `LessonCard` / `FALLBACK`.
2. Controlla che la modale-lezione li mostri anche **senza rete**.
3. Se tutto ok, chiudi questa issue (è già fatta).

## Fatto quando
Senza internet, i tre esempi mostrano la lezione completa, non solo il "Contesto".
