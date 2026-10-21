import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import LlmCalculator from '../sims/LlmCalculator.jsx'

export const quiz = [
  {
    q: 'Pourquoi le traitement par lots (batching) augmente-t-il le débit total en décodage ?',
    options: [
      'Parce qu\'il réduit la taille des poids',
      'Parce que les poids lus une fois depuis la HBM servent à calculer le token suivant de plusieurs utilisateurs à la fois',
      'Parce qu\'il augmente la fréquence du GPU',
      'Il ne l\'augmente pas',
    ],
    answer: 1,
    explain: 'Tant qu\'on reste limité par la mémoire, traiter 32 séquences coûte presque le même temps que d\'en traiter une.',
  },
  {
    q: 'Quelle est l\'idée clé de FlashAttention ?',
    options: [
      'Supprimer le softmax',
      'Calculer l\'attention par tuiles en gardant les résultats intermédiaires en mémoire partagée, sans jamais écrire la matrice des scores en HBM',
      'Utiliser le CPU pour l\'attention',
      'Réduire le nombre de têtes',
    ],
    answer: 1,
    explain: 'Grâce à un softmax « en ligne », on traite K et V bloc par bloc : la mémoire utilisée ne croît plus en n² et les accès HBM chutent.',
  },
  {
    q: 'Que fait PagedAttention (vLLM) ?',
    options: [
      'Il découpe le cache KV en pages de taille fixe allouées à la demande, comme la mémoire virtuelle d\'un système d\'exploitation',
      'Il imprime l\'attention',
      'Il compresse les poids en INT4',
      'Il répartit le modèle sur plusieurs GPU',
    ],
    answer: 0,
    explain: 'Cela évite de réserver d\'avance la longueur maximale pour chaque requête et supprime le gaspillage de mémoire.',
  },
  {
    q: 'Un modèle de 140 Go en BF16 doit tourner sur des GPU de 80 Go. Quelle technique est indispensable ?',
    options: ['Le batching', 'Répartir le modèle sur plusieurs GPU (parallélisme de tenseurs ou de pipeline) ou le quantifier', 'FlashAttention', 'Augmenter la température'],
    answer: 1,
    explain: 'Il faut au moins 2 GPU (en pratique 4 pour laisser de la place au cache KV), reliés par NVLink, ou réduire la taille par quantification.',
  },
  {
    q: 'Sur quoi repose le décodage spéculatif ?',
    options: [
      'Un petit modèle propose plusieurs tokens, que le gros modèle vérifie en un seul passage (comme un mini-prefill)',
      'On devine les tokens au hasard',
      'On saute des couches',
      'On utilise deux CPU',
    ],
    answer: 0,
    explain: 'Vérifier k tokens coûte à peu près le même temps que d\'en générer un (limité par la mémoire), donc on gagne si les propositions sont souvent justes.',
  },
]

export default function Ch12() {
  return (
    <>
      <Objectives
        items={[
          'Les grandes techniques d\'optimisation de l\'inférence et le composant GPU qu\'elles exploitent',
          'Comment un serveur sert des milliers d\'utilisateurs avec quelques GPU',
          'Comment répartir un modèle trop gros sur plusieurs GPU',
          'Estimer soi-même la mémoire et la vitesse d\'un LLM sur un GPU donné',
        ]}
      />

      <h2>1. Faire plus de travail par octet lu</h2>
      <Def term="Traitement par lots" en="Batching">
        Traiter plusieurs séquences ensemble : à chaque pas de décodage, les poids lus depuis la HBM servent pour <b>tous</b> les utilisateurs du lot. Le produit matrice × vecteur
        redevient un produit matrice × matrice. Le débit total augmente presque proportionnellement à la taille du lot, jusqu'à ce que le calcul ou la mémoire du cache KV
        devienne limitant.
      </Def>
      <Def term="Batching continu" en="Continuous / in-flight batching">
        Les requêtes n'ont pas toutes la même longueur. Plutôt que d'attendre que tout le lot soit terminé, le serveur retire une séquence dès qu'elle est finie et en insère
        une nouvelle au pas suivant. Le GPU reste plein en permanence. Utilisé par vLLM, TensorRT-LLM, SGLang, TGI…
      </Def>
      <Def term="Décodage spéculatif" en="Speculative decoding">
        Un petit modèle rapide (ou des têtes supplémentaires) <b>propose</b> plusieurs tokens ; le grand modèle les <b>vérifie tous en un seul passage</b>, comme un mini-prefill.
        Comme ce passage est limité par la mémoire, vérifier 5 tokens coûte presque autant qu'en générer 1. Si la plupart des propositions sont acceptées, on génère
        plusieurs tokens par lecture des poids. Le résultat est identique à celui du grand modèle seul.
      </Def>

      <h2>2. Lire moins d'octets</h2>
      <Def term="Quantification des poids" en="Weight quantization">
        Stocker les poids en 8 ou 4 bits (chapitre 7) : deux à quatre fois moins de données à lire par token, donc une génération jusqu'à 2 à 4 fois plus rapide, et des
        modèles plus gros sur le même GPU. Les cœurs CUDA déquantifient les poids à la volée dans les registres.
      </Def>
      <Def term="Quantification du cache KV" en="KV cache quantization">
        Stocker K et V en FP8 ou INT8 : le cache prend deux fois moins de place, donc on peut servir deux fois plus d'utilisateurs ou des contextes deux fois plus longs.
      </Def>
      <Def term="FlashAttention" en="FlashAttention">
        Kernel d'attention qui ne construit jamais la matrice complète des scores (n × n) en HBM. Il charge des tuiles de Q, K et V en <b>mémoire partagée</b>, calcule les scores,
        le softmax (grâce à une astuce de « softmax en ligne » qui met à jour le maximum et la somme au fur et à mesure) et la sortie, en gardant tout dans les <b>registres</b>.
        Résultat : bien moins d'accès mémoire et une mémoire en O(n) au lieu de O(n²). FlashAttention-3 exploite le <b>TMA</b> et les instructions <code>wgmma</code> de H100.
      </Def>
      <Def term="Fusion de kernels et compilation" en="Kernel fusion / graph compilation">
        Des outils comme TensorRT-LLM, <code>torch.compile</code> ou Triton fusionnent normalisations, activations, RoPE et additions résiduelles dans les GEMM voisins, et
        enregistrent la boucle de décodage dans un <b>CUDA Graph</b> pour supprimer le coût de lancement de centaines de kernels par token.
      </Def>

      <h2>3. Mieux gérer la mémoire</h2>
      <Def term="PagedAttention" en="PagedAttention (vLLM)">
        Le cache KV est découpé en <b>pages</b> de taille fixe (par ex. 16 tokens), allouées au fur et à mesure que la séquence grandit, comme la mémoire virtuelle d'un
        système d'exploitation. Plus besoin de réserver d'avance la longueur maximale pour chaque requête : beaucoup plus d'utilisateurs simultanés dans la même HBM.
      </Def>
      <Def term="Cache de préfixes" en="Prefix caching">
        Si plusieurs requêtes commencent par le même texte (par exemple un long « prompt système »), on réutilise le cache KV déjà calculé pour ce préfixe : on évite de refaire
        le prefill.
      </Def>
      <Def term="Séparation prefill / décodage" en="Disaggregated serving / chunked prefill">
        Le prefill (limité par le calcul) et le décodage (limité par la mémoire) n'ont pas les mêmes besoins. On peut les exécuter sur des GPU différents, ou découper les longs
        prefills en morceaux mélangés aux pas de décodage pour que les utilisateurs en cours de génération ne soient pas ralentis.
      </Def>

      <h2>4. Utiliser plusieurs GPU</h2>
      <Def term="Parallélisme de tenseurs" en="Tensor parallelism">
        Chaque matrice de poids est <b>découpée</b> entre plusieurs GPU (par exemple par colonnes). Chaque GPU calcule sa part de chaque couche, puis les GPU échangent et
        additionnent leurs résultats (<b>all-reduce</b>) via <b>NVLink</b>, deux fois par couche. On additionne ainsi la capacité mémoire <b>et</b> la bande passante : 8 GPU
        lisent les poids 8 fois plus vite. Exige des liens très rapides entre GPU.
      </Def>
      <Def term="Parallélisme de pipeline" en="Pipeline parallelism">
        Les <b>couches</b> sont réparties entre GPU : le GPU 1 fait les couches 1 à 20, le GPU 2 les couches 21 à 40, etc. Moins de communication (seulement entre étages), mais un
        seul GPU travaille à la fois sur une séquence donnée : on remplit le pipeline avec plusieurs lots.
      </Def>
      <Def term="Parallélisme d'experts" en="Expert parallelism (Mixture of Experts)">
        Dans les modèles « Mixture of Experts » (Mixtral, DeepSeek…), le MLP est remplacé par de nombreux « experts » dont seuls quelques-uns sont utilisés par token. On place
        les experts sur différents GPU ; chaque token est envoyé aux GPU de ses experts. On lit ainsi beaucoup moins de poids par token que le total du modèle.
      </Def>

      <h2>Calculateur : votre modèle, votre GPU</h2>
      <Card title="Estimer la mémoire et la vitesse d'un LLM" sub="Toutes les formules de ce cours, réunies dans un calculateur." sim>
        <LlmCalculator />
      </Card>
      <Callout type="info" title="Idées d'expériences">
        <ul style={{ margin: 0 }}>
          <li>Llama 3.1 70B en BF16 sur 1 H100 : ça ne tient pas. Passez en INT4, ou à 2 puis 4 GPU.</li>
          <li>Llama 3.1 8B sur RTX 4090 : comparez BF16 et INT4 en tokens/s.</li>
          <li>Augmentez le lot de 1 à 64 : le débit total explose, la vitesse par utilisateur baisse à peine… jusqu'à ce que le cache KV sature la mémoire.</li>
          <li>Allongez le contexte à 128 000 tokens avec un lot de 16 : le cache KV dépasse largement les poids.</li>
        </ul>
      </Callout>

      <h2>Conclusion du cours</h2>
      <Callout type="key" title="Ce qu'il faut retenir">
        <ol style={{ margin: 0 }}>
          <li>Un GPU = des dizaines de SM, chacun avec des milliers de threads, des Tensor Cores, des registres et une mémoire partagée, alimentés par la HBM.</li>
          <li>L'inférence d'un réseau de neurones, dense ou transformer, est une suite de produits matriciels (Tensor Cores) entrecoupés d'opérations élément par élément
            (cœurs CUDA, SFU).</li>
          <li>La performance dépend de l'intensité arithmétique : réutiliser chaque octet chargé (tuilage, lots, fusion).</li>
          <li>Pour les LLM : le prefill est limité par le calcul, le décodage par la bande passante mémoire. Le cache KV évite de recalculer le passé, au prix de la mémoire.</li>
          <li>Toutes les optimisations modernes (batching, quantification, FlashAttention, PagedAttention, spéculatif, multi-GPU) visent à lire moins d'octets ou à faire plus
            de travail par octet lu.</li>
        </ol>
      </Callout>
    </>
  )
}
