# Shared Sync Setup

This app can run from GitHub Pages and share one board between devices by saving to Supabase.

## 1. Create the Supabase table

In your Supabase project, open the SQL editor and run:

```sql
create table if not exists public.board_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.board_state enable row level security;

drop policy if exists "public can read board_state" on public.board_state;
drop policy if exists "public can insert board_state" on public.board_state;
drop policy if exists "public can update board_state" on public.board_state;

create policy "public can read board_state"
on public.board_state
for select
to anon
using (true);

create policy "public can insert board_state"
on public.board_state
for insert
to anon
with check (true);

create policy "public can update board_state"
on public.board_state
for update
to anon
using (true)
with check (true);
```

## 2. Add your project keys

Open `config.js` and paste in your Supabase project URL and anon public key:

```js
window.YTSPICKEM_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY",
};
```

## 3. Upload these files to GitHub

Upload these files:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `SETUP_SHARED_SYNC.md` is optional, but useful to keep in the repo.

The app will still work locally if `config.js` is blank, but shared sync only works after those values are filled in.

## 4. How sharing works

Use the buttons in the Sharing panel:

- `Save Board` pushes the current board to Supabase so the other person can see it.
- `Load Latest` pulls the newest saved board from Supabase into the browser.

The app also tries to save automatically after edits and checks for updates every few seconds, but the buttons are there so Russ and Kenny can use a simple browser-only workflow without passing JSON files back and forth.
