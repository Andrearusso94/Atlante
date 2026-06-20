# [A1] Rate limiting — integrare e configurare il Worker

**Blocco:** A — Indurimento pre-pubblico (non rinviabile)
**Etichette:** valore: alto · costo: basso (ora) · area: worker
**Codice già pronto:** `worker/index.ts` (rate limit per IP già implementato)

## Cosa resta da fare
Il rate limiting è già scritto nel Worker. Mancano solo configurazione e test.

## Passi
1. Crea il KV namespace `RATE` e aggiungi il binding in `wrangler.toml`.
2. Imposta i `vars` opzionali se vuoi cambiare i default: `RATE_LIMIT` (default 30),
   `RATE_WINDOW_S` (default 3600).
3. Testa: oltre il limite il Worker deve rispondere `429`.
4. Nel client, gestisci il `429` con un messaggio leggibile.

## Nota
KV è eventualmente consistente: ottimo per un demo privato. Per un limite "duro"
in futuro valuta Durable Objects o il binding nativo Rate Limiting.

## Fatto quando
Superato il limite, l'app mostra un messaggio gentile invece di chiamare l'IA.
