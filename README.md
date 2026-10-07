# Habit tracker

Web app mobile-first (PWA) per spuntare le abitudini ogni giorno e vedere le percentuali giornaliere, settimanali e mensili, con streak per singola abitudine. Sostituisce il foglio Excel stampato.

- **Home**: abitudini del giorno, spunta con tap o swipe (destra/sinistra), completate in fondo, fino a 7 giorni indietro.
- **Statistiche**: giorno / settimana / mese, barre, griglia del mese, streak attuale e migliore.
- **Profilo**: inserimento rapido, modifica (nome, descrizione, icona, giorni), riordino, archivio e riattivazione, export della giornata in Markdown o CSV.

Specifica: [`docs/superpowers/specs/2026-10-07-habit-tracker-design.md`](docs/superpowers/specs/2026-10-07-habit-tracker-design.md) · Piani: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## Avvio rapido (modalità demo)

```bash
npm install
npm run dev
```

Senza configurazione l'app usa il **backend in memoria**: i dati restano solo nel browser (la pagina di accesso lo segnala con "Modalità demo"). Utile per provare l'app e per i test.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo su http://localhost:5173 |
| `npm run check` | Lint + typecheck + test unitari con coverage + test SQL (PGlite) |
| `npm run e2e` | Test end-to-end Playwright (iPhone 13 e Pixel 7, accessibilità inclusa) |
| `npm run test:db` | Suite di contratto contro il progetto Supabase di test (richiede `.env.test.local`) |
| `npm run db:migrate` | Applica le migrazioni al progetto Supabase di produzione (`.env.local`) |
| `npm run db:migrate:test` | Applica le migrazioni al progetto di test (`.env.test.local`) |
| `npm run build` | Build di produzione in `dist/` |

**Regola:** prima di ogni commit `npm run check` e `npm run e2e` devono essere verdi.

## Configurare Supabase (una volta sola)

1. Su [supabase.com](https://supabase.com) crea due progetti: `habit-tracker` e `habit-tracker-test`.
2. In **entrambi**: *Authentication → Sign In / Providers → Email* → disattiva **Confirm email**.
3. Copia `.env.example` in `.env.local` (progetto principale) e in `.env.test.local` (progetto di test) e compila:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: *Project Settings → API*.
   - `SUPABASE_DB_URL`: pulsante *Connect* → *Session pooler* → URI, con la password del database.
   - Solo in `.env.test.local`: due email e una password di test (gli utenti vengono creati dai test).
4. Crea le tabelle:
   ```bash
   npm run db:migrate
   npm run db:migrate:test
   ```
   In alternativa incolla, in ordine, i file di `supabase/migrations/` nel *SQL Editor* di Supabase.
5. Verifica che Supabase si comporti come il backend in memoria:
   ```bash
   npm run test:db
   ```
6. Riavvia `npm run dev`: la pagina di accesso non mostra più "Modalità demo".

I file `.env*.local` sono ignorati da git: non committarli e non condividerli.

## Pubblicare su Vercel

1. Crea un repository su GitHub e carica il progetto (`git remote add origin …` e `git push -u origin main`).
2. Su [vercel.com](https://vercel.com) → *Add New → Project* → importa il repository (il framework Vite viene riconosciuto da solo).
3. In *Environment Variables* aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` del progetto principale, poi *Deploy*.
4. In Supabase → *Authentication → URL Configuration*:
   - **Site URL**: l'indirizzo Vercel (es. `https://habit-tracker-tuonome.vercel.app`);
   - **Redirect URLs**: aggiungi `https://…vercel.app/reset-password` e `http://localhost:5173/reset-password`.
5. **Email (prima di invitare gli amici):** il servizio email predefinito di Supabase invia solo agli indirizzi del tuo team ed è molto limitato, quindi le email di "Password dimenticata?" non arriverebbero agli amici. In *Authentication → Emails → SMTP Settings* collega un provider SMTP (ad esempio [Resend](https://resend.com), gratuito per pochi invii). Se manca, l'app mostra "Invio email non disponibile al momento".
6. Senza `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` la versione pubblicata mostra "App non configurata" invece di partire in modalità demo. Per pubblicare di proposito la demo, imposta `VITE_BACKEND=memory`.
7. Facoltativo, per la CI su GitHub: aggiungi i secrets `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_EMAIL_A`, `TEST_EMAIL_B`, `TEST_PASSWORD`.

## Installare l'app sul telefono

- **iPhone (Safari)**: apri il sito → *Condividi* → *Aggiungi alla schermata Home*.
- **Android (Chrome)**: apri il sito → menu ⋮ → *Installa app*.

L'app si apre a schermo intero con la sua icona. In V1 serve la connessione per salvare le spunte: senza rete compare un avviso e la spunta torna indietro.

## Architettura in breve

- `src/domain/` — logica pura (date, programmazione, statistiche, streak, export), coperta al 99%.
- `src/data/` — interfaccia `Backend` con due implementazioni dalle stesse regole: memoria (`memoryBackend`) e Supabase (`supabaseBackend`), verificate dalla stessa suite di contratto.
- `supabase/migrations/` — schema, Row Level Security e funzioni; testati in locale con PGlite (`tests/sql/`).
- `src/features/` — pagine Home, Statistiche, Profilo, Accesso.

## Prossimi passi (V2)

- Offline completo: spunte salvate in IndexedDB e sincronizzate al ritorno della rete.
