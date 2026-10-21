import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import AttentionSim from '../sims/AttentionSim.jsx'

export const quiz = [
  {
    q: 'Qu\'est-ce qu\'un token ?',
    options: ['Un jeton de paiement', 'Un morceau de texte (mot, partie de mot, ponctuation) associé à un numéro dans le vocabulaire', 'Un neurone', 'Une couche du modèle'],
    answer: 1,
    explain: 'Les modèles de langage ne voient pas des lettres mais des tokens ; en français, un mot fait en moyenne 1 à 2 tokens.',
  },
  {
    q: 'À quoi sert le mécanisme d\'attention ?',
    options: [
      'À accélérer le GPU',
      'À permettre à chaque token de récupérer de l\'information des autres tokens pertinents de la séquence',
      'À compresser le modèle',
      'À choisir le prochain token',
    ],
    answer: 1,
    explain: 'Chaque token calcule, via Q·K, à quel point chaque autre token le concerne, puis fait une moyenne pondérée de leurs V.',
  },
  {
    q: 'Que fait le masque causal ?',
    options: ['Il cache les poids', 'Il empêche un token de regarder les tokens qui viennent après lui', 'Il supprime les tokens inutiles', 'Il normalise les vecteurs'],
    answer: 1,
    explain: 'Un modèle qui génère du texte de gauche à droite ne doit pas « tricher » en regardant le futur.',
  },
  {
    q: 'Dans un bloc de transformer, quelle partie applique le même petit réseau dense à chaque token indépendamment ?',
    options: ['L\'attention', 'Le MLP (feed-forward)', 'L\'embedding', 'La tokenisation'],
    answer: 1,
    explain: 'Le MLP ne mélange pas les tokens entre eux : c\'est exactement le réseau dense du chapitre 8, appliqué token par token.',
  },
  {
    q: 'Le coût de l\'attention croît avec la longueur n de la séquence…',
    options: ['Linéairement (n)', 'Quadratiquement (n²), car chaque token est comparé à tous les autres', 'Il ne dépend pas de n', 'Logarithmiquement'],
    answer: 1,
    explain: 'La matrice des scores est n × n. Doubler la longueur du contexte quadruple le coût de cette partie.',
  },
]

export default function Ch10() {
  return (
    <>
      <Objectives
        items={[
          'Comment un texte devient une suite de vecteurs (tokenisation, embeddings)',
          'Le mécanisme d\'attention : requêtes, clés, valeurs',
          'La structure d\'un bloc de transformer (attention, MLP, normalisation, connexions résiduelles)',
          'Ce qu\'est un modèle de langage et comment il génère du texte',
        ]}
      />
      <p>
        Les <b>transformers</b> (2017) sont l'architecture derrière les grands modèles de langage (GPT, Claude, Llama, Mistral…), mais aussi de nombreux modèles d'image et de son.
        Ils sont plus complexes qu'un réseau dense, mais, bonne nouvelle, ils sont construits presque entièrement à partir des mêmes briques : des <b>produits matriciels</b>,
        des <b>opérations élément par élément</b> et des <b>softmax</b>.
      </p>

      <h2>Du texte aux vecteurs</h2>
      <Def term="Token et tokenisation" en="Token / tokenization">
        Le texte est découpé en <b>tokens</b> : des mots fréquents, des morceaux de mots, de la ponctuation. « Le chat dort » peut donner [« Le », « ␣chat », « ␣dort »]. Chaque
        token a un <b>numéro</b> dans un <b>vocabulaire</b> fixe (≈ 128 000 tokens pour Llama 3). La tokenisation est faite par le CPU.
      </Def>
      <Def term="Embedding" en="Embedding">
        Un vecteur de nombres associé à chaque token du vocabulaire (4 096 nombres pour Llama 3 8B). Les embeddings sont rangés dans une grande table (une ligne par token) apprise
        pendant l'entraînement. Des tokens de sens proche ont des vecteurs proches. Transformer les numéros en vecteurs revient simplement à <b>lire les bonnes lignes</b> de la
        table.
      </Def>
      <Def term="Flux résiduel" en="Residual stream">
        La suite de vecteurs (un par token) qui traverse le modèle de bas en haut. Chaque bloc <b>lit</b> ce flux, calcule une modification, et l'<b>ajoute</b> au flux
        (x ← x + f(x)). On parle de <b>connexion résiduelle</b>. Cela stabilise les réseaux très profonds.
      </Def>

      <h2>L'attention : faire circuler l'information entre les tokens</h2>
      <p>
        Un réseau dense traite chaque entrée isolément. Or pour comprendre « noir » dans « Le chat noir », il faut savoir que cet adjectif se rapporte à « chat ». Le mécanisme
        d'<b>attention</b> permet à chaque token d'aller chercher de l'information chez les autres.
      </p>
      <Def term="Requête, clé, valeur" en="Query, Key, Value (Q, K, V)">
        Chaque token produit trois vecteurs, en multipliant son vecteur par trois matrices de poids (W_Q, W_K, W_V) :
        <ul>
          <li><b>Requête (Q)</b> : « ce que je cherche » (ex. « noir » cherche le nom qu'il qualifie) ;</li>
          <li><b>Clé (K)</b> : « ce que je suis, pour qui me cherche » (ex. « chat » : je suis un nom) ;</li>
          <li><b>Valeur (V)</b> : « l'information que je transmets si l'on me choisit ».</li>
        </ul>
      </Def>
      <Callout type="analogy" title="Analogie : la bibliothèque">
        Vous cherchez un livre (requête). Chaque livre a une étiquette sur le dos (clé). Vous comparez votre requête à chaque étiquette, et vous lisez surtout les livres dont
        l'étiquette correspond le mieux (valeurs pondérées par la correspondance).
      </Callout>
      <div className="formula">{`Attention(Q, K, V) = softmax( Q · Kᵀ / √d  + masque ) · V

1. scores = Q · Kᵀ / √d      → produit matriciel (Tensor Cores), d = taille des vecteurs
2. masque causal              → on met −∞ sur les tokens futurs (cœurs CUDA)
3. poids = softmax(scores)    → exp (SFU), max et somme (réductions)
4. sortie = poids · V          → produit matriciel (Tensor Cores)`}</div>
      <Card title="L'attention sur un exemple" sub="Choisissez un token et observez à quels autres tokens il « fait attention »." sim>
        <AttentionSim />
      </Card>
      <Def term="Attention multi-têtes" en="Multi-head attention">
        On fait plusieurs attentions <b>en parallèle</b> (32 « têtes » dans Llama 3 8B), chacune avec ses propres Q, K, V de petite taille (128). Chaque tête peut se spécialiser :
        une pour la grammaire, une pour les références, etc. Les résultats sont concaténés puis multipliés par une matrice W_O. Pour le GPU, les têtes sont autant de calculs
        indépendants : parfait pour le parallélisme.
      </Def>
      <Def term="GQA" en="Grouped-Query Attention">
        Variante où plusieurs têtes de requêtes partagent les mêmes clés et valeurs (Llama 3 8B : 32 têtes Q mais seulement 8 têtes K/V). Cela réduit fortement la taille du cache
        KV (chapitre 11) et donc la mémoire à lire.
      </Def>
      <Def term="Encodage de position (RoPE)" en="Rotary Position Embedding">
        L'attention, telle quelle, ignore l'ordre des mots. RoPE fait « tourner » les vecteurs Q et K d'un angle proportionnel à la position du token : le produit Q·K dépend
        alors de la distance entre les deux tokens.
      </Def>

      <h2>Le bloc de transformer</h2>
      <div className="formula">{`Pour chaque bloc (32 fois dans Llama 3 8B) :
  x = x + Attention( RMSNorm(x) )     ← les tokens échangent de l'information
  x = x + MLP( RMSNorm(x) )           ← chaque token est transformé individuellement

MLP (SwiGLU) : MLP(x) = W_down · ( SiLU(W_gate · x) ⊙ (W_up · x) )
               4 096 → 14 336 → 4 096`}</div>
      <Def term="Normalisation (LayerNorm / RMSNorm)" en="Layer normalization">
        Remet à l'échelle chaque vecteur pour que ses valeurs restent dans une plage raisonnable : on divise par la racine de la moyenne des carrés (RMSNorm), puis on
        multiplie par des poids appris. Calcul peu coûteux mais qui demande une <b>réduction</b> (somme) sur les 4 096 valeurs.
      </Def>
      <Def term="MLP / couche feed-forward" en="Feed-Forward Network (FFN)">
        Un réseau dense à deux couches appliqué à <b>chaque token séparément</b>. C'est la partie qui contient le plus de paramètres (≈ 2/3) : on pense qu'elle stocke une grande
        partie des « connaissances » du modèle.
      </Def>

      <h2>Le modèle de langage complet</h2>
      <Def term="Modèle de langage (LLM)" en="Large Language Model">
        Un transformer entraîné à prédire le <b>token suivant</b>. Structure : embedding → N blocs → normalisation finale → <b>tête de sortie</b> (une couche dense de 4 096 vers
        128 256) qui donne un score (<b>logit</b>) pour chaque token du vocabulaire.
      </Def>
      <Def term="Génération autorégressive" en="Autoregressive generation">
        Pour produire un texte, on prédit un token, on l'ajoute à la séquence, puis on recommence pour prédire le suivant, et ainsi de suite. Chaque nouveau token nécessite un
        nouveau passage dans le modèle.
      </Def>
      <Def term="Échantillonnage" en="Sampling">
        La façon de choisir le token à partir des probabilités : prendre le plus probable (<i>greedy</i>), ou tirer au hasard en favorisant les plus probables. La
        <b> température</b> règle la « créativité » (on divise les logits par T avant le softmax) ; <b>top-k</b> / <b>top-p</b> éliminent les tokens improbables.
      </Def>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Composant de Llama 3 8B</th><th>Paramètres</th><th>Opérations GPU dominantes</th></tr></thead>
          <tbody>
            <tr><td>Embedding (128 256 × 4 096)</td><td>≈ 0,5 milliard</td><td>Lecture mémoire (gather)</td></tr>
            <tr><td>32 × attention (W_Q, W_K, W_V, W_O)</td><td>≈ 1,3 milliard</td><td>GEMM + noyau d'attention</td></tr>
            <tr><td>32 × MLP (gate, up, down)</td><td>≈ 5,6 milliards</td><td>GEMM</td></tr>
            <tr><td>Normalisations</td><td>≈ 0,0003 milliard</td><td>Réductions, SFU</td></tr>
            <tr><td>Tête de sortie (4 096 × 128 256)</td><td>≈ 0,5 milliard</td><td>GEMM</td></tr>
            <tr><td><b>Total</b></td><td><b>≈ 8 milliards</b></td><td>≈ 95 % du calcul dans des GEMM</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
