import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import MatmulSim from '../sims/MatmulSim.jsx'

export const quiz = [
  {
    q: 'Pourquoi découpe-t-on les matrices en tuiles ?',
    options: [
      'Pour que chaque donnée chargée depuis la HBM soit réutilisée de nombreuses fois depuis la mémoire partagée',
      'Pour utiliser moins de threads',
      'Pour que le résultat soit plus précis',
      'Parce que les Tensor Cores ne savent pas lire la HBM',
    ],
    answer: 0,
    explain: 'Avec des tuiles de taille T, le nombre de lectures en HBM est divisé par environ T.',
  },
  {
    q: 'Avec des tuiles 4×4 au lieu d\'un calcul naïf, par combien divise-t-on les lectures en mémoire globale ?',
    options: ['2', '4', '16', 'On ne les divise pas'],
    answer: 1,
    explain: 'Chaque valeur chargée est réutilisée T = 4 fois (par les 4 threads d\'une ligne ou d\'une colonne de la tuile).',
  },
  {
    q: 'Qu\'est-ce qui limite la taille des tuiles ?',
    options: ['La vitesse du PCIe', 'La taille de la mémoire partagée et du banc de registres de chaque SM', 'Le nombre de GPC', 'Le système d\'exploitation'],
    answer: 1,
    explain: 'Les tuiles doivent tenir dans la mémoire partagée (≤ 228 Ko par SM sur H100) et les accumulateurs dans les registres.',
  },
  {
    q: 'Où sont accumulées les sommes partielles pendant un produit matriciel ?',
    options: ['Dans la HBM', 'Dans le cache L2', 'Dans les registres des threads', 'Dans la RAM du CPU'],
    answer: 2,
    explain: 'Les accumulateurs restent dans les registres (la mémoire la plus rapide) jusqu\'à la fin, puis sont écrits une seule fois.',
  },
  {
    q: 'Qu\'apporte un Tensor Core par rapport à un cœur CUDA ?',
    options: [
      'Il calcule en FP64',
      'Il effectue un petit produit de matrices entier (des centaines de FMA) en une seule instruction',
      'Il gère la mémoire partagée',
      'Il remplace le CPU',
    ],
    answer: 1,
    explain: 'Un cœur CUDA fait 1 FMA par cycle ; un Tensor Core de H100 fait l\'équivalent de plusieurs centaines de FMA par cycle en BF16.',
  },
]

export default function Ch06() {
  return (
    <>
      <Objectives
        items={[
          'Pourquoi le produit matriciel (GEMM) est l\'opération la plus importante de l\'inférence',
          'Comment un produit naïf gaspille la bande passante',
          'Le tuilage (tiling) et le rôle de la mémoire partagée et des registres',
          'Le fonctionnement des Tensor Cores',
        ]}
      />
      <Def term="GEMM" en="GEneral Matrix Multiply">
        Nom standard du produit matrice × matrice (C = A × B, éventuellement + C). Dans l'inférence d'un réseau de neurones, 80 à 95 % du temps de calcul est passé dans des GEMM.
        Des bibliothèques comme <b>cuBLAS</b> et <b>CUTLASS</b> (NVIDIA) fournissent des GEMM hyper-optimisés pour chaque GPU.
      </Def>

      <h2>La version naïve</h2>
      <p>
        L'idée la plus simple : un thread par case de C. Chaque thread lit une ligne de A et une colonne de B depuis la HBM, fait K multiplications-additions, et écrit son
        résultat. Problème : la même ligne de A est lue par tous les threads de la même ligne de C, et la même colonne de B par tous ceux de la même colonne. Pour des matrices
        N×N, on lit <b>2 × N³</b> valeurs au lieu de 2 × N². L'intensité arithmétique est d'environ 0,5 FLOP/octet : désastreux.
      </p>

      <h2>Le tuilage</h2>
      <p>
        On découpe C en <b>tuiles</b> et on confie chaque tuile à un <b>bloc de threads</b>. Le bloc parcourt la dimension K par étapes (phases). À chaque phase :
      </p>
      <ol>
        <li>Les threads du bloc copient <b>ensemble</b> une tuile de A et une tuile de B depuis la HBM vers la <b>mémoire partagée</b> (accès coalescés).</li>
        <li>Ils se <b>synchronisent</b> (barrière) pour s'assurer que les tuiles sont complètes.</li>
        <li>Chaque thread fait ses multiplications-additions en lisant la mémoire partagée, et accumule dans ses <b>registres</b>.</li>
        <li>Nouvelle synchronisation, puis phase suivante.</li>
      </ol>
      <p>À la fin, chaque thread écrit sa case de C en HBM, une seule fois.</p>
      <Card title="Produit matriciel tuilé, pas à pas" sub="Matrices 8×8. Comparez le nombre de lectures en HBM selon la taille des tuiles." sim>
        <MatmulSim />
      </Card>

      <h3>Les raffinements des vrais kernels</h3>
      <Def term="Tuilage à plusieurs niveaux" en="Hierarchical tiling">
        On tuile à chaque niveau de la hiérarchie : tuiles de bloc en mémoire partagée (ex. 128×256), tuiles de warp, puis fragments en registres pour les Tensor Cores. Chaque
        niveau maximise la réutilisation au niveau de mémoire correspondant.
      </Def>
      <Def term="Pipeline logiciel / double tampon" en="Software pipelining / double buffering">
        Pendant que les Tensor Cores calculent sur les tuiles de la phase k, le <b>TMA</b> (ou des copies asynchrones) charge déjà les tuiles de la phase k+1 dans un second
        tampon de mémoire partagée. Calcul et transfert se recouvrent : les unités de calcul n'attendent plus.
      </Def>
      <Def term="Épilogue" en="Epilogue">
        La fin du kernel GEMM, où l'on applique aux accumulateurs (encore dans les registres) les opérations suivantes : ajout du biais, fonction d'activation, conversion de
        précision, addition résiduelle… avant l'unique écriture en HBM. C'est la forme la plus courante de <b>fusion</b>.
      </Def>

      <h2>Les Tensor Cores</h2>
      <p>
        Même avec un tuilage parfait, faire les FMA une par une avec les cœurs CUDA plafonne à ≈ 67 TFLOPS sur H100. Les <b>Tensor Cores</b> changent d'échelle : ils calculent
        directement <b>D = A × B + C</b> sur de petites matrices (par exemple 16×8×16 par instruction pour un warp), en précision réduite.
      </p>
      <Callout type="analogy" title="Analogie">
        Un cœur CUDA est un ouvrier qui visse un boulon à la fois. Un Tensor Core est une machine qui assemble un panneau entier d'un seul coup. Mais il faut lui apporter le
        panneau complet, bien rangé : d'où l'importance de la mémoire partagée et des registres.
      </Callout>
      <Def term="Instruction MMA / WGMMA" en="Matrix Multiply-Accumulate">
        Instruction qui demande aux Tensor Cores un produit de matrices. Sur Ampere (A100), elle est émise par un warp (<code>mma.sync</code>) ; sur Hopper (H100), par un groupe
        de 4 warps (« warpgroup », <code>wgmma</code>), qui peut lire ses opérandes directement en mémoire partagée, de façon asynchrone.
      </Def>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Unité (H100 SXM)</th><th>Format</th><th>Débit crête</th></tr></thead>
          <tbody>
            <tr><td>Cœurs CUDA</td><td>FP32</td><td>≈ 67 TFLOPS</td></tr>
            <tr><td>Tensor Cores</td><td>TF32</td><td>≈ 495 TFLOPS</td></tr>
            <tr><td>Tensor Cores</td><td>BF16 / FP16</td><td>≈ 990 TFLOPS</td></tr>
            <tr><td>Tensor Cores</td><td>FP8 / INT8</td><td>≈ 1 980 TFLOPS (ou TOPS)</td></tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Valeurs « denses » (sans l'astuce de parcimonie structurée qui les double en théorie).</p>
      <Callout type="tip" title="À retenir">
        <ul style={{ margin: 0 }}>
          <li>L'inférence = surtout des GEMM. Les optimiser, c'est optimiser l'inférence.</li>
          <li>Tuilage : charger une fois en mémoire partagée, réutiliser beaucoup, accumuler dans les registres.</li>
          <li>Les Tensor Cores fournissent ~15× la puissance des cœurs CUDA, à condition d'utiliser une précision réduite (chapitre suivant).</li>
        </ul>
      </Callout>
    </>
  )
}
