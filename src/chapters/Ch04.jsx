import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import { ThreadIndexSim, BlockSchedulerSim, WarpDivergenceSim } from '../sims/ExecutionSims.jsx'

export const quiz = [
  {
    q: 'Qu\'est-ce qu\'un kernel ?',
    options: ['Le noyau du système d\'exploitation', 'Une fonction exécutée sur le GPU par des milliers de threads en parallèle', 'Un composant matériel du SM', 'Un fichier de poids'],
    answer: 1,
    explain: 'Un kernel est un programme GPU. Le CPU le lance en précisant combien de threads doivent l\'exécuter (la grille).',
  },
  {
    q: 'Combien de threads contient un warp sur un GPU NVIDIA ?',
    options: ['8', '16', '32', '1024'],
    answer: 2,
    explain: 'Un warp regroupe 32 threads qui exécutent la même instruction en même temps (modèle SIMT).',
  },
  {
    q: 'Un bloc de threads est exécuté…',
    options: ['Sur plusieurs SM à la fois', 'Entièrement sur un seul SM', 'Sur le CPU', 'Dans la HBM'],
    answer: 1,
    explain: 'Un bloc est attribué à un SM et y reste jusqu\'à la fin : c\'est ce qui permet à ses threads de partager la mémoire partagée de ce SM.',
  },
  {
    q: 'Pourquoi le GPU a-t-il intérêt à avoir beaucoup de warps actifs sur chaque SM ?',
    options: [
      'Pour consommer moins d\'énergie',
      'Pour masquer la latence mémoire : quand un warp attend ses données, un autre peut calculer',
      'Pour réduire la taille du programme',
      'Ça n\'a aucun intérêt',
    ],
    answer: 1,
    explain: 'C\'est le principe du masquage de latence. L\'occupation (occupancy) mesure combien de warps sont actifs par rapport au maximum possible.',
  },
  {
    q: 'Dans un warp, la moitié des threads prend la branche « if » et l\'autre la branche « else ». Que se passe-t-il ?',
    options: ['Les deux branches s\'exécutent en même temps', 'Les deux branches s\'exécutent l\'une après l\'autre, avec une partie des threads inactive à chaque fois', 'Le programme plante', 'Le GPU choisit une seule branche'],
    answer: 1,
    explain: 'C\'est la divergence de warp : elle divise l\'efficacité. Les kernels d\'inférence évitent donc les branches.',
  },
]

export default function Ch04() {
  return (
    <>
      <Objectives
        items={[
          'Comment un programme GPU (kernel) est lancé par le CPU',
          'La hiérarchie threads → warps → blocs → grille',
          'Comment les blocs sont répartis sur les SM',
          'Le masquage de latence, l\'occupation et la divergence',
        ]}
      />

      <h2>Le CPU commande, le GPU exécute</h2>
      <p>
        Un programme d'inférence (par exemple en Python avec PyTorch) tourne sur le CPU. À chaque opération lourde, il demande au GPU d'exécuter un <b>kernel</b>. Le CPU n'attend
        pas la fin : il empile les kernels dans une file d'attente et le GPU les exécute dans l'ordre.
      </p>
      <Def term="Kernel" en="Kernel">
        Une fonction écrite pour le GPU (en CUDA, Triton, etc.) et exécutée par un très grand nombre de threads en parallèle. Chaque thread exécute le <b>même code</b> mais sur
        des <b>données différentes</b>, repérées grâce à son numéro. Un modèle de langage déclenche des centaines de kernels pour produire un seul token : un par produit
        matriciel, par normalisation, par attention…
      </Def>
      <Def term="Driver et runtime CUDA" en="CUDA driver / runtime">
        Logiciels côté CPU qui traduisent les demandes du programme en commandes pour le GPU : allocation de mémoire, copies, lancements de kernels. Chaque lancement coûte
        quelques microsecondes de travail côté CPU.
      </Def>
      <Def term="Stream" en="CUDA stream">
        Une file d'attente de commandes pour le GPU. Les commandes d'un même stream s'exécutent dans l'ordre ; des streams différents peuvent s'exécuter en parallèle (par
        exemple, une copie pendant un calcul).
      </Def>
      <Def term="CUDA Graph" en="CUDA Graphs">
        Un enregistrement d'une séquence entière de kernels, que l'on peut rejouer en une seule commande. Très utilisé pour la génération de texte, où chaque token demande des
        centaines de petits kernels : on évite ainsi que le CPU devienne le goulot d'étranglement.
      </Def>

      <h2>Threads, warps, blocs et grille</h2>
      <Def term="Thread" en="Thread — fil d'exécution">
        La plus petite unité de travail : une instance du kernel, avec ses propres registres et son propre numéro. Un thread calcule typiquement un ou quelques éléments du
        résultat.
      </Def>
      <Def term="Warp" en="Warp">
        Un groupe de <b>32 threads</b> consécutifs qui avancent ensemble, instruction par instruction : c'est l'unité réellement ordonnancée par le matériel. On appelle ce
        modèle <b>SIMT</b> (Single Instruction, Multiple Threads : une instruction, plusieurs threads).
      </Def>
      <Def term="Bloc de threads" en="Thread block / CTA">
        Un groupe de threads (jusqu'à 1 024) qui s'exécute sur <b>un seul SM</b>. Les threads d'un bloc peuvent coopérer : partager des données via la <b>mémoire partagée</b> et
        s'attendre mutuellement (<b>synchronisation</b>). Un bloc de 256 threads contient 8 warps.
      </Def>
      <Def term="Grille" en="Grid">
        L'ensemble des blocs lancés pour un kernel. Pour un produit matriciel, chaque bloc s'occupe typiquement d'une <b>tuile</b> du résultat (par exemple 128×128 cases), et la
        grille couvre toute la matrice.
      </Def>
      <Card title="Comment un thread sait sur quoi travailler" sub="Survolez ou touchez une case : chaque couleur est un bloc." sim>
        <ThreadIndexSim />
      </Card>
      <pre><code>{`// Un kernel CUDA qui applique ReLU à un vecteur de n éléments
__global__ void relu(const float* x, float* y, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;  // mon indice global
    if (i < n) y[i] = fmaxf(x[i], 0.0f);            // mon travail
}
// Lancement depuis le CPU : ceil(n/256) blocs de 256 threads
relu<<<(n + 255) / 256, 256>>>(x, y, n);`}</code></pre>

      <h2>Répartition des blocs sur les SM</h2>
      <p>
        Au lancement d'un kernel, l'<b>ordonnanceur global (GigaThread Engine)</b> place autant de blocs que possible sur les SM. Le nombre de blocs qu'un SM peut accueillir en
        même temps dépend de leurs besoins en registres et en mémoire partagée. Dès qu'un bloc se termine, un nouveau prend sa place.
      </p>
      <Card title="Ordonnancement des blocs par vagues" sub="Faites varier le nombre de SM et de blocs, puis lancez le kernel." sim>
        <BlockSchedulerSim />
      </Card>

      <h2>Masquer la latence : le secret du GPU</h2>
      <p>
        Lire une donnée en HBM prend plusieurs centaines de cycles. Un CPU combat cette attente avec de gros caches et de la prédiction. Le GPU, lui, adopte une autre stratégie :
        il garde <b>beaucoup de warps en vol</b> sur chaque SM (jusqu'à 64 sur H100, soit 2 048 threads). Quand un warp attend la mémoire, l'ordonnanceur de warps passe
        instantanément à un autre warp prêt, <b>sans aucun coût de changement</b>, car tous les warps ont leurs registres en permanence dans le banc de registres.
      </p>
      <Callout type="analogy" title="Analogie">
        Un cuisinier qui lance 20 plats en parallèle : pendant que l'eau d'un plat chauffe, il coupe les légumes d'un autre. Il n'attend jamais les bras croisés, à condition
        d'avoir assez de plats en cours.
      </Callout>
      <Def term="Occupation" en="Occupancy">
        Le rapport entre le nombre de warps actifs sur un SM et le maximum possible. Une occupation élevée aide à masquer la latence. Elle est limitée par les ressources :
        si chaque thread utilise beaucoup de registres, ou chaque bloc beaucoup de mémoire partagée, moins de warps tiennent sur le SM. Les kernels de produit matriciel
        modernes acceptent souvent une occupation faible, compensée par des chargements asynchrones (TMA) bien planifiés.
      </Def>

      <h2>La divergence de warp</h2>
      <Card title="Que se passe-t-il quand les threads d'un warp ne sont pas d'accord ?" sim>
        <WarpDivergenceSim />
      </Card>
      <Def term="Accès coalescés" en="Memory coalescing">
        Quand les 32 threads d'un warp lisent 32 cases <b>consécutives</b> de la mémoire, le matériel regroupe ces lectures en une seule grosse transaction. S'ils lisent des
        adresses éparpillées, il faut de nombreuses transactions : le débit s'effondre. L'organisation des tenseurs en mémoire (le « layout ») est donc cruciale.
      </Def>

      <Callout type="tip" title="À retenir">
        <ul style={{ margin: 0 }}>
          <li>Kernel = programme GPU ; grille → blocs → warps (32 threads) → threads.</li>
          <li>Un bloc vit sur un seul SM et partage sa mémoire partagée ; le GigaThread Engine répartit les blocs.</li>
          <li>Le GPU masque la latence mémoire en alternant entre de nombreux warps.</li>
          <li>Pour être efficace : pas de divergence, des accès mémoire consécutifs, assez de blocs pour occuper tous les SM.</li>
        </ul>
      </Callout>
    </>
  )
}
