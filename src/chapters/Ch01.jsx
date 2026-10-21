import React from 'react'
import { Callout, Card, Def, Objectives } from '../components/ui.jsx'
import CpuGpuRace from '../sims/CpuGpuRace.jsx'

export const quiz = [
  {
    q: "Pourquoi un GPU est-il plus rapide qu'un CPU pour faire fonctionner un réseau de neurones ?",
    options: [
      'Chacun de ses cœurs est beaucoup plus rapide qu\'un cœur de CPU',
      'Il possède des milliers d\'unités de calcul qui travaillent en même temps sur des opérations indépendantes',
      'Il a plus de mémoire que la RAM du CPU',
      'Il n\'a pas besoin du CPU pour fonctionner',
    ],
    answer: 1,
    explain: "Un cœur de GPU est plutôt plus lent et plus simple qu'un cœur de CPU. La force du GPU, c'est le nombre : des milliers d'unités qui font la même chose en parallèle.",
  },
  {
    q: 'Dans quel cas un CPU reste-t-il préférable ?',
    options: ['Pour multiplier deux grandes matrices', 'Pour une suite d\'étapes dont chacune dépend du résultat de la précédente', 'Pour traiter 1 million de pixels', 'Jamais'],
    answer: 1,
    explain: 'Quand les tâches sont dépendantes (séquentielles), on ne peut pas les répartir : seul un cœur travaille à la fois, et le cœur de CPU, plus rapide, l\'emporte.',
  },
  {
    q: 'Que signifie « inférence » ?',
    options: ['Entraîner un modèle sur des données', 'Utiliser un modèle déjà entraîné pour produire une réponse à partir d\'une nouvelle entrée', 'Télécharger un modèle', 'Mesurer la vitesse d\'un GPU'],
    answer: 1,
    explain: "L'inférence, c'est l'utilisation du modèle : on lui donne une entrée (une image, une phrase) et il calcule une sortie, avec des poids figés.",
  },
  {
    q: 'Le débit (throughput) d\'un processeur désigne…',
    options: ['Le temps pour finir une tâche isolée', 'La quantité de travail accomplie par seconde', 'La taille de sa mémoire', 'Sa consommation électrique'],
    answer: 1,
    explain: 'Le CPU est optimisé pour la latence (finir une tâche vite), le GPU pour le débit (finir beaucoup de tâches par seconde).',
  },
]

export default function Ch01() {
  return (
    <>
      <Objectives
        items={[
          "Ce qu'est un processeur et ce qu'il fait concrètement",
          'La différence fondamentale entre un CPU et un GPU',
          'Les notions de latence, de débit et de parallélisme',
          "Ce que signifient « entraînement » et « inférence » d'un réseau de neurones",
        ]}
      />

      <h2>Un processeur, c'est quoi ?</h2>
      <p>
        Un ordinateur ne « comprend » rien : il exécute des <b>instructions</b> très simples, des millions de fois par seconde. Une instruction, c'est par exemple « additionne ces
        deux nombres », « multiplie ces deux nombres », « lis le nombre rangé à telle adresse en mémoire » ou « si ce nombre est négatif, saute à telle instruction ».
      </p>
      <Def term="Processeur" en="Processor">
        Circuit électronique qui exécute des instructions sur des nombres. Il est cadencé par une <b>horloge</b> : à chaque « tic » (un <b>cycle</b>), il peut avancer d'une étape.
        Une horloge à 2 GHz fait 2 milliards de cycles par seconde.
      </Def>
      <Def term="Mémoire" en="Memory">
        Endroit où sont rangés les nombres (données) et les instructions (programme). Le processeur doit aller y <b>lire</b> ses données avant de calculer, et y <b>écrire</b> ses
        résultats. Comme nous le verrons, ce va-et-vient est souvent plus coûteux que le calcul lui-même.
      </Def>

      <h2>Le CPU : quelques cerveaux très polyvalents</h2>
      <Def term="CPU" en="Central Processing Unit — processeur central">
        Le processeur principal de l'ordinateur. Il contient un petit nombre de <b>cœurs</b> (typiquement 4 à 64), chacun très puissant et très sophistiqué : il sait prédire les
        branchements, exécuter les instructions dans le désordre pour gagner du temps, et dispose de gros caches. Il est optimisé pour la <b>latence</b> : terminer une tâche
        donnée le plus vite possible.
      </Def>
      <p>
        Le CPU excelle quand le travail est varié et plein de décisions : faire tourner le système d'exploitation, un navigateur, un tableur, la logique d'un jeu… C'est un
        <b> chef cuisinier étoilé</b> : il sait tout faire, très vite, mais il n'a que deux mains.
      </p>

      <h2>Le GPU : une armée d'ouvriers spécialisés</h2>
      <Def term="GPU" en="Graphics Processing Unit — processeur graphique">
        Processeur conçu à l'origine pour afficher des images 3D : calculer la couleur de millions de pixels, où chaque pixel se calcule de la même façon, indépendamment des
        autres. Il contient des <b>milliers d'unités de calcul simples</b> qui exécutent la même instruction sur des données différentes. Il est optimisé pour le <b>débit</b> : la
        quantité totale de travail accomplie par seconde.
      </Def>
      <Callout type="analogy" title="Analogie">
        <p>
          Imaginez qu'il faut éplucher 10 000 pommes de terre. Le chef étoilé (CPU) épluche une pomme de terre en 10 secondes. Une brigade de 1 000 commis (GPU) met 40 secondes
          par pomme de terre, mais ils travaillent tous en même temps : ils finissent en 400 secondes, contre 100 000 secondes pour le chef seul.
        </p>
        <p>
          En revanche, pour suivre une recette complexe dont chaque étape dépend de la précédente (faire un roux, puis ajouter le lait, puis…), les 1 000 commis ne servent à
          rien : un seul peut travailler à la fois, et le chef est plus rapide.
        </p>
      </Callout>

      <Card title="Course : CPU contre GPU" sub="Comparez les deux processeurs sur un travail parallèle, puis sur un travail séquentiel." sim>
        <CpuGpuRace />
      </Card>

      <Def term="Parallélisme" en="Parallelism">
        Le fait d'exécuter plusieurs calculs <b>au même moment</b>. Il n'est possible que si ces calculs sont <b>indépendants</b> : aucun n'a besoin du résultat d'un autre.
      </Def>
      <Def term="Latence et débit" en="Latency & throughput">
        La <b>latence</b> est le temps pour obtenir <i>un</i> résultat. Le <b>débit</b> est le nombre de résultats obtenus par seconde. Une autoroute à 10 voies n'emmène pas une
        voiture plus vite qu'une route à 1 voie (même latence), mais elle fait passer 10 fois plus de voitures (débit ×10).
      </Def>

      <h2>Et les réseaux de neurones dans tout ça ?</h2>
      <p>
        Un réseau de neurones (nous le détaillerons aux chapitres 8 et 10) est une gigantesque fonction mathématique. Pour une entrée (une image, une phrase), elle calcule une
        sortie (« c'est un chat », « le mot suivant est… ») à l'aide de millions ou de milliards de nombres appelés <b>poids</b>. Presque tout le calcul consiste à <b>multiplier des
        nombres et additionner les résultats</b>, des milliards de fois, et ces multiplications sont <b>en grande partie indépendantes</b> les unes des autres.
      </p>
      <Callout type="key" title="L'idée centrale du cours">
        Les réseaux de neurones sont faits presque exclusivement de calculs massivement parallèles. C'est exactement ce pour quoi les GPU sont construits. C'est pourquoi les GPU
        sont devenus le moteur de l'intelligence artificielle moderne.
      </Callout>

      <Def term="Entraînement" en="Training">
        Phase où l'on <b>ajuste les poids</b> du réseau, en lui montrant des millions d'exemples et en corrigeant ses erreurs petit à petit. Très coûteuse (des semaines sur des
        milliers de GPU pour un grand modèle de langage), elle n'a lieu qu'une fois.
      </Def>
      <Def term="Inférence" en="Inference">
        Phase où l'on <b>utilise</b> le réseau entraîné : les poids sont figés, on donne une entrée et on calcule la sortie. C'est ce qui se passe chaque fois que vous posez une
        question à un assistant conversationnel. Chaque inférence coûte peu, mais il y en a des milliards par jour : c'est l'objet de ce cours.
      </Def>

      <Callout type="tip" title="À retenir">
        <ul style={{ margin: 0 }}>
          <li>Un CPU a peu de cœurs puissants (latence) ; un GPU a des milliers d'unités simples (débit).</li>
          <li>Le GPU ne gagne que si le travail peut être découpé en tâches indépendantes.</li>
          <li>L'inférence d'un réseau de neurones est constituée à plus de 90 % de telles tâches : des multiplications-additions.</li>
          <li>Le GPU ne travaille jamais seul : le CPU le pilote.</li>
        </ul>
      </Callout>
    </>
  )
}
