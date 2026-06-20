# Atlante Sincronico — Roadmap post-migrazione

> Da fare **dopo** la Fase 1 (migrazione a Vite + React + TS + Redux Toolkit a parità di funzioni).
> Ogni voce indica **valore**, **costo** e i passi concreti. L'ordine è la sequenza consigliata.
>
> **Principio d'oro (vale per tutto):** l'IA traduce e spiega; coordinate, confini e date vengono solo da `historical-basemaps` e Wikidata, mai inventati. Ogni nuova feature deve mantenere visibile l'avviso `lastDataNote` ("verifica prima dell'uso in classe") e l'onestà sui limiti.

---

## Blocco A — Indurimento prima di qualsiasi link pubblico (non rinviabile)

Questi non sono "feature": sono il confine tra *demo privato* e *link aperto a chiunque*. Vanno fatti nel Worker, prima di condividere un URL.

### A1. Rate limiting nel Worker · valore alto · costo medio
Senza questo, un giro di traffico ti svuota il credito API.
1. Scegli la chiave di limite (IP, o token di sessione semplice).
2. Implementa il conteggio con Cloudflare (KV o Durable Object, oppure il binding `RateLimit` nativo).
3. Applica il limite **prima** di inoltrare ad Anthropic, su entrambi gli endpoint.
4. Risposta `429` pulita gestita dal client con messaggio leggibile.

### A2. Cache delle risposte · valore alto · costo medio
1. `/api/genera`: cache per richiesta normalizzata (stessa query → stessa scene spec) con TTL.
2. `/api/lezione`: cache **più aggressiva** — qui c'è `web_search`, **fatturato a parte**, quindi ogni hit risparmiato conta doppio. Chiave = titolo + evento + anno.
3. Usa Cloudflare KV o Cache API; invalidazione manuale se cambi i prompt di sistema.

### A3. Gestione errori, limiti e logging minimo · valore medio · costo basso
1. Messaggi d'errore distinti per: API giù, rate limit, JSON non valido, timeout.
2. Il client deve degradare con grazia ai fallback offline (Roma/Colombo/Peste) quando l'IA non risponde.
3. Logging essenziale lato Worker (conteggio chiamate, errori) — **senza** loggare contenuti sensibili o la chiave.

---

## Blocco B — Backlog funzionalità (dal brief, aggiornato allo stato v12)

Ordinato per rapporto valore/costo: prima le vinte facili, in fondo il pezzo pesante.

### B1. QID diretto dall'IA per gli eventi `pulse` · valore alto · costo basso
Oggi l'IA dà un nome cercabile su Wikidata (`query`) e si fa `wbsearchentities` → entità. Più robusto: farle restituire direttamente il **QID**, eliminando l'ambiguità del match per stringa.
1. Aggiorna lo schema `pulse` nel prompt server-side: accetta `qid` opzionale accanto a `query`.
2. Nel resolver, se c'è `qid` salta `wdSearch` e va dritto a `wdEntity`.
3. Tieni `query` come ripiego.
4. **Guardrail:** il QID non aggira il principio d'oro — coordinate e data restano prese da Wikidata, non dall'IA.

### B2. ~~Lezioni offline complete~~ — già chiuso nel v12 · solo verifica
I tre fallback (Roma, Colombo, Peste) hanno ora timeline con campi `detail` pieni. **Azione:** verifica in fase di migrazione che i `detail` siano portati nei tipi `LessonCard`/`FALLBACK` e renderizzati nella modale anche senza rete. Se confermato, depenna la voce.

### B3. Traduzione in italiano delle etichette degli stati · valore medio · costo medio (con rischio accuratezza)
Le etichette dei territori arrivano in inglese dalla fonte. Tradurle migliora la UX in aula.
1. Crea un dizionario di mappatura `NAME → etichetta IT` come modulo dati tipizzato (`src/data/`), **non** una traduzione al volo dell'IA.
2. Copri prima l'Europa (la zona a copertura ricca), con fallback all'originale per i nomi non mappati.
3. **Guardrail:** se manca la mappatura, mostra il nome originale — mai inventare un nome italiano. Questo evita di introdurre errori storici.

### B4. Modelli 3D veri per le navi (GLTFLoader) · valore basso (cosmetico) · costo medio
Oggi `makeShip()` usa geometrie semplici. Con il motore estratto in `GlobeEngine`, l'aggancio è isolato.
1. Carica un GLTF leggero (caravella) con `GLTFLoader`, da CDN versionato o asset locale.
2. Sostituisci il `Group` di box nelle scene `journey`.
3. Fallback alla geometria semplice se il caricamento fallisce (niente scena vuota).

### B5. Morphing vero dei confini · valore medio · costo alto
Il pezzo di ingegneria più pesante: oggi è solo cross-fade tra snapshot. Obiettivo: interpolazione vertice-per-vertice tra poligoni di forma diversa.
1. Ricognizione: studia come allineare ring con conteggio vertici differente (resampling).
2. Prototipa su **due** snapshot vicini (es. 1300→1400) prima di generalizzare.
3. Valuta il costo runtime sul globo three.js; tienilo opzionale dietro uno switch.
4. **Da fare per ultimo** — alto rischio, e non blocca nulla a valle.

---

## Blocco C — Migliorie abilitate dalla nuova architettura (opzionali)

Cose che la migrazione a TS/moduli rende sensate e che prima costavano troppo.

### C1. Test sulle funzioni pure del motore · valore alto · costo basso
Estraendo il motore in TS, le funzioni geometriche (`pointInPolygon`, `slerp`, `parseISO`, conversioni lat/lon) diventano testabili in isolamento.
1. Aggiungi Vitest.
2. Copri prima il point-in-polygon e il parsing date: sono il cuore del picking e dello scrubber.

### C2. Validazione tipizzata della scene spec · valore alto · costo basso
1. Definisci uno schema runtime (es. Zod) che rispecchia i 5 archetipi.
2. Valida la risposta del Worker **prima** di passarla al motore: una spec malformata dà un errore chiaro invece di una scena rotta.
3. Sinergia con A3 (gestione errori).

### C3. Onestà sui limiti più visibile · valore medio · costo basso
Allineato al principio d'oro e alla sezione "limiti strutturali" del brief.
1. Esponi `BORDERPRECISION` dei confini quando disponibile (la fonte è approssimata e a scala continentale).
2. Segnala in UI dove la storia è contesa (date/confini con versioni in conflitto).
3. Mantieni e rafforza il conteggio "quanti eventi risolti" del pannello.

---

## Sequenza consigliata in una riga

Migrazione (Fase 1) → **A1–A3** (apri il privato senza rischi) → **B1, B2-verifica, C1, C2** (vinte rapide ad alto valore) → **B3, C3** → **B4** → **B5** → link pubblico.
