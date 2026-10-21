import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import { MemoryHierarchy, RooflineSim } from '../sims/MemorySims.jsx'

export const quiz = [
  {
    q: 'Qu\'est-ce que l\'intensité arithmétique d\'une opération ?',
    options: ['Sa durée', 'Le nombre d\'opérations effectuées par octet lu ou écrit en mémoire', 'Le nombre de threads utilisés', 'La fréquence du GPU'],
    answer: 1,
    explain: 'Intensité = FLOP / octets. Faible : on passe son temps à attendre la mémoire. Élevée : on est limité par la puissance de calcul.',
  },
  {
    q: 'Une opération ReLU appliquée élément par élément est généralement…',
    options: ['Limitée par le calcul', 'Limitée par la bande passante mémoire', 'Limitée par le PCIe', 'Gratuite'],
    answer: 1,
    explain: 'Une seule opération par nombre lu et écrit : intensité ≈ 0,25 FLOP/octet, très en dessous du point d\'équilibre (~300 sur H100).',
  },
  {
    q: 'Comment augmenter l\'intensité arithmétique d\'une couche dense ?',
    options: ['Utiliser moins de SM', 'Traiter plusieurs entrées à la fois (augmenter la taille du lot)', 'Augmenter la fréquence d\'horloge', 'Utiliser le CPU'],
    answer: 1,
    explain: 'Chaque poids lu sert alors à autant de calculs qu\'il y a d\'entrées dans le lot.',
  },
  {
    q: 'Sur une H100, le point d\'équilibre est d\'environ 300 FLOP/octet. Qu\'est-ce que cela signifie ?',
    options: [
      'Le GPU fait 300 opérations par seconde',
      'Il faut faire environ 300 opérations par octet chargé pour que le calcul, et non la mémoire, devienne le facteur limitant',
      'La mémoire fait 300 Go',
      'Le GPU a 300 SM',
    ],
    answer: 1,
    explain: '989 TFLOPS ÷ 3,35 To/s ≈ 295. En dessous, la mémoire limite ; au-dessus, le calcul limite.',
  },
  {
    q: 'Qu\'est-ce que la fusion de kernels ?',
    options: [
      'Combiner plusieurs opérations dans un même kernel pour éviter d\'écrire puis relire les résultats intermédiaires en HBM',
      'Faire tourner deux GPU ensemble',
      'Compresser les poids',
      'Assembler deux SM',
    ],
    answer: 0,
    explain: 'Par exemple, ajouter le biais et appliquer ReLU directement dans l\'épilogue du produit matriciel, pendant que les résultats sont encore dans les registres.',
  },
]

export default function Ch05() {
  return (
    <>
      <Objectives
        items={[
          'La hiérarchie mémoire du GPU et ses ordres de grandeur',
          'Les notions de bande passante et de latence mémoire',
          'Le modèle « roofline » : une opération est-elle limitée par le calcul ou par la mémoire ?',
          'Pourquoi réutiliser les données est la clé de la performance',
        ]}
      />

      <h2>Le vrai problème : alimenter les unités de calcul</h2>
      <p>
        Une H100 peut faire près de 10¹⁵ opérations par seconde. Mais pour calculer, il faut des données. Si chaque opération nécessitait de lire un nouveau nombre de 2 octets
        en HBM, il faudrait une bande passante de 2 000 To/s. La HBM n'en fournit que 3,35 To/s, soit <b>600 fois moins</b>. Tout l'art de la programmation GPU consiste à
        <b> réutiliser au maximum chaque donnée chargée</b>.
      </p>
      <Def term="Bande passante mémoire" en="Memory bandwidth">
        Quantité de données que l'on peut transférer par seconde entre une mémoire et les unités de calcul (en Go/s ou To/s). C'est la « largeur de l'autoroute ».
      </Def>
      <Def term="Latence mémoire" en="Memory latency">
        Temps entre la demande d'une donnée et son arrivée (en cycles ou en nanosecondes). C'est la « longueur de l'autoroute ». Le GPU la masque en alternant entre warps
        (chapitre 4) ; la bande passante, elle, est une limite physique.
      </Def>

      <h2>La hiérarchie mémoire</h2>
      <p>
        Plus une mémoire est proche des unités de calcul, plus elle est rapide… et petite. C'est un compromis physique : la mémoire rapide (SRAM, sur la puce) prend beaucoup de
        place et coûte cher ; la mémoire dense (DRAM, comme la HBM) est plus lente.
      </p>
      <Card title="De la plus rapide à la plus lente">
        <MemoryHierarchy />
      </Card>
      <Def term="SRAM et DRAM" en="Static / Dynamic RAM">
        La <b>SRAM</b> stocke chaque bit dans un petit circuit de 6 transistors : très rapide, mais encombrante. Elle forme les registres, la mémoire partagée et les caches. La
        <b> DRAM</b> stocke chaque bit dans un minuscule condensateur : très dense, mais plus lente, et doit être rafraîchie. La HBM et la GDDR sont des DRAM.
      </Def>
      <Def term="Cache" en="Cache">
        Mémoire rapide qui conserve automatiquement une copie des données récemment utilisées. Si la donnée demandée s'y trouve (« hit »), on évite un accès lent ; sinon
        (« miss »), il faut aller la chercher plus loin. Le L1 et le L2 sont des caches ; la mémoire partagée, elle, est gérée explicitement par le programmeur.
      </Def>

      <h2>Limité par le calcul ou par la mémoire ?</h2>
      <Def term="Intensité arithmétique" en="Arithmetic intensity">
        Nombre d'opérations effectuées pour chaque octet échangé avec la mémoire principale (FLOP/octet). C'est LA caractéristique qui détermine la vitesse d'une opération sur GPU.
      </Def>
      <Def term="Modèle roofline" en="Roofline model">
        Graphique qui montre la performance maximale atteignable en fonction de l'intensité arithmétique. À gauche, la performance est limitée par la mémoire (performance =
        intensité × bande passante) ; à droite, elle plafonne au pic de calcul. Le point de jonction est le <b>point d'équilibre</b> (ridge point) : ≈ 295 FLOP/octet pour une
        H100 en BF16.
      </Def>
      <Card title="Explorer le modèle roofline" sub="Choisissez une opération et faites varier la taille du lot." sim>
        <RooflineSim />
      </Card>
      <Callout type="key" title="La conséquence la plus importante du cours">
        <p>
          Une couche dense appliquée à <b>une seule entrée</b> (produit matrice × vecteur) a une intensité d'environ <b>1 FLOP/octet</b> : chaque poids chargé (2 octets) ne sert
          qu'à une multiplication et une addition. Le GPU utilise alors <b>moins de 1 %</b> de sa puissance de calcul : il passe son temps à attendre la mémoire.
        </p>
        <p>
          C'est exactement la situation de la génération de texte token par token dans un modèle de langage (chapitre 11). D'où l'importance du traitement par lots
          (<i>batching</i>) et de la réduction de la taille des poids (quantification) — chapitre 12.
        </p>
      </Callout>

      <h2>Deux stratégies pour économiser la mémoire</h2>
      <Def term="Réutilisation et tuilage" en="Data reuse & tiling">
        Charger un morceau de données (une <b>tuile</b>) une seule fois dans la mémoire partagée, puis le réutiliser de nombreuses fois depuis cette mémoire rapide. C'est le sujet
        du chapitre suivant.
      </Def>
      <Def term="Fusion de kernels" en="Kernel fusion">
        Regrouper plusieurs opérations successives dans un seul kernel. Sans fusion : le produit matriciel écrit son résultat en HBM, puis un kernel « biais » le relit et
        l'écrit, puis un kernel « ReLU » le relit et l'écrit encore. Avec fusion : biais et ReLU sont appliqués dans les registres, juste avant l'unique écriture. Les compilateurs
        comme <code>torch.compile</code>, TensorRT ou XLA font cela automatiquement.
      </Def>
    </>
  )
}
