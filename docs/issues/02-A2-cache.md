# [A2] Cache — configurare e tarare il Worker

**Blocco:** A — Indurimento pre-pubblico (non rinviabile)
**Etichette:** valore: alto · costo: basso (ora) · area: worker
**Codice già pronto:** `worker/index.ts` (cache su KV già implementata)

## Cosa resta da fare
La cache è già scritta: `/api/genera` con TTL normale, `/api/lezione` con TTL più
lungo (la `web_search` è fatturata a parte, quindi ogni hit risparmiato vale doppio).

## Passi
1. Crea il KV namespace `CACHE` e aggiungi il binding in `wrangler.toml`.
2. Verifica HIT/MISS leggendo l'header di risposta `x-cache`.
3. Tara i TTL se serve: `CACHE_TTL_GENERA_S` (default 86400), `CACHE_TTL_LEZIONE_S` (default 604800).
4. Se cambi i prompt di sistema, ricordati di invalidare la cache.

## Fatto quando
Chiedere due volte la stessa cosa non genera due chiamate a pagamento (x-cache: HIT).
