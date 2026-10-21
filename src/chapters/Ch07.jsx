import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import { PrecisionSim } from '../sims/NumberSims.jsx'

export const quiz = [
  {
    q: 'Combien de mémoire occupent les poids d\'un modèle de 7 milliards de paramètres en BF16 ?',
    options: ['7 Go', '14 Go', '28 Go', '3,5 Go'],
    answer: 1,
    explain: '7 × 10⁹ paramètres × 2 octets = 14 Go. En FP32 ce serait 28 Go, en INT4 3,5 Go.',
  },
  {
    q: 'Quel est l\'avantage principal de BF16 par rapport à FP16 ?',
    options: ['Plus de précision', 'La même plage de valeurs que FP32, donc pas de débordement', 'Moins de mémoire', 'Il est plus ancien'],
    answer: 1,
    explain: 'BF16 garde les 8 bits d\'exposant de FP32 (plage jusqu\'à ~3×10³⁸) au prix d\'une mantisse plus courte. FP16 déborde au-delà de 65 504.',
  },
  {
    q: 'Pourquoi réduire la précision accélère-t-il la génération de texte ?',
    options: [
      'Parce que le GPU chauffe moins',
      'Parce qu\'il y a moins d\'octets à lire en mémoire pour chaque token, et que les Tensor Cores vont plus vite en basse précision',
      'Parce que le modèle a moins de couches',
      'Ça ne l\'accélère pas',
    ],
    answer: 1,
    explain: 'La génération est limitée par la bande passante : diviser la taille des poids par 2 double à peu près la vitesse maximale.',
  },
  {
    q: 'Dans quelle précision les Tensor Cores accumulent-ils généralement les sommes d\'un produit en BF16 ?',
    options: ['INT4', 'FP8', 'FP32', 'BF16'],
    answer: 2,
    explain: 'Les produits sont faits en basse précision mais additionnés en FP32 pour limiter l\'accumulation d\'erreurs d\'arrondi.',
  },
]

export default function Ch07() {
  return (
    <>
      <Objectives
        items={[
          'Comment un ordinateur représente un nombre à virgule',
          'Les formats FP32, FP16, BF16, FP8, INT8, INT4',
          'Le compromis précision / mémoire / vitesse',
          'Ce qu\'est la quantification',
        ]}
      />

      <h2>Représenter un nombre avec des bits</h2>
      <Def term="Bit et octet" en="Bit & byte">
        Un <b>bit</b> vaut 0 ou 1. Un <b>octet</b> vaut 8 bits. Un nombre stocké sur 16 bits occupe donc 2 octets. Avec n bits, on peut représenter 2ⁿ valeurs différentes.
      </Def>
      <Def term="Nombre à virgule flottante" en="Floating-point number">
        Format qui représente un nombre comme en notation scientifique : <b>signe × mantisse × 2^exposant</b>. Le <b>signe</b> (1 bit) dit s'il est positif ou négatif,
        l'<b>exposant</b> fixe l'ordre de grandeur (la plage), la <b>mantisse</b> fixe les chiffres significatifs (la précision). Exemple : 6,5 = + 1,625 × 2².
      </Def>
      <Def term="Nombre entier quantifié" en="Quantized integer">
        On peut aussi stocker un entier (par ex. entre −127 et 127 sur 8 bits) et un <b>facteur d'échelle</b> commun à un groupe de valeurs : valeur réelle ≈ entier × échelle.
      </Def>

      <Card title="Comparer les formats" sub="Entrez un nombre et observez comment chaque format le stocke." sim>
        <PrecisionSim />
      </Card>

      <h2>Les formats utilisés en inférence</h2>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Format</th><th>Octets</th><th>Usage typique</th><th>Mémoire pour 8 milliards de poids</th></tr></thead>
          <tbody>
            <tr><td>FP32</td><td>4</td><td>Accumulateurs, anciens modèles, normalisations</td><td>32 Go</td></tr>
            <tr><td>BF16 / FP16</td><td>2</td><td>Format standard actuel des poids et activations</td><td>16 Go</td></tr>
            <tr><td>FP8 (E4M3 / E5M2)</td><td>1</td><td>Inférence rapide sur H100 et plus récents</td><td>8 Go</td></tr>
            <tr><td>INT8</td><td>1</td><td>Poids et/ou activations quantifiés</td><td>8 Go</td></tr>
            <tr><td>INT4 / FP4</td><td>0,5</td><td>Poids quantifiés (GPTQ, AWQ, GGUF…), FP4 natif sur Blackwell</td><td>4 Go</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Pourquoi la basse précision est si efficace</h2>
      <p>Réduire la précision a <b>trois</b> effets positifs à la fois :</p>
      <ol>
        <li><b>Moins de mémoire</b> : un modèle en BF16 occupe deux fois moins de HBM qu'en FP32. Un plus gros modèle tient sur le même GPU.</li>
        <li><b>Moins de bande passante</b> : il y a deux fois moins d'octets à lire pour chaque calcul. Comme l'inférence est souvent limitée par la mémoire, c'est souvent
          <b> deux fois plus rapide</b>.</li>
        <li><b>Plus de calcul</b> : les Tensor Cores font deux fois plus d'opérations par cycle en FP8 qu'en BF16, car les circuits pour des nombres plus petits sont plus petits.</li>
      </ol>
      <Callout type="info" title="Et la précision du modèle ?">
        Les réseaux de neurones sont remarquablement tolérants aux erreurs d'arrondi : ce qui compte, ce sont les ordres de grandeur relatifs des milliards de poids, pas la
        10ᵉ décimale de chacun. BF16 ne dégrade quasiment pas les résultats. FP8 et INT8 demandent un peu de soin (facteurs d'échelle bien choisis). INT4 fait perdre un peu de
        qualité, souvent acceptable pour exécuter un modèle sur un ordinateur personnel.
      </Callout>
      <Def term="Précision mixte" en="Mixed precision">
        Utiliser des formats différents selon les opérations : multiplications en BF16 ou FP8 dans les Tensor Cores, <b>accumulation en FP32</b> dans les registres, et
        opérations sensibles (normalisations, softmax) en FP32.
      </Def>
      <Def term="Quantification" en="Quantization">
        Convertir les poids (et parfois les activations) d'un modèle entraîné vers un format plus compact (INT8, INT4, FP8). Pour limiter les erreurs, on utilise un facteur
        d'échelle par petit groupe de poids (ex. un pour 128 poids). Lors du calcul, les poids sont « déquantifiés » à la volée dans les registres, juste avant d'être envoyés
        aux Tensor Cores : on économise la bande passante HBM sans perdre la puissance de calcul.
      </Def>
    </>
  )
}
