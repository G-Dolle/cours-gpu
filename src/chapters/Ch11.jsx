import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import TransformerInferenceSim from '../sims/TransformerInferenceSim.jsx'

export const quiz = [
  {
    q: 'Quelle est la différence entre la phase de prefill et la phase de décodage ?',
    options: [
      'Le prefill traite tous les tokens du prompt en parallèle ; le décodage génère un token à la fois',
      'Le prefill charge le modèle ; le décodage le décharge',
      'Le prefill se fait sur le CPU',
      'Il n\'y a pas de différence',
    ],
    answer: 0,
    explain: 'Le prefill fait des produits matrice × matrice (efficaces), le décodage des produits matrice × vecteur (limités par la mémoire).',
  },
  {
    q: 'À quoi sert le cache KV ?',
    options: [
      'À stocker les poids du modèle',
      'À conserver les clés et valeurs des tokens déjà traités pour ne pas les recalculer à chaque nouveau token',
      'À accélérer le PCIe',
      'À stocker le texte généré',
    ],
    answer: 1,
    explain: 'Sans cache, générer le 1000ᵉ token imposerait de refaire le calcul des 999 précédents.',
  },
  {
    q: 'Pourquoi le décodage est-il limité par la bande passante mémoire ?',
    options: [
      'Parce que les Tensor Cores sont lents',
      'Parce que, pour chaque token généré, il faut relire tous les poids du modèle depuis la HBM, alors que chacun ne sert qu\'à 2 opérations',
      'Parce que le PCIe est saturé',
      'Parce que le CPU est trop lent',
    ],
    answer: 1,
    explain: 'Intensité ≈ 1 FLOP/octet, très loin des ~300 nécessaires pour saturer les Tensor Cores d\'une H100.',
  },
  {
    q: 'Un modèle de 16 Go (poids) tourne sur un GPU à 1 To/s. Quelle est la vitesse maximale de génération pour un seul utilisateur ?',
    options: ['≈ 16 tokens/s', '≈ 62 tokens/s', '≈ 1 000 tokens/s', '≈ 16 000 tokens/s'],
    answer: 1,
    explain: '16 Go ÷ 1 000 Go/s = 16 ms par token, soit ≈ 62 tokens/s au maximum.',
  },
  {
    q: 'Que mesure le TTFT ?',
    options: ['Le nombre de tokens par seconde', 'Le temps avant l\'apparition du premier token de la réponse', 'La taille du cache KV', 'La température'],
    answer: 1,
    explain: 'Time To First Token : il est dominé par le prefill (et le temps d\'attente dans la file du serveur).',
  },
  {
    q: 'Quel composant du GPU stocke le cache KV ?',
    options: ['Les registres', 'La mémoire partagée', 'La HBM', 'Le cache d\'instructions'],
    answer: 2,
    explain: 'Le cache KV peut atteindre des dizaines de Go : seule la HBM est assez grande. Il est relu à chaque token généré.',
  },
]

export default function Ch11() {
  return (
    <>
      <Objectives
        items={[
          'Le déroulement complet de la génération d\'un texte par un LLM sur GPU',
          'Les deux phases : prefill (traitement du prompt) et décodage (génération)',
          'Le cache KV : pourquoi il existe et combien il coûte',
          'Pourquoi la génération est limitée par la bande passante mémoire',
        ]}
      />
      <p>
        Nous suivons maintenant <b>Llama 3 8B</b> sur une <b>H100</b> : l'utilisateur tape « Le chat » et le modèle génère « noir », puis « dort ». Chaque étape indique les
        composants du GPU sollicités.
      </p>
      <Card title="Inférence d'un transformer, étape par étape" sub="Suivez le prefill puis le décodage. Observez le cache KV se remplir." sim>
        <TransformerInferenceSim />
      </Card>

      <h2>Les deux phases de l'inférence</h2>
      <Def term="Prefill (pré-remplissage)" en="Prefill / prompt processing">
        Traitement de tout le prompt d'un coup. Tous les tokens passent ensemble dans chaque couche : les couches denses deviennent des <b>produits matrice × matrice</b>, avec
        une forte intensité arithmétique. Cette phase est généralement <b>limitée par le calcul</b> (Tensor Cores). Elle remplit le cache KV et produit le premier token.
      </Def>
      <Def term="Décodage" en="Decode / generation">
        Génération des tokens suivants, <b>un par un</b>. Chaque pas ne traite qu'un seul nouveau token par séquence : des <b>produits matrice × vecteur</b>. Il faut pourtant
        relire tous les poids et tout le cache KV depuis la HBM. Cette phase est <b>limitée par la bande passante mémoire</b>.
      </Def>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th></th><th>Prefill</th><th>Décodage</th></tr></thead>
          <tbody>
            <tr><td>Tokens traités par passage</td><td>Tout le prompt (des centaines à des milliers)</td><td>1 par séquence</td></tr>
            <tr><td>Type d'opération</td><td>Matrice × matrice (GEMM)</td><td>Matrice × vecteur (GEMV)</td></tr>
            <tr><td>Intensité arithmétique</td><td>Élevée</td><td>≈ 1 FLOP/octet (× taille du lot)</td></tr>
            <tr><td>Facteur limitant</td><td>Tensor Cores (calcul)</td><td>HBM (bande passante)</td></tr>
            <tr><td>Métrique utilisateur</td><td>TTFT (temps jusqu'au 1er token)</td><td>Tokens/s ou ITL (latence inter-tokens)</td></tr>
            <tr><td>Cache KV</td><td>Écrit pour tout le prompt</td><td>Lu en entier, + 1 entrée par token</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Le cache KV</h2>
      <Def term="Cache KV" en="KV cache">
        Mémoire, dans la HBM, où l'on stocke les vecteurs <b>K</b> et <b>V</b> de chaque token déjà traité, pour chaque couche. Au pas suivant, le nouveau token n'a besoin de
        calculer que <b>son</b> Q, K et V ; il compare son Q aux K stockés et combine les V stockés. Sans ce cache, il faudrait tout recalculer à chaque token (coût quadratique).
      </Def>
      <div className="formula">{`Taille du cache KV par token = 2 (K et V) × couches × têtes KV × dimension par tête × octets
Llama 3 8B, BF16 : 2 × 32 × 8 × 128 × 2 = 131 072 octets = 128 Ko par token
Contexte de 8 000 tokens → ≈ 1 Go ; 32 utilisateurs simultanés → ≈ 32 Go`}</div>
      <Callout type="warn" title="Le cache KV est souvent le vrai facteur limitant">
        Sur un serveur, les poids sont chargés une seule fois pour tous les utilisateurs, mais chaque conversation a <b>son propre cache KV</b>. Avec de longs contextes et
        beaucoup d'utilisateurs, le cache KV peut dépasser la taille des poids. C'est pourquoi on a inventé GQA (moins de têtes KV), la quantification du cache (FP8) et la
        gestion par pages (PagedAttention, chapitre 12).
      </Callout>

      <h2>Le calcul qui explique tout</h2>
      <p>À chaque pas de décodage, pour un seul utilisateur :</p>
      <ul>
        <li><b>Calcul</b> : ≈ 2 × 8 × 10⁹ = 16 GFLOP → sur H100 (≈ 990 TFLOPS) : <b>≈ 0,016 ms</b></li>
        <li><b>Mémoire</b> : 16 Go de poids à lire → à 3,35 To/s : <b>≈ 4,8 ms</b></li>
      </ul>
      <p>
        La mémoire prend <b>300 fois plus de temps</b> que le calcul : pendant le décodage, les Tensor Cores sont inactifs plus de 99 % du temps. La vitesse maximale de
        génération se calcule donc simplement :
      </p>
      <div className="formula">{`tokens/s (1 utilisateur) ≤ bande passante mémoire ÷ taille des poids
H100 + Llama 3 8B BF16 : 3 350 Go/s ÷ 16 Go ≈ 210 tokens/s (en pratique ≈ 150)
RTX 4090 + même modèle : 1 008 Go/s ÷ 16 Go ≈ 63 tokens/s`}</div>
      <Callout type="key" title="La conséquence pour toute l'industrie">
        Pour générer du texte plus vite, il faut soit <b>lire moins d'octets</b> (quantification, GQA), soit <b>faire plus de travail par octet lu</b> (traiter plusieurs
        utilisateurs par lot, décodage spéculatif), soit <b>plus de bande passante</b> (HBM plus rapide, plusieurs GPU). C'est le sujet du dernier chapitre.
      </Callout>

      <h2>Et la carte des composants ?</h2>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Composant</th><th>Rôle dans l'inférence d'un LLM</th></tr></thead>
          <tbody>
            <tr><td>CPU + RAM</td><td>Tokenisation, planification des requêtes (serveur), lancement des kernels, détokenisation et envoi du texte</td></tr>
            <tr><td>PCIe / DMA</td><td>Chargement des poids au démarrage ; échanges minimes ensuite (identifiants de tokens)</td></tr>
            <tr><td>NVLink</td><td>Échanges entre GPU à chaque couche quand le modèle est réparti (parallélisme de tenseurs)</td></tr>
            <tr><td>GigaThread Engine</td><td>Répartit les blocs de chacun des centaines de kernels par token sur les SM</td></tr>
            <tr><td>Ordonnanceurs de warps</td><td>Alternent entre warps pour masquer l'attente des poids venant de la HBM</td></tr>
            <tr><td>Tensor Cores</td><td>Toutes les projections (Q, K, V, O), le MLP, la tête de sortie, Q·Kᵀ et poids·V</td></tr>
            <tr><td>Cœurs CUDA</td><td>Additions résiduelles, RoPE, multiplication SwiGLU, masque, déquantification</td></tr>
            <tr><td>SFU</td><td>Exponentielles des softmax, SiLU, racines inverses des RMSNorm, sin/cos de RoPE</td></tr>
            <tr><td>LD/ST, TMA</td><td>Chargement des tuiles de poids et du cache KV vers la mémoire partagée</td></tr>
            <tr><td>Registres</td><td>Accumulateurs FP32 des GEMM, état courant de FlashAttention</td></tr>
            <tr><td>Mémoire partagée / L1</td><td>Tuiles de poids et d'activations, blocs de K/V dans FlashAttention, réductions</td></tr>
            <tr><td>Cache L2</td><td>Partage des tuiles entre SM, activations entre kernels</td></tr>
            <tr><td>HBM</td><td>Poids (16 Go), cache KV (jusqu'à des dizaines de Go), activations ; sa bande passante fixe la vitesse de génération</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
