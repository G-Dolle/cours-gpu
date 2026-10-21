import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import { DotProductSim, MatVecSim } from '../sims/MathSims.jsx'

export const quiz = [
  {
    q: 'Quel est le produit scalaire de [1, 2, 3] et [4, 0, −1] ?',
    options: ['1', '4', '7', '−3'],
    answer: 0,
    explain: '1×4 + 2×0 + 3×(−1) = 4 + 0 − 3 = 1.',
  },
  {
    q: 'On multiplie une matrice de 4 lignes et 3 colonnes par un vecteur de taille 3. Quelle est la taille du résultat ?',
    options: ['3', '4', '12', '7'],
    answer: 1,
    explain: 'Il y a un produit scalaire par ligne de la matrice : 4 lignes donnent 4 résultats.',
  },
  {
    q: 'Combien de multiplications faut-il pour multiplier deux matrices carrées 100×100 ?',
    options: ['100', '10 000', '1 000 000', '200'],
    answer: 2,
    explain: 'Le résultat a 100×100 = 10 000 cases, chacune étant un produit scalaire de 100 multiplications : 10 000 × 100 = 1 000 000.',
  },
  {
    q: 'Qu\'est-ce qu\'un tenseur ?',
    options: ['Un composant du GPU', 'Un tableau de nombres à une, deux, trois dimensions ou plus', 'Un type de réseau de neurones', 'Une unité de mesure de puissance'],
    answer: 1,
    explain: 'Vecteur = tenseur à 1 dimension, matrice = 2 dimensions, et on peut aller au-delà (ex. un lot d\'images couleur = 4 dimensions).',
  },
  {
    q: 'Un GPU annonce 1 000 TFLOPS. Cela signifie…',
    options: ['1 000 milliards d\'opérations par seconde', 'Un million de milliards d\'opérations par seconde', '1 000 opérations par cycle', '1 000 téraoctets de mémoire'],
    answer: 1,
    explain: '1 TFLOPS = 10¹² opérations/s ; 1 000 TFLOPS = 10¹⁵ = un million de milliards d\'opérations sur des nombres à virgule par seconde.',
  },
]

export default function Ch02() {
  return (
    <>
      <Objectives
        items={[
          'Ce que sont un vecteur, une matrice et un tenseur',
          'Comment calculer un produit scalaire et un produit matrice × vecteur',
          'Pourquoi ces calculs sont naturellement parallèles',
          'Comment on mesure la quantité de calcul (FLOP, FLOPS)',
        ]}
      />
      <Callout type="info" title="Pas de panique">
        Ce chapitre contient les <b>seules</b> notions mathématiques nécessaires pour tout le cours : multiplier et additionner. Rien de plus.
      </Callout>

      <h2>Vecteurs, matrices, tenseurs</h2>
      <Def term="Vecteur" en="Vector">
        Une liste ordonnée de nombres, par exemple <code>[2, −1, 3]</code>. On peut s'en servir pour décrire un objet par plusieurs caractéristiques : un fruit décrit par [rougeur,
        longueur, poids]. Sa <b>taille</b> (ou dimension) est le nombre d'éléments.
      </Def>
      <Def term="Matrice" en="Matrix">
        Un tableau rectangulaire de nombres, organisé en <b>lignes</b> et en <b>colonnes</b>. Une matrice « 4×3 » a 4 lignes et 3 colonnes, donc 12 nombres. Dans un réseau de
        neurones, les poids d'une couche sont rangés dans une matrice.
      </Def>
      <Def term="Tenseur" en="Tensor">
        Le terme général pour un tableau de nombres à un nombre quelconque de dimensions. Un vecteur est un tenseur 1D, une matrice un tenseur 2D ; un lot de 32 images couleur de
        224×224 pixels est un tenseur 4D de forme [32, 3, 224, 224]. C'est de là que viennent les noms « TensorFlow » et « Tensor Cores ».
      </Def>

      <h2>L'opération reine : le produit scalaire</h2>
      <Def term="Produit scalaire" en="Dot product">
        On multiplie deux vecteurs de même taille élément par élément, puis on additionne tous les produits. Le résultat est <b>un seul nombre</b>. Il mesure, en gros, à quel
        point les deux vecteurs « vont dans le même sens ».
      </Def>
      <Card title="Calculer un produit scalaire" sub="Modifiez les valeurs et observez le calcul." sim>
        <DotProductSim />
      </Card>
      <Def term="FMA" en="Fused Multiply-Add — multiplication-addition fusionnée">
        L'opération <code>total ← total + a × b</code> réalisée en une seule instruction. C'est la brique de base du produit scalaire, et donc de tout réseau de neurones. Les
        unités de calcul d'un GPU sont conçues pour en faire une par cycle. Une FMA compte pour <b>2 opérations</b> (une multiplication et une addition).
      </Def>

      <h2>Produit matrice × vecteur</h2>
      <p>
        Multiplier une matrice W par un vecteur x, c'est faire <b>un produit scalaire par ligne</b> de W : la ligne i de W, « scalairement » avec x, donne l'élément i du résultat.
      </p>
      <Card title="Produit matrice × vecteur" sub="Chaque case du résultat est indépendante des autres." sim>
        <MatVecSim />
      </Card>

      <h2>Produit matrice × matrice</h2>
      <p>
        Si, au lieu d'un seul vecteur x, on en a plusieurs (par exemple les données de 64 utilisateurs), on les range côte à côte dans une matrice X. Le produit W × X est alors
        simplement <b>un produit matrice × vecteur pour chaque colonne</b> de X. Pour des matrices de tailles (M×K) et (K×N), le résultat est M×N, et chaque case demande K
        multiplications-additions.
      </p>
      <div className="formula">{`Nombre d'opérations d'un produit (M×K) · (K×N) = 2 × M × N × K\nExemple : 4096 × 4096 × 4096 → 2 × 4096³ ≈ 137 milliards d'opérations`}</div>
      <Callout type="key" title="Pourquoi c'est parfait pour un GPU">
        Les M×N cases du résultat sont <b>toutes indépendantes</b>. On peut donner chaque case (ou chaque petit groupe de cases) à un ouvrier différent : des millions de
        calculs en parallèle. De plus, chaque nombre des matrices d'entrée est <b>réutilisé</b> de nombreuses fois (une valeur de W sert pour toutes les colonnes de X), ce qui
        permettra d'économiser les accès mémoire (chapitre 6).
      </Callout>

      <h2>Mesurer la quantité de calcul</h2>
      <Def term="FLOP et FLOPS" en="Floating-Point Operation(s) per Second">
        Un <b>FLOP</b> est une opération (addition ou multiplication) sur des nombres à virgule (« flottants »). Les <b>FLOPS</b> (avec un S majuscule, « par seconde ») mesurent
        la vitesse d'un processeur. Préfixes : giga (G) = 10⁹, téra (T) = 10¹², péta (P) = 10¹⁵. Un CPU de bureau fait de l'ordre de 1 TFLOPS ; une H100 près de 1 000 TFLOPS
        sur des matrices en 16 bits.
      </Def>
      <Callout type="tip" title="Règle pratique pour les réseaux de neurones">
        Faire passer <b>un</b> élément (un token, une image) dans un réseau de P paramètres coûte environ <b>2 × P opérations</b> (une multiplication et une addition par
        poids). Un modèle de langage de 8 milliards de paramètres coûte donc ≈ 16 milliards d'opérations par token généré.
      </Callout>
    </>
  )
}
