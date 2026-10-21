import React from 'react'
import { Stepper } from '../components/ui.jsx'
import GpuDiagram from './GpuDiagram.jsx'

const TOKENS = [
  { t: 'Le', id: 2356 },
  { t: ' chat', id: 9031 },
  { t: ' noir', id: 17245 },
  { t: ' dort', id: 31322 },
]
const PROMPT_LEN = 2

const STAGES = [
  { id: 'tok', label: 'Tokenisation', where: 'CPU' },
  { id: 'emb', label: 'Embedding (table de vecteurs)', where: 'HBM → LD/ST' },
  { id: 'norm1', label: 'RMSNorm', where: 'SFU, réduction', layer: true },
  { id: 'qkv', label: 'Projections Q, K, V', where: 'Tensor Cores', layer: true },
  { id: 'rope', label: 'Position (RoPE)', where: 'SFU, CUDA', layer: true },
  { id: 'attn', label: 'Attention (+ cache KV)', where: 'Tensor Cores, SFU, smem', layer: true },
  { id: 'oproj', label: 'Projection de sortie + résiduel', where: 'Tensor Cores', layer: true },
  { id: 'norm2', label: 'RMSNorm', where: 'SFU, réduction', layer: true },
  { id: 'mlp', label: 'MLP (SwiGLU) + résiduel', where: 'Tensor Cores, SFU', layer: true },
  { id: 'final', label: 'RMSNorm finale', where: 'SFU' },
  { id: 'head', label: 'Tête LM → logits', where: 'Tensor Cores' },
  { id: 'sample', label: 'Échantillonnage', where: 'SFU, CPU' },
]

function Pipeline({ active }) {
  const h = 28, gap = 4, x0 = 30, w = 300
  let y = 8
  const items = []
  const layerTop = 8 + 2 * (h + gap) - 3
  const layerBottom = 8 + 9 * (h + gap) - gap + 3
  STAGES.forEach((s) => {
    const on = active.includes(s.id)
    items.push(
      <g key={s.id}>
        <rect x={s.layer ? x0 + 12 : x0} y={y} width={s.layer ? w - 24 : w} height={h} rx={5}
          fill={on ? 'var(--accent-soft)' : 'var(--surface-2)'} stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 2.5 : 1} />
        <text x={(s.layer ? x0 + 20 : x0 + 8)} y={y + 18} fontSize="11.5" fontWeight={on ? 700 : 500} fill="var(--text)">{s.label}</text>
        <text x={x0 + w - (s.layer ? 20 : 8)} y={y + 18} fontSize="9.5" textAnchor="end" fill="var(--muted)">{s.where}</text>
      </g>,
    )
    y += h + gap
  })
  return (
    <svg viewBox={`0 0 ${w + 40} ${y + 6}`} width={w + 40} role="img" aria-label="Pipeline d'un transformer">
      <rect x={x0 + 4} y={layerTop} width={w - 8} height={layerBottom - layerTop} rx={8} fill="none" stroke={active.includes('layers') ? 'var(--accent)' : 'var(--muted)'} strokeWidth={active.includes('layers') ? 2.5 : 1.2} strokeDasharray="5 3" />
      <text x={x0 - 4} y={(layerTop + layerBottom) / 2} fontSize="11" fontWeight="700" fill="var(--muted)" textAnchor="middle" transform={`rotate(-90 ${x0 - 4} ${(layerTop + layerBottom) / 2})`}>
        × 32 couches (blocs de transformer)
      </text>
      {items}
    </svg>
  )
}

function TokenStrip({ n, cur, generated }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
      {TOKENS.slice(0, n).map((tk, i) => {
        const isCur = cur.includes(i)
        const isGen = i >= PROMPT_LEN
        return (
          <div key={i} style={{
            padding: '3px 8px', borderRadius: 6, fontSize: '0.85rem',
            background: isCur ? 'var(--accent-strong)' : isGen ? 'var(--purple-soft)' : 'var(--blue-soft)',
            color: isCur ? '#fff' : 'var(--text)', border: '1px solid var(--border)',
          }}>
            <b>{tk.t.replace(' ', '␣')}</b> <span className="mono" style={{ fontSize: '0.7rem', opacity: 0.8 }}>#{tk.id}</span>
          </div>
        )
      })}
      {generated && <div style={{ padding: '3px 8px', fontSize: '0.85rem', color: 'var(--muted)' }}>…</div>}
    </div>
  )
}

function KVCache({ kv, partial }) {
  const layers = ['Couche 1', 'Couche 2', '…', 'Couche 32']
  const cols = 5
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>Cache KV (dans la HBM)</div>
      <div style={{ display: 'grid', gridTemplateColumns: `70px repeat(${cols}, 1fr)`, gap: 3, fontSize: '0.72rem' }}>
        <div />
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} style={{ textAlign: 'center', color: 'var(--muted)' }}>{j < TOKENS.length ? TOKENS[j].t.trim() : 'pos ' + (j + 1)}</div>
        ))}
        {layers.map((l, li) => (
          <React.Fragment key={l}>
            <div style={{ color: 'var(--muted)', alignSelf: 'center' }}>{l}</div>
            {Array.from({ length: cols }).map((_, j) => {
              const filled = j < kv && (!partial || li === 0 || j < kv - partial)
              return (
                <div key={j} style={{ height: 20, borderRadius: 3, background: filled ? 'var(--orange)' : 'var(--surface-2)', border: '1px solid var(--border)', color: '#fff', textAlign: 'center', fontSize: '0.65rem', lineHeight: '18px' }}>
                  {filled ? 'K V' : ''}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
        Llama 3 8B : 128 Ko par token (32 couches × 8 têtes KV × 128 dim × 2 (K et V) × 2 octets).
      </div>
    </div>
  )
}

const LAYER = ['norm1', 'qkv', 'rope', 'attn', 'oproj', 'norm2', 'mlp']

const STEPS = [
  {
    title: '0. Préparation : charger 16 Go de poids dans la HBM',
    phase: 'Initialisation', stage: [], n: 0, cur: [], kv: 0,
    tags: [['cpu', 'CPU + disque'], ['bus', 'PCIe + DMA'], ['mem', 'HBM']],
    hl: ['host', 'pcie', 'copy', 'hbm'], view: 'chip',
    body: (
      <>
        Exemple : <b>Llama 3 8B</b>, 8 milliards de paramètres en BF16 (2 octets) = <b>16 Go</b>. Le CPU lit les fichiers de poids et les moteurs DMA les copient via PCIe dans
        la HBM (80 Go sur une H100). Le moteur d'inférence (vLLM, TensorRT-LLM, llama.cpp…) <b>réserve aussi de la place pour le cache KV</b>, qui grandira pendant la
        génération. Cette phase prend de quelques secondes à quelques minutes, une seule fois.
      </>
    ),
  },
  {
    title: '1. Tokenisation (sur le CPU)',
    phase: 'Prefill', stage: ['tok'], n: 2, cur: [0, 1], kv: 0,
    tags: [['cpu', 'CPU']],
    hl: ['host'], view: 'chip',
    body: (
      <>
        Le texte de l'utilisateur « Le chat » est découpé en <b>tokens</b> (morceaux de mots) et chaque token est remplacé par son numéro dans le vocabulaire (128 256 tokens
        pour Llama 3). Résultat : [2356, 9031] (numéros illustratifs). Les identifiants sont copiés vers le GPU (quelques octets).
      </>
    ),
  },
  {
    title: '2. Embedding : un vecteur par token',
    phase: 'Prefill', stage: ['emb'], n: 2, cur: [0, 1], kv: 0,
    tags: [['mem', 'HBM → L2 → registres'], ['gpu', 'LD/ST']],
    hl: ['hbm', 'memctrl', 'l2', 'sm'], view: 'chip',
    body: (
      <>
        La table d'embedding (128 256 lignes × 4 096 colonnes, ≈ 1 Go) est dans la HBM. Un kernel « gather » <b>lit simplement la ligne</b> correspondant à chaque token.
        Aucun calcul : c'est une pure opération mémoire. On obtient une matrice d'<b>activations</b> de 2 × 4 096 nombres : le « flux résiduel » qui va traverser toutes les couches.
      </>
    ),
  },
  {
    title: '3. [Couche 1] RMSNorm',
    phase: 'Prefill', stage: ['norm1', 'layers'], n: 2, cur: [0, 1], kv: 0,
    tags: [['gpu', 'Cœurs CUDA'], ['gpu', 'SFU (1/√x)'], ['mem', 'Mémoire partagée']],
    hl: ['cudacore', 'sfu', 'smem', 'regfile'], view: 'sm',
    body: (
      <>
        On normalise chaque vecteur pour garder des valeurs stables : somme des carrés (<b>réduction</b> entre threads via mémoire partagée / warp shuffle), racine carrée inverse
        (<b>SFU</b>), puis multiplication par un vecteur de poids (<b>cœurs CUDA</b>). Opération limitée par la mémoire, souvent fusionnée avec l'étape suivante.
      </>
    ),
  },
  {
    title: '4. [Couche 1] Projections Q, K, V — et écriture dans le cache KV',
    phase: 'Prefill', stage: ['qkv', 'layers'], n: 2, cur: [0, 1], kv: 2, partial: 2,
    tags: [['gpu', 'Tensor Cores'], ['mem', 'HBM (poids + cache KV)'], ['gpu', 'TMA']],
    hl: ['tensorcore', 'regfile', 'smem', 'tma', 'warpsched'], view: 'sm',
    body: (
      <>
        Trois <b>produits matriciels</b> : chaque vecteur est multiplié par W_Q (4 096 → 4 096), W_K et W_V (4 096 → 1 024 chacun, car Llama 3 partage les têtes K/V : « GQA »).
        Les <b>Tensor Cores</b> font le travail, les tuiles de poids arrivent en mémoire partagée via le <b>TMA</b>. Les vecteurs <b>K et V</b> de chaque token sont
        <b> sauvegardés dans le cache KV</b> (orange) : on n'aura plus jamais à les recalculer.
      </>
    ),
  },
  {
    title: '5. [Couche 1] Encodage de position (RoPE)',
    phase: 'Prefill', stage: ['rope', 'layers'], n: 2, cur: [0, 1], kv: 2, partial: 2,
    tags: [['gpu', 'SFU (sin, cos)'], ['gpu', 'Cœurs CUDA']],
    hl: ['sfu', 'cudacore', 'regfile'], view: 'sm',
    body: (
      <>
        L'attention ne sait pas, par elle-même, dans quel ordre sont les mots. RoPE « tourne » les vecteurs Q et K d'un angle qui dépend de la position du token. Calcul de
        sinus/cosinus (<b>SFU</b>) et de multiplications élément par élément (<b>cœurs CUDA</b>).
      </>
    ),
  },
  {
    title: '6. [Couche 1] Attention (FlashAttention)',
    phase: 'Prefill', stage: ['attn', 'layers'], n: 2, cur: [0, 1], kv: 2, partial: 2,
    tags: [['gpu', 'Tensor Cores (QKᵀ, ×V)'], ['gpu', 'SFU (exp)'], ['mem', 'Mémoire partagée']],
    hl: ['tensorcore', 'sfu', 'smem', 'regfile', 'tma'], view: 'sm',
    body: (
      <>
        Pour chacune des 32 têtes : scores = Q·Kᵀ/√128, masque causal, softmax, puis × V (voir le simulateur du chapitre précédent). Le kernel <b>FlashAttention</b> fait tout
        cela <b>dans un seul kernel</b>, tuile par tuile, en gardant les résultats intermédiaires en <b>mémoire partagée et registres</b> : la matrice des scores n'est jamais écrite
        en HBM. Le token « chat » regarde « Le » et lui-même.
      </>
    ),
  },
  {
    title: '7. [Couche 1] Projection de sortie + connexion résiduelle',
    phase: 'Prefill', stage: ['oproj', 'layers'], n: 2, cur: [0, 1], kv: 2, partial: 2,
    tags: [['gpu', 'Tensor Cores'], ['gpu', 'Cœurs CUDA (addition)']],
    hl: ['tensorcore', 'cudacore', 'regfile'], view: 'sm',
    body: (
      <>
        Les sorties des 32 têtes sont concaténées et multipliées par W_O (4 096 × 4 096). Le résultat est <b>ajouté</b> au flux résiduel (x ← x + attention(x)) : l'addition
        est fusionnée dans l'épilogue du produit matriciel.
      </>
    ),
  },
  {
    title: '8. [Couche 1] RMSNorm + MLP (SwiGLU) + résiduel',
    phase: 'Prefill', stage: ['norm2', 'mlp', 'layers'], n: 2, cur: [0, 1], kv: 2, partial: 2,
    tags: [['gpu', 'Tensor Cores'], ['gpu', 'SFU (SiLU)'], ['mem', 'HBM (≈ 2/3 des poids)']],
    hl: ['tensorcore', 'sfu', 'cudacore', 'regfile', 'smem'], view: 'sm',
    body: (
      <>
        Deuxième moitié du bloc : normalisation, puis le <b>MLP</b>, un réseau dense à 2 couches appliqué à chaque token indépendamment (exactement comme au chapitre 9 !) :
        4 096 → 14 336 (deux matrices « gate » et « up »), activation SiLU (<b>SFU</b>), multiplication élément par élément, puis 14 336 → 4 096 (« down »). Le MLP contient
        environ <b>deux tiers des poids</b> du modèle. Résultat ajouté au flux résiduel.
      </>
    ),
  },
  {
    title: '9. On répète pour les 32 couches',
    phase: 'Prefill', stage: [...LAYER, 'layers'], n: 2, cur: [0, 1], kv: 2,
    tags: [['gpu', 'Tous les SM'], ['mem', 'Tous les poids lus une fois']],
    hl: ['sm', 'l2', 'hbm', 'gigathread'], view: 'chip',
    body: (
      <>
        Les étapes 3 à 8 sont répétées 32 fois, chaque couche avec ses propres poids (≈ 218 millions de paramètres, soit ≈ 440 Mo par couche). Le cache KV se remplit pour toutes les couches.
        <b> Point clé du prefill :</b> tous les tokens du prompt sont traités <b>ensemble</b> ; chaque poids lu depuis la HBM sert pour tous les tokens (produit matrice × matrice).
        Avec un long prompt (des milliers de tokens), le prefill est <b>limité par le calcul</b> : les Tensor Cores tournent à plein régime.
      </>
    ),
  },
  {
    title: '10. Norme finale + tête LM : un score par mot du vocabulaire',
    phase: 'Prefill', stage: ['final', 'head'], n: 2, cur: [1], kv: 2,
    tags: [['gpu', 'Tensor Cores'], ['mem', 'HBM (≈ 1 Go de poids)']],
    hl: ['tensorcore', 'regfile', 'smem', 'sfu'], view: 'sm',
    body: (
      <>
        Seul le vecteur du <b>dernier token</b> (« chat ») est utile pour prédire la suite. Il est multiplié par la matrice de sortie (4 096 × 128 256) : on obtient
        <b> 128 256 logits</b>, un score pour chaque token possible.
      </>
    ),
  },
  {
    title: '11. Échantillonnage du prochain token → « noir »',
    phase: 'Prefill', stage: ['sample'], n: 3, cur: [2], kv: 2,
    tags: [['gpu', 'SFU (softmax)'], ['bus', 'PCIe (4 octets)'], ['cpu', 'CPU (détokenisation)']],
    hl: ['sfu', 'smem', 'pcie', 'host'], view: 'chip',
    body: (
      <>
        Softmax avec <b>température</b> sur les logits → probabilités ; on garde les plus probables (<b>top-p / top-k</b>) et on tire au sort : « ␣noir » (#17245). Seul cet
        identifiant (4 octets) est copié vers le CPU, qui le convertit en texte et l'affiche à l'utilisateur. Le temps écoulé jusqu'ici s'appelle le <b>TTFT</b> (Time To First
        Token, temps jusqu'au premier token).
      </>
    ),
  },
  {
    title: '12. Décodage : on ne traite que le nouveau token',
    phase: 'Décodage', stage: ['emb', ...LAYER, 'layers', 'final', 'head', 'sample'], n: 3, cur: [2], kv: 3,
    tags: [['gpu', 'Tensor Cores sous-utilisés'], ['mem', 'HBM : goulot d\'étranglement']],
    hl: ['hbm', 'memctrl', 'l2', 'sm'], view: 'chip',
    body: (
      <>
        Pour prédire le token suivant, on ne refait <b>pas</b> le calcul pour « Le chat » : on fait passer <b>uniquement</b> « noir » dans les 32 couches. À chaque couche, son K et
        son V sont <b>ajoutés au cache</b>, et son Q est comparé aux K de tous les tokens précédents <b>lus depuis le cache</b>.
        <br />
        Problème : pour ce seul token, il faut quand même <b>lire les 16 Go de poids</b> depuis la HBM, et chaque poids ne sert qu'à 2 opérations (produit matrice × vecteur).
        Sur une H100 : 16 Go ÷ 3,35 To/s ≈ <b>4,8 ms minimum par token</b>, soit ≈ 200 tokens/s au mieux. Le décodage est <b>limité par la bande passante mémoire</b>.
      </>
    ),
  },
  {
    title: '13. Token suivant → « dort », et ainsi de suite',
    phase: 'Décodage', stage: ['emb', ...LAYER, 'layers', 'final', 'head', 'sample'], n: 4, cur: [3], kv: 4,
    tags: [['gpu', 'Boucle de génération'], ['mem', 'Cache KV qui grandit']],
    hl: ['hbm', 'sm', 'pcie', 'host'], view: 'chip',
    body: (
      <>
        La boucle continue : « dort » est traité seul, son K/V est ajouté au cache, un nouveau token est tiré… jusqu'à un token spécial de <b>fin de séquence</b> ou une longueur
        maximale. Le cache KV grandit d'un cran à chaque token : pour une conversation de 8 000 tokens, il occupe déjà ≈ 1 Go pour Llama 3 8B. C'est pourquoi on sert
        plusieurs utilisateurs à la fois (<i>batching</i>) : les poids lus une fois servent alors à plusieurs séquences (voir chapitre 12).
      </>
    ),
  },
]

export default function TransformerInferenceSim() {
  return (
    <Stepper
      steps={STEPS}
      render={(s) => (
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <span className="pill" style={{ background: s.phase === 'Décodage' ? 'var(--purple-soft)' : s.phase === 'Prefill' ? 'var(--blue-soft)' : 'var(--surface-2)', fontSize: '0.8rem' }}>
              Phase : {s.phase}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Prompt en bleu, tokens générés en violet, token(s) en cours de traitement en vert.</span>
          </div>
          <TokenStrip n={s.n} cur={s.cur} generated={s.n > PROMPT_LEN} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="svg-wrap" style={{ flex: '1 1 320px' }}><Pipeline active={s.stage} /></div>
            <div style={{ flex: '1 1 300px' }}><KVCache kv={s.kv} partial={s.partial} /></div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '10px 0 4px' }}>Composants du GPU sollicités :</div>
          <GpuDiagram highlight={s.hl} view={s.view} interactive={false} showViewSwitch={false} />
        </div>
      )}
    />
  )
}
