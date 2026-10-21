import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import { NeuronSim } from '../sims/NumberSims.jsx'

export const quiz = [
  {
    q: 'Que calcule un neurone artificiel ?',
    options: [
      'Une somme pondérée de ses entrées, plus un biais, passée dans une fonction d\'activation',
      'Le maximum de ses entrées',
      'Une image',
      'Un nombre aléatoire',
    ],
    answer: 0,
    explain: 'y = activation(w₁x₁ + w₂x₂ + … + b). C\'est un produit scalaire suivi d\'une fonction simple.',
  },
  {
    q: 'Une couche dense de 512 entrées et 256 sorties contient combien de poids (sans les biais) ?',
    options: ['768', '131 072', '256', '512'],
    answer: 1,
    explain: 'Chaque sortie est reliée à chaque entrée : 512 × 256 = 131 072 poids, rangés dans une matrice 256×512.',
  },
  {
    q: 'Pourquoi a-t-on besoin d\'une fonction d\'activation non linéaire ?',
    options: [
      'Pour accélérer le calcul',
      'Sans elle, empiler des couches reviendrait à une seule couche : le réseau ne pourrait représenter que des relations linéaires',
      'Pour réduire la mémoire',
      'Pour normaliser les données',
    ],
    answer: 1,
    explain: 'Deux produits matriciels successifs équivalent à un seul. La non-linéarité (ReLU, GELU…) donne au réseau sa puissance d\'expression.',
  },
  {
    q: 'Pour calculer toute une couche dense sur un lot d\'entrées, quelle opération utilise-t-on ?',
    options: ['Un tri', 'Un produit matriciel (GEMM)', 'Une recherche dans une table', 'Une division'],
    answer: 1,
    explain: 'Sortie = activation(X · Wᵀ + b) : un GEMM, suivi d\'opérations élément par élément.',
  },
]

export default function Ch08() {
  return (
    <>
      <Objectives
        items={[
          'Ce qu\'est un neurone artificiel, ses poids et son biais',
          'Ce qu\'est une couche dense et pourquoi c\'est un produit matriciel',
          'Le rôle des fonctions d\'activation (ReLU, GELU, softmax)',
          'Ce qu\'on appelle paramètres, activations et lot (batch)',
        ]}
      />

      <h2>Le neurone artificiel</h2>
      <Def term="Neurone artificiel" en="Artificial neuron / perceptron">
        Une petite fonction qui reçoit plusieurs nombres en entrée (x₁, x₂, …), multiplie chacun par un <b>poids</b> (w₁, w₂, …), additionne le tout avec un <b>biais</b> b,
        puis applique une <b>fonction d'activation</b>. En formule : <code>y = activation(w · x + b)</code>. On reconnaît un <b>produit scalaire</b> (chapitre 2).
      </Def>
      <Card title="Jouer avec un neurone" sub="Modifiez les entrées, les poids et la fonction d'activation." sim>
        <NeuronSim />
      </Card>
      <Def term="Poids et biais (paramètres)" en="Weights & biases (parameters)">
        Les nombres réglés pendant l'<b>entraînement</b> pour que le réseau donne de bonnes réponses. En inférence, ils sont <b>fixes</b> : ils sont lus depuis la mémoire, jamais
        modifiés. Quand on dit qu'un modèle a « 8 milliards de paramètres », on parle de ces nombres.
      </Def>
      <Callout type="analogy" title="Intuition">
        Un poids positif élevé signifie « cette entrée compte beaucoup en faveur de ma conclusion », un poids négatif « cette entrée va contre ». Le biais règle le seuil à partir
        duquel le neurone « s'active ».
      </Callout>

      <h2>Les fonctions d'activation</h2>
      <Def term="ReLU" en="Rectified Linear Unit">
        <code>ReLU(z) = max(0, z)</code> : laisse passer les valeurs positives, remplace les négatives par 0. Simple et très rapide (une instruction sur un cœur CUDA).
      </Def>
      <Def term="GELU, SiLU" en="Gaussian Error Linear Unit, Sigmoid Linear Unit">
        Versions « adoucies » de ReLU, utilisées dans les transformers. Elles nécessitent une exponentielle ou une tangente hyperbolique : calculées par les <b>SFU</b>.
      </Def>
      <Def term="Softmax" en="Softmax">
        Transforme une liste de scores quelconques (appelés <b>logits</b>) en <b>probabilités</b> positives dont la somme vaut 1 : on prend l'exponentielle de chaque score, puis on
        divise par la somme. Utilisé en sortie d'un classifieur et au cœur de l'attention des transformers.
      </Def>
      <div className="formula">{`softmax([2, 1, 0]) = [e², e¹, e⁰] / (e² + e¹ + e⁰) = [0.67, 0.24, 0.09]`}</div>

      <h2>La couche dense</h2>
      <Def term="Couche dense" en="Dense / fully-connected / linear layer">
        Un ensemble de neurones qui reçoivent <b>tous</b> les mêmes entrées. Si la couche a n entrées et m neurones, ses poids forment une <b>matrice W de m lignes et n
        colonnes</b> (une ligne par neurone), et ses biais un vecteur b de taille m. Calculer toute la couche, c'est calculer <code>y = activation(W · x + b)</code> : un
        <b> produit matrice × vecteur</b>.
      </Def>
      <Def term="Réseau dense / perceptron multicouche" en="Multi-Layer Perceptron (MLP)">
        Plusieurs couches denses empilées : la sortie de l'une est l'entrée de la suivante. Les couches du milieu sont dites <b>cachées</b>. Les MLP sont les réseaux les plus
        simples, et ils constituent aussi environ deux tiers des paramètres d'un transformer.
      </Def>
      <Def term="Activations" en="Activations">
        Les valeurs intermédiaires calculées par le réseau pour une entrée donnée (les sorties de chaque couche). Contrairement aux poids, elles changent à chaque inférence et
        sont stockées temporairement en mémoire. Attention : le mot « activation » désigne aussi la fonction (ReLU…) ; le contexte permet de trancher.
      </Def>
      <Def term="Lot" en="Batch">
        Plusieurs entrées traitées ensemble. On range les vecteurs d'entrée dans une matrice X (une ligne par entrée) et toute la couche devient un <b>produit matrice × matrice</b> :
        <code> Y = activation(X · Wᵀ + b)</code>. Chaque poids lu sert alors à toutes les entrées du lot : c'est bien plus efficace sur GPU (chapitre 5).
      </Def>

      <h2>Pourquoi empiler des couches ?</h2>
      <p>
        Chaque couche transforme la représentation des données. Dans un réseau de reconnaissance d'images, les premières couches détectent des bords, les suivantes des formes,
        puis des objets. Sans fonction d'activation non linéaire entre les couches, deux couches W₂(W₁x) équivaudraient à une seule couche (W₂W₁)x : la non-linéarité est
        indispensable.
      </p>
      <Callout type="key" title="Le lien avec le GPU">
        Un réseau dense, c'est une suite de <b>produits matriciels</b> (→ Tensor Cores), chacun suivi d'opérations <b>élément par élément</b> (biais, ReLU → cœurs CUDA) et
        éventuellement d'un <b>softmax</b> final (→ SFU et réductions). Tout ce que nous avons vu sur le GPU s'applique directement. Voyons-le étape par étape.
      </Callout>
    </>
  )
}
