# Come incastrare i file pre-costruiti

File pronti, da mettere ai loro posti nel repo:

```
worker/index.ts            ← il proxy (genera/lezione, rate limit, cache, errori)
wrangler.toml              ← config Workers + Static Assets + KV
.dev.vars.example          ← modello per la chiave in sviluppo (copia in .dev.vars)
src/types/scene.ts         ← schema scene spec + Zod
src/types/peste.ts         ← tipi del modulo Peste
src/data/peste.ts          ← dataset PESTE + TOUR + QUIZ (letterale dal v12)
src/data/fallback.ts       ← esempi offline Roma/Colombo/Peste + pickFallback
RICOGNIZIONE-v12.md         ← mappa v12 → moduli (per Claude Code)
```

## Backend pronto in 4 comandi (dopo `npm create vite` e la migrazione)

```
npx wrangler kv namespace create CACHE     # incolla l'id in wrangler.toml
npx wrangler kv namespace create RATE      # incolla l'id in wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY  # la chiave, solo lato server
npm run build && npx wrangler deploy        # build Vite + deploy
```

## Dev loop (IA testabile in locale)

- Frontend: `vite` (porta 5173) con un proxy in `vite.config.ts`:
  `/api` → `http://localhost:8787`.
- Worker: `npx wrangler dev` (porta 8787) che legge la chiave da `.dev.vars`.

Così, in sviluppo, le chiamate del browser a `/api/genera` e `/api/lezione`
arrivano al Worker con la chiave, esattamente come in produzione.

## Regola che resta vera ovunque
La chiave vive solo nel Worker (secret / `.dev.vars`). Mai nel client, mai nel repo.
