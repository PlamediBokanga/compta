# Compta

Compta est une application de gestion, facturation, comptabilite et obligations declaratives pensee pour la Republique Democratique du Congo.

L'objectif du produit est de devenir un "Indy congolais" :
- simple a utiliser au quotidien
- conforme a la fiscalite RDC
- compatible avec la logique SYSCOHADA / CPCC
- capable de gerer la facture standard puis la normalisation fiscale

## Vision produit

L'application est construite pour aider une entreprise, un entrepreneur ou une PME a suivre un parcours simple :

1. creer des factures et suivre les encaissements
2. importer et classer les transactions
3. preparer la comptabilite SYSCOHADA / CPCC
4. suivre les obligations DGI et sociales RDC

## Fonctionnalites principales

- tableau de bord simplifie avec parcours principal
- facturation en franc congolais avec apercu et impression A4
- gestion des devis, factures, relances, paiements et avoirs
- logique facture standard puis normalisation DGI
- suivi des clients et articles / services
- import et categorisation des transactions
- calculs de TVA et preparation des donnees declaratives
- obligations RDC :
  - TVA DGI
  - IPR / IERE
  - CNSS
  - INPP
  - ONEM
- rapports comptables :
  - journal
  - grand livre
  - balance
  - lettrage
  - vues SYSCOHADA / CPCC
- gestion du profil entreprise :
  - NIF
  - RCCM
  - ID fiscal / DEF
  - regime TVA
  - coordonnees facture

## Stack technique

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase

## Lancer le projet en local

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Creer un fichier `.env` a la racine du projet avec :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sans ces variables, l'authentification et les donnees Supabase ne fonctionneront pas.

### 3. Demarrer l'application

```bash
npm run dev
```

Puis ouvrir l'adresse affichee par Vite dans le navigateur.

## Scripts utiles

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
```

## Deploiement test

Le projet est prepare pour un deploiement frontend sur Vercel avec Supabase.

Fichiers ajoutes pour cette preparation :

- `.env.example`
- `vercel.json`
- `DEPLOYMENT.md`

Pour une premiere mise en ligne de test avec l'equipe :

1. importer le depot GitHub dans Vercel
2. renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. configurer les URLs de redirection dans Supabase Auth
4. verifier les secrets de la fonction `send-email`

Guide detaille :

`DEPLOYMENT.md`
## Base de donnees et Supabase

Le dossier `supabase/` contient :
- les migrations SQL
- les fonctions utiles au projet

Avant une mise en production, il faut s'assurer que :
- les migrations sont appliquees dans le bon projet Supabase
- les variables d'environnement sont configurees
- les politiques de securite et l'authentification sont valides

## Etat actuel

Au 19 aout 2026, le projet contient deja :
- une base fonctionnelle solide
- une navigation simplifiee
- un debut de logique "Indy congolais"
- une orientation claire vers la conformite RDC

## GitHub

Depot GitHub :

`https://github.com/PlamediBokanga/compta.git`

## Suite prevue

- continuer la simplification UX
- renforcer la coherence des ecrans metier
- finaliser la logique declarative RDC
- poursuivre la conformite comptable SYSCOHADA / CPCC
- preparer ensuite le deploiement en ligne

