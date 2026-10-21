import React, { useState } from 'react'
import { GPU_COMPONENTS } from '../data/gpuComponents.js'

const TERMS = [
  ['Activation (fonction)', 'Activation function', "Fonction non linéaire appliquée après une couche (ReLU, GELU, SiLU).", 8],
  ['Activations (valeurs)', 'Activations', "Valeurs intermédiaires calculées par le réseau pour une entrée donnée.", 8],
  ['All-reduce', 'All-reduce', "Opération de communication où plusieurs GPU additionnent leurs résultats partiels et obtiennent tous la somme.", 12],
  ['Attention', 'Attention', "Mécanisme par lequel chaque token combine l'information des autres tokens, pondérée par softmax(Q·Kᵀ/√d).", 10],
  ['Bande passante', 'Bandwidth', "Quantité de données transférées par seconde (Go/s, To/s).", 5],
  ['Batch / lot', 'Batch', "Ensemble d'entrées traitées ensemble pour réutiliser les poids chargés.", 8],
  ['BF16', 'bfloat16', "Format flottant 16 bits avec la plage de FP32 (8 bits d'exposant, 7 de mantisse).", 7],
  ['Bloc de threads', 'Thread block / CTA', "Groupe de threads (≤ 1 024) exécuté sur un seul SM, partageant sa mémoire partagée.", 4],
  ['Cache KV', 'KV cache', "Stockage en HBM des clés et valeurs des tokens déjà traités, pour chaque couche.", 11],
  ['Coalescence', 'Memory coalescing', "Regroupement des accès mémoire consécutifs d'un warp en une seule transaction.", 4],
  ['CPU', 'Central Processing Unit', "Processeur central, peu de cœurs puissants, optimisé pour la latence.", 1],
  ['CUDA', 'Compute Unified Device Architecture', "Plateforme et langage de NVIDIA pour programmer les GPU.", 4],
  ['CUDA Graph', 'CUDA Graphs', "Séquence de kernels enregistrée puis rejouée en une seule commande.", 4],
  ['Décodage', 'Decode', "Phase de génération token par token, limitée par la bande passante mémoire.", 11],
  ['Décodage spéculatif', 'Speculative decoding', "Un petit modèle propose des tokens que le grand vérifie en un seul passage.", 12],
  ['Divergence', 'Warp divergence', "Quand les threads d'un warp prennent des branches différentes, exécutées l'une après l'autre.", 4],
  ['Embedding', 'Embedding', "Vecteur appris associé à chaque token du vocabulaire.", 10],
  ['Épilogue', 'Epilogue', "Fin d'un kernel GEMM où l'on applique biais, activation, conversion avant l'écriture.", 6],
  ['FLOP / FLOPS', 'Floating-point operations (per second)', "Opération sur flottants / nombre de ces opérations par seconde.", 2],
  ['FlashAttention', 'FlashAttention', "Kernel d'attention par tuiles qui n'écrit jamais la matrice des scores en HBM.", 12],
  ['FMA', 'Fused Multiply-Add', "Opération a × b + c en une instruction (2 FLOP).", 2],
  ['FP8, FP16, FP32', 'Floating point 8/16/32 bits', "Formats de nombres flottants sur 1, 2 ou 4 octets.", 7],
  ['Fusion de kernels', 'Kernel fusion', "Regrouper plusieurs opérations dans un kernel pour éviter des allers-retours en HBM.", 5],
  ['GEMM', 'General Matrix Multiply', "Produit matrice × matrice, opération dominante de l'inférence.", 6],
  ['GEMV', 'General Matrix-Vector multiply', "Produit matrice × vecteur, typique du décodage avec un lot de 1.", 11],
  ['GPU', 'Graphics Processing Unit', "Processeur massivement parallèle, optimisé pour le débit.", 1],
  ['GQA', 'Grouped-Query Attention', "Plusieurs têtes de requêtes partagent les mêmes têtes K/V, pour réduire le cache KV.", 10],
  ['Grille', 'Grid', "Ensemble des blocs de threads lancés pour un kernel.", 4],
  ['Inférence', 'Inference', "Utilisation d'un modèle entraîné, avec des poids fixes, pour produire une sortie.", 1],
  ['Intensité arithmétique', 'Arithmetic intensity', "Nombre d'opérations par octet lu ou écrit en mémoire.", 5],
  ['Kernel', 'Kernel', "Programme exécuté sur le GPU par de nombreux threads en parallèle.", 4],
  ['Latence', 'Latency', "Temps pour obtenir un résultat ou une donnée.", 1],
  ['LLM', 'Large Language Model', "Grand modèle de langage, transformer entraîné à prédire le token suivant.", 10],
  ['Logits', 'Logits', "Scores bruts avant softmax, un par classe ou par token du vocabulaire.", 8],
  ['MLP', 'Multi-Layer Perceptron', "Réseau de couches denses ; aussi le sous-bloc feed-forward d'un transformer.", 8],
  ['Occupation', 'Occupancy', "Proportion de warps actifs sur un SM par rapport au maximum.", 4],
  ['PagedAttention', 'PagedAttention', "Gestion du cache KV par pages allouées à la demande (vLLM).", 12],
  ['Parallélisme de tenseurs', 'Tensor parallelism', "Découpage de chaque matrice de poids entre plusieurs GPU.", 12],
  ['Poids / paramètres', 'Weights / parameters', "Nombres appris pendant l'entraînement, fixes pendant l'inférence.", 8],
  ['Prefill', 'Prefill', "Traitement parallèle de tout le prompt, limité par le calcul.", 11],
  ['Produit scalaire', 'Dot product', "Somme des produits élément par élément de deux vecteurs.", 2],
  ['Quantification', 'Quantization', "Stockage des poids ou activations dans un format plus compact (INT8, INT4, FP8).", 7],
  ['ReLU', 'Rectified Linear Unit', "max(0, x).", 8],
  ['RMSNorm / LayerNorm', 'Normalization', "Remise à l'échelle de chaque vecteur de token.", 10],
  ['RoPE', 'Rotary Position Embedding', "Encodage de la position par rotation des vecteurs Q et K.", 10],
  ['Roofline', 'Roofline model', "Graphique de la performance atteignable en fonction de l'intensité arithmétique.", 5],
  ['SIMT', 'Single Instruction, Multiple Threads', "Modèle d'exécution où les 32 threads d'un warp exécutent la même instruction.", 4],
  ['Softmax', 'Softmax', "Transforme des scores en probabilités : exp(xᵢ) / Σ exp(xⱼ).", 8],
  ['Stream', 'CUDA stream', "File de commandes GPU exécutées dans l'ordre.", 4],
  ['Température', 'Temperature', "Paramètre d'échantillonnage : divise les logits pour rendre la distribution plus ou moins « pointue ».", 10],
  ['Tenseur', 'Tensor', "Tableau de nombres à n dimensions.", 2],
  ['Thread', 'Thread', "Plus petite unité d'exécution d'un kernel.", 4],
  ['Token', 'Token', "Morceau de texte associé à un numéro dans le vocabulaire.", 10],
  ['Transformer', 'Transformer', "Architecture fondée sur l'attention, base des LLM.", 10],
  ['TTFT', 'Time To First Token', "Temps avant l'affichage du premier token de la réponse.", 11],
  ['Tuilage', 'Tiling', "Découpage des matrices en tuiles chargées en mémoire partagée pour être réutilisées.", 6],
  ['Warp', 'Warp', "Groupe de 32 threads exécutés ensemble.", 4],
]

export default function Glossary({ go }) {
  const [q, setQ] = useState('')
  const all = [
    ...TERMS.map(([term, en, def, ch]) => ({ term, en, def, ch })),
    ...GPU_COMPONENTS.map((c) => ({ term: c.name, en: c.en, def: `${c.short} ${c.role ? 'Rôle : ' + c.role : ''}`, ch: 3, comp: true })),
  ].sort((a, b) => a.term.localeCompare(b.term, 'fr'))
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const f = all.filter((t) => !q || norm(t.term + ' ' + t.en + ' ' + t.def).includes(norm(q)))
  return (
    <>
      <p>Tous les termes du cours, avec leur nom anglais et le chapitre où ils sont expliqués en détail. Les composants du GPU sont marqués 🟩.</p>
      <input className="glossary-search" placeholder="Rechercher un terme (ex. : warp, HBM, cache KV…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{f.length} terme(s)</p>
      {f.map((t) => (
        <div key={t.term + t.en} className="def">
          <div className="def-term">
            {t.comp ? '🟩 ' : ''}{t.term}
            <span className="def-en">({t.en})</span>
          </div>
          <div className="def-body">{t.def}</div>
          <button className="btn small" style={{ marginTop: 6 }} onClick={() => go(`ch${String(t.ch).padStart(2, '0')}`)}>→ Chapitre {t.ch}</button>
        </div>
      ))}
    </>
  )
}
