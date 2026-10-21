import Ch01, { quiz as q01 } from './Ch01.jsx'
import Ch02, { quiz as q02 } from './Ch02.jsx'
import Ch03, { quiz as q03 } from './Ch03.jsx'
import Ch04, { quiz as q04 } from './Ch04.jsx'
import Ch05, { quiz as q05 } from './Ch05.jsx'
import Ch06, { quiz as q06 } from './Ch06.jsx'
import Ch07, { quiz as q07 } from './Ch07.jsx'
import Ch08, { quiz as q08 } from './Ch08.jsx'
import Ch09, { quiz as q09 } from './Ch09.jsx'
import Ch10, { quiz as q10 } from './Ch10.jsx'
import Ch11, { quiz as q11 } from './Ch11.jsx'
import Ch12, { quiz as q12 } from './Ch12.jsx'
import Glossary from './Glossary.jsx'

export const PARTS = [
  { title: 'Partie 1 — Les fondations', chapters: ['ch01', 'ch02'] },
  { title: 'Partie 2 — Le GPU', chapters: ['ch03', 'ch04', 'ch05', 'ch06', 'ch07'] },
  { title: 'Partie 3 — Réseaux denses', chapters: ['ch08', 'ch09'] },
  { title: 'Partie 4 — Transformers', chapters: ['ch10', 'ch11', 'ch12'] },
  { title: 'Annexe', chapters: ['glossaire'] },
]

export const CHAPTERS = [
  { id: 'ch01', num: 1, title: 'CPU et GPU : deux philosophies', lead: 'Pourquoi un processeur graphique est-il devenu le moteur de l\'intelligence artificielle ?', Component: Ch01, quiz: q01 },
  { id: 'ch02', num: 2, title: 'Les maths minimales : vecteurs et matrices', lead: 'Multiplier et additionner : tout ce dont vous aurez besoin.', Component: Ch02, quiz: q02 },
  { id: 'ch03', num: 3, title: 'Anatomie d\'un GPU', lead: 'Chaque composant d\'un GPU moderne, défini et replacé dans l\'inférence.', Component: Ch03, quiz: q03 },
  { id: 'ch04', num: 4, title: 'Comment un GPU exécute un programme', lead: 'Kernels, threads, warps, blocs : le modèle d\'exécution.', Component: Ch04, quiz: q04 },
  { id: 'ch05', num: 5, title: 'La mémoire, nerf de la guerre', lead: 'Hiérarchie mémoire, bande passante et modèle roofline.', Component: Ch05, quiz: q05 },
  { id: 'ch06', num: 6, title: 'Le produit matriciel sur GPU', lead: 'Tuilage, mémoire partagée et Tensor Cores : l\'opération reine de l\'inférence.', Component: Ch06, quiz: q06 },
  { id: 'ch07', num: 7, title: 'Nombres et précision', lead: 'FP32, BF16, FP8, INT4 : moins de bits, plus de vitesse.', Component: Ch07, quiz: q07 },
  { id: 'ch08', num: 8, title: 'Les réseaux de neurones denses', lead: 'Neurones, couches, activations : le réseau le plus simple.', Component: Ch08, quiz: q08 },
  { id: 'ch09', num: 9, title: 'Inférence d\'un réseau dense, pas à pas', lead: 'Du CPU aux Tensor Cores et retour : chaque étape, chaque composant.', Component: Ch09, quiz: q09 },
  { id: 'ch10', num: 10, title: 'Les transformers', lead: 'Tokens, embeddings, attention et blocs : l\'architecture des LLM.', Component: Ch10, quiz: q10 },
  { id: 'ch11', num: 11, title: 'Inférence d\'un transformer, pas à pas', lead: 'Prefill, décodage et cache KV : la génération de texte sur GPU.', Component: Ch11, quiz: q11 },
  { id: 'ch12', num: 12, title: 'Optimiser et passer à l\'échelle', lead: 'Batching, quantification, FlashAttention, multi-GPU… et un calculateur.', Component: Ch12, quiz: q12 },
  { id: 'glossaire', num: null, title: 'Glossaire', lead: 'Tous les termes du cours, en un seul endroit.', Component: Glossary, quiz: null },
]

export const byChapterId = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]))
