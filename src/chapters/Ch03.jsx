import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import GpuDiagram from '../sims/GpuDiagram.jsx'
import { GPU_COMPONENTS, CATEGORIES } from '../data/gpuComponents.js'

export const quiz = [
  {
    q: 'Quelle est l\'unité de base qui exécute les calculs dans un GPU NVIDIA, équivalente à un « cœur » de CPU ?',
    options: ['Le GPC', 'Le SM (Streaming Multiprocessor)', 'Le contrôleur mémoire', 'Le cache L2'],
    answer: 1,
    explain: 'Le SM contient ses propres unités de calcul, registres, mémoire partagée et ordonnanceurs. Une H100 en compte 132.',
  },
  {
    q: 'Quel composant réalise l\'essentiel des calculs lors de l\'inférence d\'un réseau de neurones moderne ?',
    options: ['Les SFU', 'Les RT cores', 'Les Tensor Cores', 'Les moteurs de copie'],
    answer: 2,
    explain: 'Les Tensor Cores multiplient de petites matrices en une instruction ; ils fournissent l\'essentiel de la puissance (≈ 990 TFLOPS en BF16 sur H100, contre ≈ 67 pour les cœurs CUDA en FP32).',
  },
  {
    q: 'Où sont stockés les poids du modèle pendant l\'inférence ?',
    options: ['Dans les registres', 'Dans le cache L2', 'Dans la HBM (VRAM)', 'Dans la RAM du CPU'],
    answer: 2,
    explain: 'La HBM est la grande mémoire du GPU (80 Go sur H100). Les poids y sont chargés une fois, puis relus à chaque inférence.',
  },
  {
    q: 'Quel composant calcule rapidement les exponentielles du softmax ?',
    options: ['Les SFU (Special Function Units)', 'Les unités LD/ST', 'Le GigaThread Engine', 'Le PCIe'],
    answer: 0,
    explain: 'Les SFU calculent en matériel les fonctions « spéciales » : exp, log, sin, cos, racine carrée inverse.',
  },
  {
    q: 'Quel est le rôle de l\'ordonnanceur de warps ?',
    options: [
      'Copier les données du CPU vers le GPU',
      'Choisir à chaque cycle un groupe de 32 threads prêt et lui faire exécuter une instruction',
      'Répartir les blocs entre les SM',
      'Stocker les instructions',
    ],
    answer: 1,
    explain: 'En basculant sur un warp prêt dès qu\'un autre attend la mémoire, il garde les unités de calcul occupées. La répartition des blocs entre SM, c\'est le rôle de l\'ordonnanceur global (GigaThread).',
  },
  {
    q: 'Quelle mémoire est la plus rapide ?',
    options: ['HBM', 'Cache L2', 'Mémoire partagée', 'Registres'],
    answer: 3,
    explain: 'Ordre du plus rapide au plus lent : registres, mémoire partagée/L1, L2, HBM, puis RAM du CPU via PCIe.',
  },
]

const ORDER = ['host', 'link', 'sched', 'struct', 'compute', 'memory']

export default function Ch03() {
  return (
    <>
      <Objectives
        items={[
          'La structure hiérarchique d\'un GPU : puce → GPC → SM → unités de calcul',
          'La définition précise de chaque composant',
          'Le rôle de chaque composant dans l\'inférence d\'un réseau de neurones',
          'Les ordres de grandeur d\'un GPU moderne (NVIDIA H100)',
        ]}
      />
      <p>
        Nous prenons comme exemple la <b>NVIDIA H100</b> (architecture « Hopper », 2022), très utilisée dans les centres de données pour faire tourner les grands modèles de
        langage. Les GPU AMD, Intel ou Apple suivent les mêmes principes avec d'autres noms ; les équivalents sont indiqués au fil du texte.
      </p>

      <h2>Vue d'ensemble : une ville organisée</h2>
      <Callout type="analogy" title="Analogie : le GPU comme une ville industrielle">
        <ul style={{ margin: 0 }}>
          <li>Le <b>CPU</b> est le client qui passe commande ; le <b>PCIe</b> est l'autoroute qui mène à la ville.</li>
          <li>Le <b>GigaThread Engine</b> est la mairie qui distribue les chantiers aux usines.</li>
          <li>Les <b>SM</b> sont les usines (132), regroupées en quartiers (<b>GPC</b>).</li>
          <li>Dans chaque usine : des <b>contremaîtres</b> (ordonnanceurs de warps), des <b>ouvriers</b> (cœurs CUDA), des <b>machines spécialisées</b> (Tensor Cores, SFU), des
            <b> établis</b> (registres) et un <b>petit entrepôt local</b> (mémoire partagée).</li>
          <li>Le <b>cache L2</b> est l'entrepôt central de la ville ; la <b>HBM</b> est l'immense zone de stockage en périphérie, reliée par de larges routes.</li>
        </ul>
      </Callout>

      <Card title="Schéma interactif d'un GPU" sub="Cliquez sur chaque élément pour obtenir sa définition et son rôle. Cliquez sur un petit carré (SM) pour zoomer dedans." sim>
        <GpuDiagram />
      </Card>
      <Callout type="info" title="Lire le schéma">
        Le schéma est simplifié : la vraie puce GH100 contient 144 SM, dont 132 sont activés sur la H100 SXM (les autres sont désactivés pour compenser les défauts de fabrication).
        Les 5 piles de HBM sont en réalité disposées de part et d'autre de la puce, sur le même support (« interposeur »).
      </Callout>

      <h2>Hiérarchie de la puce</h2>
      <div className="formula">
        {`GPU H100
 ├─ 8 GPC (grappes)
 │   └─ ~9 TPC chacune
 │       └─ 2 SM chacun  → 132 SM au total
 │           └─ 4 quarts de SM (« partitions ») chacun
 │               ├─ 1 ordonnanceur de warps + dispatch
 │               ├─ banc de registres (64 Ko)
 │               ├─ 32 unités FP32, 16 INT32, 16 FP64
 │               ├─ 1 Tensor Core
 │               ├─ 8 unités LD/ST, 4 SFU
 │           └─ + mémoire partagée/L1 (256 Ko) et TMA, communs au SM
 ├─ Cache L2 (50 Mo), partagé
 ├─ 10 contrôleurs mémoire → 5 piles HBM3 (80 Go, 3,35 To/s)
 ├─ Interface PCIe Gen5, moteurs de copie
 └─ 18 liens NVLink 4 (900 Go/s)`}
      </div>

      <h2>Chaque composant en détail</h2>
      <p>Voici la définition de chaque composant, regroupés par famille, avec le rôle précis qu'il joue quand on fait tourner un réseau de neurones.</p>
      {ORDER.map((cat) => (
        <div key={cat}>
          <h3 style={{ color: CATEGORIES[cat].color }}>{CATEGORIES[cat].label}</h3>
          {GPU_COMPONENTS.filter((c) => c.cat === cat).map((c) => (
            <Def key={c.id} id={`comp-${c.id}`} term={c.name} en={c.en} role={c.role}>
              <p><i>{c.short}</i></p>
              <p>{c.detail}</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>📏 {c.example}</p>
            </Def>
          ))}
        </div>
      ))}

      <h2>GPU de centre de données vs GPU grand public</h2>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Caractéristique</th><th>H100 SXM (centre de données)</th><th>RTX 4090 (grand public)</th></tr></thead>
          <tbody>
            <tr><td>Nombre de SM</td><td>132</td><td>128</td></tr>
            <tr><td>Mémoire</td><td>80 Go HBM3</td><td>24 Go GDDR6X</td></tr>
            <tr><td>Bande passante mémoire</td><td>3,35 To/s</td><td>≈ 1 To/s</td></tr>
            <tr><td>Tensor Cores, BF16/FP16 dense</td><td>≈ 990 TFLOPS</td><td>≈ 165 TFLOPS</td></tr>
            <tr><td>Cache L2</td><td>50 Mo</td><td>72 Mo</td></tr>
            <tr><td>Liaison multi-GPU</td><td>NVLink 900 Go/s</td><td>PCIe uniquement</td></tr>
            <tr><td>Unités graphiques (RT cores…)</td><td>Quasiment absentes</td><td>Oui</td></tr>
            <tr><td>Consommation</td><td>jusqu'à 700 W</td><td>450 W</td></tr>
          </tbody>
        </table>
      </div>
      <Callout type="tip" title="Ce qui compte le plus pour l'inférence">
        Pour faire tourner un grand modèle de langage, les trois chiffres essentiels sont : la <b>capacité mémoire</b> (le modèle tient-il ?), la <b>bande passante
        mémoire</b> (à quelle vitesse peut-on relire les poids ?) et la <b>puissance des Tensor Cores</b> (à quelle vitesse peut-on multiplier ?). Nous verrons au chapitre 11
        que la bande passante est souvent le facteur décisif.
      </Callout>

      <h2>Équivalences chez les autres fabricants</h2>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>NVIDIA</th><th>AMD</th><th>Apple</th></tr></thead>
          <tbody>
            <tr><td>SM (Streaming Multiprocessor)</td><td>CU (Compute Unit)</td><td>Cœur GPU</td></tr>
            <tr><td>Warp (32 threads)</td><td>Wavefront (64 ou 32 threads)</td><td>SIMD-group (32 threads)</td></tr>
            <tr><td>Tensor Core</td><td>Matrix Core</td><td>(unités matricielles / Neural Engine séparé)</td></tr>
            <tr><td>Mémoire partagée</td><td>LDS (Local Data Share)</td><td>Threadgroup memory</td></tr>
            <tr><td>HBM / GDDR</td><td>HBM / GDDR</td><td>Mémoire unifiée partagée avec le CPU</td></tr>
            <tr><td>CUDA</td><td>ROCm / HIP</td><td>Metal</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
