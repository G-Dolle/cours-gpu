import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import DenseInferenceSim from '../sims/DenseInferenceSim.jsx'

export const quiz = [
  {
    q: 'Combien de fois les poids du modèle sont-ils copiés du CPU vers le GPU ?',
    options: ['À chaque inférence', 'Une seule fois, au chargement du modèle', 'À chaque couche', 'Jamais, le GPU lit le disque directement'],
    answer: 1,
    explain: 'Les poids restent dans la HBM. Seules les entrées et sorties (petites) traversent le PCIe à chaque requête.',
  },
  {
    q: 'Qui distribue les blocs de threads d\'un kernel aux SM ?',
    options: ['Le CPU directement', 'L\'ordonnanceur global (GigaThread Engine)', 'Les Tensor Cores', 'Le cache L2'],
    answer: 1,
    explain: 'Le CPU lance le kernel ; le GigaThread Engine du GPU répartit ses blocs sur les SM disponibles.',
  },
  {
    q: 'Pourquoi applique-t-on la ReLU dans l\'« épilogue » du produit matriciel ?',
    options: [
      'Parce que les Tensor Cores ne savent pas faire de ReLU',
      'Pour éviter d\'écrire le résultat en HBM puis de le relire dans un autre kernel',
      'Pour que le résultat soit plus précis',
      'C\'est obligatoire en CUDA',
    ],
    answer: 1,
    explain: 'C\'est la fusion : les résultats sont encore dans les registres, on applique la ReLU gratuitement avant l\'unique écriture.',
  },
  {
    q: 'Quels composants interviennent dans le calcul du softmax ?',
    options: ['Uniquement le PCIe', 'Les SFU (exponentielles) et la mémoire partagée (réductions : max et somme)', 'Uniquement les Tensor Cores', 'Le moteur de copie'],
    answer: 1,
    explain: 'Softmax = max (réduction), exp (SFU), somme (réduction), division (cœurs CUDA).',
  },
  {
    q: 'Pour un petit réseau et une seule entrée, qu\'est-ce qui domine souvent le temps total ?',
    options: [
      'Les multiplications dans les Tensor Cores',
      'Les coûts fixes : lancements de kernels, transferts PCIe, synchronisations',
      'Le softmax',
      'La ReLU',
    ],
    answer: 1,
    explain: 'Quelques microsecondes par lancement et par transfert, c\'est plus long que le calcul lui-même quand il est minuscule. D\'où l\'intérêt des lots et des CUDA Graphs.',
  },
]

export default function Ch09() {
  return (
    <>
      <Objectives
        items={[
          'Le déroulement complet d\'une inférence, du CPU au GPU et retour',
          'Quel composant du GPU intervient à chaque étape, et pourquoi',
          'Où se trouvent les données (disque, RAM, HBM, L2, mémoire partagée, registres) à chaque instant',
          'Les coûts cachés : transferts, lancements, synchronisations',
        ]}
      />
      <p>
        Nous allons suivre, étape par étape, l'inférence d'un tout petit réseau dense qui reconnaît un fruit à partir de 4 caractéristiques (rougeur, jaunissement, longueur,
        rondeur). Il a une couche cachée de 3 neurones (ReLU) et une couche de sortie de 2 neurones (softmax). Les nombres affichés sont les <b>vrais</b> calculs.
      </p>
      <Card title="Inférence d'un réseau dense, étape par étape" sub="Utilisez « Suivant » ou la lecture automatique. Le schéma du GPU montre les composants actifs." sim>
        <DenseInferenceSim />
      </Card>

      <h2>Récapitulatif : le trajet des données</h2>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Étape</th><th>Où sont les données ?</th><th>Composants actifs</th><th>Limité par</th></tr></thead>
          <tbody>
            <tr><td>Chargement du modèle</td><td>Disque → RAM → HBM</td><td>CPU, PCIe, moteurs DMA</td><td>Disque / PCIe (une seule fois)</td></tr>
            <tr><td>Copie de l'entrée</td><td>RAM → HBM</td><td>PCIe, moteurs DMA</td><td>Latence PCIe</td></tr>
            <tr><td>Lancement de kernel</td><td>—</td><td>CPU, driver, GigaThread Engine</td><td>Latence de lancement (µs)</td></tr>
            <tr><td>Produit matriciel</td><td>HBM → L2 → mémoire partagée → registres</td><td>LD/ST, TMA, Tensor Cores, ordonnanceurs de warps</td><td>Mémoire (lot petit) ou calcul (lot grand)</td></tr>
            <tr><td>Biais + ReLU (fusionnés)</td><td>Registres</td><td>Cœurs CUDA</td><td>Rien (gratuit si fusionné)</td></tr>
            <tr><td>Softmax</td><td>Registres + mémoire partagée</td><td>SFU, cœurs CUDA</td><td>Mémoire</td></tr>
            <tr><td>Copie du résultat</td><td>HBM → RAM</td><td>PCIe, moteurs DMA, CPU</td><td>Latence + synchronisation</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Passer à l'échelle : un vrai réseau dense</h2>
      <p>
        Prenons un réseau plus réaliste : 3 couches de 4 096 neurones, en BF16. Chaque couche contient 4 096 × 4 096 ≈ 16,8 millions de poids, soit 33,5 Mo. Pour <b>une seule
        entrée</b>, chaque couche demande ≈ 33,5 millions d'opérations et la lecture de 33,5 Mo : sur H100, ≈ 10 µs de lecture mémoire contre ≈ 0,03 µs de calcul. Le GPU
        attend la mémoire 99,7 % du temps.
      </p>
      <p>
        Avec un <b>lot de 256 entrées</b>, les mêmes 33,5 Mo de poids servent 256 fois : ≈ 8,6 milliards d'opérations, ≈ 9 µs de calcul pour ≈ 10 µs de lecture. Le GPU est
        enfin bien utilisé, et on traite 256 fois plus de requêtes dans presque le même temps.
      </p>
      <Callout type="key" title="Leçons de ce chapitre">
        <ul style={{ margin: 0 }}>
          <li>Les poids vivent dans la HBM ; le PCIe ne sert qu'au démarrage et pour les petites entrées/sorties.</li>
          <li>Chaque couche = un kernel GEMM (Tensor Cores) avec épilogue fusionné (biais, activation sur cœurs CUDA).</li>
          <li>Le chemin des données : HBM → L2 → mémoire partagée → registres → unités de calcul → registres → HBM.</li>
          <li>Pour une entrée isolée, l'inférence est limitée par la mémoire et par les coûts fixes ; le traitement par lots est la clé de l'efficacité.</li>
        </ul>
      </Callout>
      <Def term="Framework d'inférence" en="Inference framework / runtime">
        En pratique, on n'écrit pas ces kernels à la main : PyTorch, ONNX Runtime ou TensorRT choisissent les kernels optimisés (cuBLAS, CUTLASS…) et les fusions. Une ligne comme
        <code> y = torch.relu(layer(x))</code> déclenche toute la mécanique décrite ci-dessus.
      </Def>
    </>
  )
}
