# Cours GPU & Inférence

Cours interactif, en français, pour débutants : comprendre ce qu'il y a dans un GPU, le rôle de chaque composant, et comment un GPU exécute l'inférence d'un réseau de neurones, du réseau dense simple jusqu'aux transformers (LLM).

## Lancer le cours

Prérequis : Node.js 18 ou plus récent.

```bash
npm install      # une seule fois
npm run dev      # ouvre http://localhost:5173
```

Pour une version optimisée : `npm run build`, puis `npm run preview` (http://localhost:4173/cours-gpu/).

## Déploiement

Le cours est publié sur GitHub Pages : https://g-dolle.github.io/cours-gpu/

Chaque push sur `main` relance le build et la mise en ligne (`.github/workflows/deploy.yml`). Le chemin `/cours-gpu/` est défini par `base` dans `vite.config.js`.

## Contenu

| Partie | Chapitres | Simulateurs |
|---|---|---|
| 1. Fondations | 1. CPU et GPU · 2. Vecteurs et matrices | Course CPU/GPU, produit scalaire, matrice × vecteur |
| 2. Le GPU | 3. Anatomie · 4. Exécution · 5. Mémoire · 6. Produit matriciel · 7. Précision | Schéma GPU cliquable (puce + SM), indices de threads, ordonnancement des blocs, divergence de warp, roofline, tuilage, formats numériques |
| 3. Réseaux denses | 8. Concepts · 9. Inférence pas à pas | Neurone, inférence d'un MLP étape par étape avec les composants GPU actifs |
| 4. Transformers | 10. Architecture · 11. Inférence pas à pas · 12. Optimisations | Attention, prefill/décodage avec cache KV, calculateur mémoire/débit de LLM |
| Annexe | Glossaire | Recherche |

Chaque chapitre se termine par un quiz. La progression est enregistrée dans le `localStorage` du navigateur.

## Structure

- `src/data/gpuComponents.js` : définition de chaque composant du GPU et de son rôle dans l'inférence (utilisé par le schéma, le chapitre 3 et le glossaire).
- `src/chapters/` : un fichier par chapitre (contenu et quiz), plus `index.js` pour l'ordre et les parties.
- `src/sims/` : les simulateurs interactifs.
- `src/components/` : composants d'interface réutilisables (définitions, encadrés, quiz, lecteur d'étapes).

Les chiffres d'exemple se réfèrent à une NVIDIA H100 SXM et à Llama 3 8B. Ce sont des ordres de grandeur pédagogiques.
