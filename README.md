# CAP - Oral de français

Application mobile-first pour apprendre les 16 textes du bac à partir des fiches CAP finales.

## Fonctionnalités

- 16 fiches CAP complètes et transcriptions des textes
- 1 371 cartes générées uniquement depuis les fiches finales
- cartes dédiées aux résumés « Ce qui se passe »
- mode apprendre avec retournement, swipe droite/gauche et tours de révision
- reprise automatique des sessions et progression locale
- planification de 4 textes par jour
- photos des textes consultables
- dark mode responsive

## Lancer le projet

```bash
pnpm install
pnpm dev
```

## Générer de nouveau les données

Depuis le dossier parent contenant `Fiches_apprentissage` :

```bash
python generate_app_data.py
```

Le script lit uniquement les fiches CAP finales et les transcriptions des textes.

## Supabase

L'application fonctionne sans configuration grâce à `localStorage`.

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql`.
3. Copier `.env.example` vers `.env.local`.
4. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Le client Supabase optionnel est disponible dans `src/lib/supabase.ts`.

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit et publie automatiquement l'application. Dans GitHub, activer **Settings > Pages > Source: GitHub Actions**.

## Structure

- `src/data/texts.json` : textes, fiches CAP et cartes générées
- `public/assets/photos` : photos originales
- `src/App.tsx` : interface et logique d'apprentissage
- `supabase/schema.sql` : table de synchronisation
