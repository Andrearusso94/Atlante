# [B1] QID diretto dall'IA per gli eventi `pulse`

**Blocco:** B — Backlog funzionalità
**Etichette:** valore: alto · costo: basso · area: prompt+resolver
**Già predisposto:** il tipo `qid` opzionale è già in `src/types/scene.ts` (PulseItem)

## Cosa fare
Oggi l'IA dà un nome cercabile su Wikidata e si fa una ricerca per stringa.
Più robusto: farle dare direttamente il **QID**. Il tipo è già pronto; resta
il comportamento.

## Passi
1. Nel prompt del Worker (`SYS_GENERA`), aggiorna lo schema `pulse` per accettare
   `qid` opzionale accanto a `query`.
2. Nel resolver Wikidata (`engine/wikidata.ts`): se c'è `qid`, salta la ricerca per
   nome e va dritto a recuperare l'entità.
3. Tieni `query` come ripiego.

## Regola da rispettare
Il QID non aggira il principio d'oro: coordinate e data restano prese **da Wikidata**.

## Fatto quando
Gli eventi puntuali si agganciano all'entità giusta senza ambiguità di nome.
