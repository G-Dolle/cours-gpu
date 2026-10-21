// Référentiel de tous les composants d'un GPU utilisés dans le cours.
// Les chiffres "exemple" se réfèrent à une NVIDIA H100 SXM5 (architecture Hopper, 2022),
// GPU de référence des centres de données pour l'inférence de grands modèles.

export const CATEGORIES = {
  host: { label: 'Système hôte', color: 'var(--blue)' },
  link: { label: 'Liaisons & transferts', color: 'var(--purple)' },
  sched: { label: 'Ordonnancement', color: 'var(--orange)' },
  compute: { label: 'Unités de calcul', color: 'var(--accent)' },
  memory: { label: 'Mémoire', color: 'var(--red)' },
  struct: { label: 'Organisation', color: 'var(--muted)' },
}

export const GPU_COMPONENTS = [
  {
    id: 'host',
    name: 'Hôte : CPU + RAM système',
    en: 'Host',
    cat: 'host',
    short: "L'ordinateur « classique » dans lequel le GPU est branché.",
    detail:
      "Le GPU ne fonctionne jamais seul : c'est un coprocesseur. Le CPU (processeur central) exécute le programme principal (par ex. un script Python avec PyTorch), lit le modèle depuis le disque, prépare les données, puis envoie au GPU des ordres de travail. La RAM système (mémoire vive de l'ordinateur) est séparée de la mémoire du GPU.",
    role:
      "Charge le fichier de poids depuis le disque, découpe le texte en tokens, lance les « kernels » (programmes GPU) les uns après les autres, puis récupère le résultat (par ex. le token prédit).",
    example: 'Ex. : CPU serveur 2×56 cœurs, 2 To de RAM DDR5.',
  },
  {
    id: 'pcie',
    name: 'Interface PCI Express',
    en: 'PCIe host interface',
    cat: 'link',
    short: 'Le « câble » (bus) qui relie le GPU au CPU.',
    detail:
      "Le PCIe est le bus standard de la carte mère. Toutes les commandes du CPU et toutes les données échangées avec la RAM système passent par lui. Il est rapide pour un humain, mais lent comparé à la mémoire interne du GPU (≈ 50 fois plus lent que la HBM).",
    role:
      "Transporte les poids du modèle vers le GPU au démarrage (une seule fois), puis à chaque requête les entrées (petites) vers le GPU et les sorties (petites) vers le CPU, ainsi que les commandes de lancement des kernels.",
    example: 'H100 : PCIe Gen5 x16 ≈ 64 Go/s dans chaque sens.',
  },
  {
    id: 'nvlink',
    name: 'NVLink',
    en: 'NVLink / NVSwitch',
    cat: 'link',
    short: 'Liaison directe très rapide entre plusieurs GPU.',
    detail:
      "Quand un modèle est trop gros pour un seul GPU, on le répartit sur plusieurs GPU qui doivent échanger des résultats intermédiaires en permanence. NVLink est un lien point-à-point dédié, bien plus rapide que le PCIe. (Équivalent AMD : Infinity Fabric.)",
    role:
      "Pendant l'inférence multi-GPU (parallélisme de tenseurs), échange à chaque couche les morceaux de résultats calculés par chaque GPU (opérations « all-reduce »).",
    example: 'H100 : NVLink 4 = 900 Go/s au total par GPU.',
  },
  {
    id: 'copy',
    name: 'Moteurs de copie (DMA)',
    en: 'Copy engines / DMA engines',
    cat: 'link',
    short: 'Unités spécialisées qui déplacent des données sans occuper les cœurs de calcul.',
    detail:
      "DMA signifie « accès direct à la mémoire » (Direct Memory Access). Ces moteurs copient des blocs de données entre la RAM du CPU et la mémoire du GPU (ou entre GPU) pendant que les unités de calcul travaillent sur autre chose. Cela permet de recouvrir transfert et calcul.",
    role:
      "Copie les poids (au chargement) et les entrées vers la VRAM (« Host to Device », H2D), puis les résultats vers la RAM (« Device to Host », D2H), en parallèle des calculs.",
    example: 'Plusieurs moteurs de copie par GPU, pilotés par le driver.',
  },
  {
    id: 'gigathread',
    name: 'Ordonnanceur global (GigaThread Engine)',
    en: 'GigaThread Engine / global scheduler',
    cat: 'sched',
    short: 'Le « chef de chantier » qui distribue le travail aux SM.',
    detail:
      "Quand le CPU lance un kernel, il le découpe en milliers de « blocs » de threads. L'ordonnanceur global reçoit ces blocs et les attribue aux SM disponibles. Dès qu'un SM termine un bloc, il lui en donne un autre.",
    role:
      "Pour chaque opération du réseau (un produit matriciel, une activation, un softmax…), répartit les blocs de travail sur les 132 SM afin qu'ils travaillent tous en même temps.",
    example: 'Peut gérer plusieurs kernels simultanément (streams).',
  },
  {
    id: 'gpc',
    name: 'GPC (grappe de traitement)',
    en: 'Graphics Processing Cluster',
    cat: 'struct',
    short: 'Un « quartier » du GPU regroupant plusieurs SM.',
    detail:
      "Le GPU est organisé hiérarchiquement : il contient plusieurs GPC, chacun contenant plusieurs TPC, chacun contenant 2 SM. Cette organisation sert surtout à la conception de la puce ; pour l'inférence, on raisonne surtout en SM. Sur Hopper, les SM d'un même GPC peuvent coopérer (« thread block clusters »).",
    role:
      "Regroupe les SM ; sur H100, permet à des blocs voisins de partager leur mémoire partagée (distributed shared memory), utile aux kernels d'attention et de produit matriciel très optimisés.",
    example: 'H100 : 8 GPC, 66 TPC, 132 SM actifs.',
  },
  {
    id: 'sm',
    name: 'SM (multiprocesseur de flux)',
    en: 'Streaming Multiprocessor',
    cat: 'struct',
    short: "L'« usine » de base du GPU : c'est lui qui calcule.",
    detail:
      "Le SM est l'équivalent d'un cœur de CPU, mais conçu pour exécuter des milliers de threads simultanément. Chaque SM possède ses propres unités de calcul (cœurs CUDA, Tensor Cores, SFU), ses registres, sa mémoire partagée/L1 et ses ordonnanceurs de warps. Un GPU, c'est essentiellement beaucoup de SM identiques + de la mémoire. (Équivalent AMD : Compute Unit, CU.)",
    role:
      "Exécute les blocs de threads qui calculent chacun un morceau du résultat : une « tuile » d'un produit matriciel, une ligne d'un softmax, etc.",
    example: 'H100 : 132 SM, chacun jusqu\'à 2048 threads actifs → ~270 000 threads au total.',
  },
  {
    id: 'warpsched',
    name: 'Ordonnanceur de warps + unité de dispatch',
    en: 'Warp scheduler & dispatch unit',
    cat: 'sched',
    short: 'Choisit, à chaque cycle, quel groupe de 32 threads exécute une instruction.',
    detail:
      "Les threads sont exécutés par paquets de 32 appelés « warps ». À chaque cycle d'horloge, chaque ordonnanceur choisit un warp prêt (dont les données sont arrivées) et envoie son instruction aux unités de calcul. Si un warp attend la mémoire, il en prend un autre : c'est ainsi que le GPU « cache » la lenteur de la mémoire.",
    role:
      "Pendant qu'un warp attend que des poids arrivent de la HBM, un autre warp multiplie des nombres : les unités de calcul restent occupées.",
    example: 'H100 : 4 ordonnanceurs par SM (un par quart de SM), 1 instruction/cycle chacun.',
  },
  {
    id: 'cudacore',
    name: 'Cœurs CUDA (unités FP32 / INT32)',
    en: 'CUDA cores',
    cat: 'compute',
    short: 'Petites calculatrices qui font une opération simple sur un nombre.',
    detail:
      "Un « cœur CUDA » n'est pas un cœur au sens CPU : c'est une unité arithmétique capable de faire une opération par cycle, typiquement une « multiplication-addition fusionnée » (FMA : a × b + c) sur des nombres à virgule flottante 32 bits. Il existe aussi des unités pour les entiers (INT32) et, sur les GPU de calcul, pour les nombres 64 bits (FP64).",
    role:
      "Calculent les opérations « élément par élément » : ajout du biais, fonctions d'activation (ReLU), connexions résiduelles, normalisations, calculs d'indices, et les produits matriciels quand les Tensor Cores ne sont pas utilisés.",
    example: 'H100 : 128 unités FP32 par SM → 16 896 au total, ≈ 67 TFLOPS FP32.',
  },
  {
    id: 'tensorcore',
    name: 'Tensor Cores',
    en: 'Tensor Cores',
    cat: 'compute',
    short: 'Unités spécialisées qui multiplient de petites matrices entières en une seule instruction.',
    detail:
      "Au lieu de multiplier deux nombres, un Tensor Core multiplie deux petites matrices (par ex. 4×4 ou plus sur les générations récentes) et ajoute le résultat à une troisième, en une seule opération. Ils travaillent en précision réduite (FP16, BF16, FP8, INT8) avec accumulation en FP32. Ce sont eux qui fournissent l'écrasante majorité de la puissance de calcul des GPU modernes. (Équivalent AMD : Matrix Cores.)",
    role:
      "Réalisent l'essentiel du travail de l'inférence : tous les produits matriciels (couches denses, projections Q/K/V, calcul des scores d'attention, MLP des transformers, tête de sortie).",
    example: 'H100 : 4 Tensor Cores par SM (528 au total) ≈ 990 TFLOPS en BF16, ≈ 1 980 en FP8.',
  },
  {
    id: 'sfu',
    name: 'SFU (unités de fonctions spéciales)',
    en: 'Special Function Units',
    cat: 'compute',
    short: 'Calculent rapidement les fonctions mathématiques « compliquées ».',
    detail:
      "Exponentielle, logarithme, sinus, cosinus, racine carrée inverse… Ces fonctions seraient lentes à calculer avec des additions et multiplications. Les SFU en donnent une approximation très rapide en matériel.",
    role:
      "Calculent les exponentielles du softmax (attention et sortie), la racine carrée inverse des normalisations (LayerNorm/RMSNorm), les fonctions d'activation GELU/SiLU, et les sinus/cosinus des encodages de position (RoPE).",
    example: 'H100 : 16 SFU par SM.',
  },
  {
    id: 'ldst',
    name: 'Unités Load/Store (LD/ST)',
    en: 'Load/Store units',
    cat: 'compute',
    short: 'Les « livreurs » qui vont chercher et déposer les données en mémoire.',
    detail:
      "Chaque lecture ou écriture mémoire d'un thread passe par une unité LD/ST, qui calcule l'adresse et envoie la requête à la hiérarchie mémoire (L1, L2, HBM). Quand les 32 threads d'un warp lisent des adresses consécutives, leurs requêtes sont « coalescées » en une seule grosse transaction : c'est essentiel pour la performance.",
    role:
      "Chargent les poids et les activations depuis la mémoire vers les registres ou la mémoire partagée, et écrivent les résultats de chaque couche.",
    example: 'H100 : 32 unités LD/ST par SM.',
  },
  {
    id: 'tma',
    name: 'TMA (accélérateur de mémoire tensorielle)',
    en: 'Tensor Memory Accelerator',
    cat: 'compute',
    short: 'Un moteur de copie interne qui charge des blocs 2D/3D entiers de matrice.',
    detail:
      "Introduit avec Hopper (H100). Au lieu que chaque thread calcule ses adresses, un seul thread demande au TMA « copie cette tuile 64×64 de la matrice vers la mémoire partagée », et le TMA s'en charge de façon asynchrone. Les threads sont ainsi libérés pour calculer.",
    role:
      "Dans les kernels de produit matriciel et d'attention (ex. FlashAttention-3), charge les tuiles de poids et d'activations pendant que les Tensor Cores calculent sur les tuiles précédentes.",
    example: 'Un TMA par SM sur H100.',
  },
  {
    id: 'regfile',
    name: 'Banc de registres',
    en: 'Register file',
    cat: 'memory',
    short: 'La mémoire la plus rapide, privée à chaque thread.',
    detail:
      "Chaque thread dispose de ses propres registres (jusqu'à 255 registres de 32 bits). Accès en 1 cycle environ. Le banc de registres d'un SM est plus grand que son cache L1 ! Plus un kernel utilise de registres par thread, moins le SM peut héberger de threads simultanément.",
    role:
      "Stocke les accumulateurs des produits matriciels (les sommes partielles), les variables temporaires, et les fragments de matrices consommés par les Tensor Cores.",
    example: 'H100 : 256 Ko par SM (65 536 registres de 32 bits) → ~33 Mo au total.',
  },
  {
    id: 'smem',
    name: 'Mémoire partagée / cache L1',
    en: 'Shared memory / L1 cache',
    cat: 'memory',
    short: 'Petite mémoire très rapide, partagée par les threads d\'un même bloc.',
    detail:
      "Chaque SM possède une petite SRAM (mémoire statique, sur la puce) configurable : une partie sert de cache L1 automatique, l'autre de « mémoire partagée » gérée explicitement par le programmeur. Les threads d'un bloc peuvent y déposer des données pour que d'autres threads les réutilisent. Environ 20 à 30 fois plus rapide que la HBM.",
    role:
      "Technique centrale du « tuilage » (tiling) : on y copie une tuile de la matrice de poids une seule fois, puis tous les threads du bloc la réutilisent de nombreuses fois. Également utilisée pour les réductions (somme du softmax, moyenne de LayerNorm) et par FlashAttention.",
    example: 'H100 : 256 Ko par SM, dont jusqu\'à 228 Ko de mémoire partagée.',
  },
  {
    id: 'l0',
    name: 'Cache d\'instructions',
    en: 'L0 / L1 instruction cache',
    cat: 'memory',
    short: 'Garde à portée de main les instructions du programme en cours.',
    detail:
      "Le code du kernel (les instructions machine) est lui aussi stocké en mémoire. Ces petits caches évitent d'aller le relire en permanence. Rarement un facteur limitant pour l'inférence.",
    role: 'Fournit aux ordonnanceurs de warps les instructions du kernel en cours (produit matriciel, softmax…).',
    example: 'Un cache L0 par quart de SM.',
  },
  {
    id: 'l2',
    name: 'Cache L2',
    en: 'L2 cache',
    cat: 'memory',
    short: 'Mémoire tampon partagée par tous les SM, entre eux et la HBM.',
    detail:
      "Toutes les lectures/écritures vers la HBM passent par le L2. Si une donnée demandée y est déjà (parce qu'un autre SM vient de la lire), elle est servie beaucoup plus vite et sans consommer de bande passante HBM. Il assure aussi la cohérence des données entre SM.",
    role:
      "Quand plusieurs SM ont besoin des mêmes tuiles de poids ou d'activations, le L2 évite de les relire depuis la HBM. Peut conserver de petites activations entre deux couches.",
    example: 'H100 : 50 Mo, bande passante nettement supérieure à celle de la HBM.',
  },
  {
    id: 'memctrl',
    name: 'Contrôleurs mémoire',
    en: 'Memory controllers',
    cat: 'memory',
    short: 'Font l\'interface entre la puce et les modules de mémoire HBM.',
    detail:
      "Ils traduisent les requêtes du L2 en commandes pour les puces mémoire, planifient les accès pour maximiser le débit et gèrent le code correcteur d'erreurs (ECC).",
    role: 'Transforment les demandes de lecture des poids et du KV cache en transferts effectifs depuis la HBM.',
    example: 'H100 : 10 contrôleurs 512 bits (bus total 5 120 bits).',
  },
  {
    id: 'hbm',
    name: 'Mémoire vidéo : HBM / GDDR (VRAM)',
    en: 'High Bandwidth Memory / VRAM',
    cat: 'memory',
    short: 'La grande mémoire du GPU, où résident le modèle et ses données.',
    detail:
      "C'est la « RAM du GPU ». Sur les GPU de centre de données, il s'agit de HBM : des puces mémoire empilées en 3D juste à côté du processeur, reliées par des milliers de fils, d'où une bande passante énorme. Les cartes grand public utilisent de la GDDR, moins chère et un peu moins rapide. Sa capacité détermine la taille maximale du modèle qu'on peut charger ; sa bande passante détermine souvent la vitesse de génération.",
    role:
      "Stocke les poids du modèle, les activations intermédiaires et le KV cache des transformers. En génération de texte, les poids y sont relus en entier à chaque token : la bande passante HBM est le principal goulot d'étranglement.",
    example: 'H100 : 80 Go de HBM3 à 3,35 To/s. RTX 4090 : 24 Go de GDDR6X à 1 To/s.',
  },
  {
    id: 'rtcore',
    name: 'Unités graphiques (RT cores, unités de texture, ROP)',
    en: 'Graphics-specific units',
    cat: 'compute',
    short: 'Composants dédiés au jeu vidéo et au rendu 3D.',
    detail:
      "Les GPU grand public contiennent des RT cores (lancer de rayons), des unités de texture et des ROP (écriture des pixels). Ils sont peu ou pas utilisés pour l'inférence de réseaux de neurones. Les GPU de centre de données (H100) en ont très peu ou pas du tout.",
    role: 'Aucun rôle notable dans l\'inférence : c\'est de la surface de puce « inutilisée » pour l\'IA.',
    example: 'RTX 4090 : 128 RT cores. H100 : pas de RT cores.',
  },
]

export const byId = Object.fromEntries(GPU_COMPONENTS.map((c) => [c.id, c]))
