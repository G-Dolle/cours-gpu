import React, { useMemo, useState } from 'react'
import { Stepper } from '../components/ui.jsx'
import GpuDiagram from './GpuDiagram.jsx'

// Petit réseau : 4 caractéristiques → 3 neurones cachés (ReLU) → 2 classes (softmax)
const FEATURES = ['rougeur', 'jaunissement', 'longueur', 'rondeur']
const CLASSES = ['🍎 Pomme', '🍌 Banane']
const W1 = [
  [1.0, -0.5, -0.8, 1.2],
  [-0.6, 1.1, 1.3, -0.9],
  [0.3, 0.3, -0.2, 0.4],
]
const B1 = [0.0, 0.1, -0.2]
const W2 = [
  [1.5, -1.2, 0.5],
  [-1.0, 1.4, 0.2],
]
const B2 = [0.0, 0.0]
const PRESETS = {
  pomme: { label: 'Une pomme', x: [0.9, 0.1, 0.2, 0.8] },
  banane: { label: 'Une banane', x: [0.1, 0.9, 0.9, 0.1] },
  bizarre: { label: 'Fruit ambigu', x: [0.5, 0.5, 0.5, 0.5] },
}

const f = (v) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(2))

function compute(x) {
  const z1 = W1.map((row, i) => row.reduce((s, w, j) => s + w * x[j], 0) + B1[i])
  const h = z1.map((v) => Math.max(0, v))
  const z2 = W2.map((row, i) => row.reduce((s, w, j) => s + w * h[j], 0) + B2[i])
  const m = Math.max(...z2)
  const e = z2.map((v) => Math.exp(v - m))
  const sum = e.reduce((a, b) => a + b, 0)
  const p = e.map((v) => v / sum)
  return { z1, h, z2, m, e, sum, p }
}

function Network({ x, r, show, focus }) {
  const cols = [
    { n: 4, x: 130, vals: show.x ? x : null, names: FEATURES, key: 'input' },
    { n: 3, x: 350, vals: show.h ? r.h : show.z1 ? r.z1 : null, key: 'hidden' },
    { n: 2, x: 570, vals: show.p ? r.p : show.z2 ? r.z2 : null, names: CLASSES, key: 'output' },
  ]
  const Y = (n, i) => 130 + (i - (n - 1) / 2) * 62
  const lines = []
  for (let c = 0; c < 2; c++) {
    const a = cols[c], b = cols[c + 1]
    const W = c === 0 ? W1 : W2
    const on = focus === (c === 0 ? 'w1' : 'w2')
    for (let i = 0; i < b.n; i++) {
      for (let j = 0; j < a.n; j++) {
        const w = W[i][j]
        lines.push(
          <line key={`${c}-${i}-${j}`} x1={a.x + 22} y1={Y(a.n, j)} x2={b.x - 22} y2={Y(b.n, i)}
            stroke={w >= 0 ? 'var(--blue)' : 'var(--red)'} strokeWidth={on ? 1 + Math.abs(w) * 2 : 0.8 + Math.abs(w)} strokeOpacity={on ? 0.9 : 0.22} />,
        )
      }
    }
  }
  return (
    <div className="svg-wrap">
      <svg viewBox="0 0 700 260" width="700" role="img" aria-label="Réseau de neurones dense">
        {lines}
        {cols.map((c) => (
          <g key={c.key}>
            {Array.from({ length: c.n }).map((_, i) => {
              const active = focus === c.key
              return (
                <g key={i}>
                  <circle cx={c.x} cy={Y(c.n, i)} r={22} fill={active ? 'var(--accent-soft)' : 'var(--surface)'} stroke={active ? 'var(--accent)' : 'var(--border)'} strokeWidth={active ? 3 : 1.5} />
                  <text x={c.x} y={Y(c.n, i) + 4} fontSize="11" textAnchor="middle" fill="var(--text)" fontWeight="600">
                    {c.vals ? (c.key === 'output' && show.p ? `${(c.vals[i] * 100).toFixed(1)}%` : f(c.vals[i])) : '?'}
                  </text>
                  {c.names && (
                    <text x={c.key === 'input' ? c.x - 28 : c.x + 28} y={Y(c.n, i) + 4} fontSize="11" textAnchor={c.key === 'input' ? 'end' : 'start'} fill="var(--muted)">
                      {c.names[i]}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        ))}
        <text x={130} y={254} fontSize="11" textAnchor="middle" fill="var(--muted)">entrée x (4)</text>
        <text x={240} y={254} fontSize="11" textAnchor="middle" fill="var(--muted)">W1 (3×4), b1</text>
        <text x={350} y={254} fontSize="11" textAnchor="middle" fill="var(--muted)">couche cachée h (3)</text>
        <text x={460} y={254} fontSize="11" textAnchor="middle" fill="var(--muted)">W2 (2×3), b2</text>
        <text x={570} y={254} fontSize="11" textAnchor="middle" fill="var(--muted)">sortie (2)</text>
      </svg>
    </div>
  )
}

export default function DenseInferenceSim() {
  const [preset, setPreset] = useState('pomme')
  const x = PRESETS[preset].x
  const r = useMemo(() => compute(x), [x])
  const winner = r.p[0] > r.p[1] ? 0 : 1

  const steps = [
    {
      title: '0. Chargement du modèle (une seule fois, au démarrage)',
      tags: [['cpu', 'CPU'], ['bus', 'PCIe + DMA'], ['mem', 'HBM']],
      hl: ['host', 'pcie', 'copy', 'hbm'], view: 'chip', show: {}, focus: null,
      body: (
        <>
          Le CPU lit le fichier de poids sur le disque (ici 12 + 3 + 6 + 2 = <b>23 nombres</b> ; pour un vrai modèle, des millions ou des milliards) et le place en RAM.
          Les <b>moteurs de copie (DMA)</b> transfèrent ensuite ces poids via le bus <b>PCIe</b> jusque dans la <b>HBM</b> du GPU, où ils resteront pendant toute la durée
          de vie du programme. Ce transfert est lent, c'est pourquoi on ne le fait qu'une fois.
        </>
      ),
    },
    {
      title: '1. Préparation de l\'entrée par le CPU',
      tags: [['cpu', 'CPU']],
      hl: ['host'], view: 'chip', show: { x: true }, focus: 'input',
      body: (
        <>
          Le programme (par ex. en Python avec PyTorch) reçoit la requête et la transforme en un <b>tenseur</b> : x = [{x.map(f).join(', ')}]. Ce sont les 4
          caractéristiques du fruit, normalisées entre 0 et 1. Pour l'instant, ces données sont dans la RAM du CPU.
        </>
      ),
    },
    {
      title: '2. Copie de l\'entrée vers le GPU (Host → Device)',
      tags: [['bus', 'PCIe + DMA'], ['mem', 'HBM']],
      hl: ['host', 'pcie', 'copy', 'hbm'], view: 'chip', show: { x: true }, focus: 'input',
      body: (
        <>
          Un moteur de copie envoie x (4 nombres × 4 octets = 16 octets) dans la HBM. Pour de petites entrées, ce transfert est rapide mais sa <b>latence</b> (quelques
          microsecondes) n'est pas négligeable : on évite donc les allers-retours inutiles entre CPU et GPU.
        </>
      ),
    },
    {
      title: '3. Lancement du kernel « couche 1 »',
      tags: [['cpu', 'CPU / driver'], ['gpu', 'GigaThread Engine']],
      hl: ['host', 'pcie', 'gigathread', 'sm'], view: 'chip', show: { x: true }, focus: 'w1',
      body: (
        <>
          Le CPU ne calcule rien lui-même : il demande au driver de lancer un <b>kernel</b> (un programme GPU) de produit matriciel, en précisant la grille de blocs. La commande
          traverse le PCIe. L'<b>ordonnanceur global (GigaThread Engine)</b> distribue les blocs de threads aux <b>SM</b> libres. Dans un vrai modèle, il y aurait des milliers de
          blocs répartis sur les 132 SM ; ici, un seul bloc suffit.
        </>
      ),
    },
    {
      title: '4. Chargement de W1 et x dans le SM',
      tags: [['mem', 'HBM → L2 → mémoire partagée'], ['gpu', 'LD/ST, TMA']],
      hl: ['hbm', 'memctrl', 'l2', 'sm'], view: 'chip', show: { x: true }, focus: 'w1',
      body: (
        <>
          Les unités <b>Load/Store</b> (ou le <b>TMA</b> sur H100) demandent les poids W1 et l'entrée x. Les <b>contrôleurs mémoire</b> les lisent dans la <b>HBM</b>, ils
          transitent par le <b>cache L2</b>, puis sont déposés dans la <b>mémoire partagée</b> du SM et dans les <b>registres</b> des threads. Pendant ce temps (des centaines
          de cycles), l'ordonnanceur de warps fait travailler d'autres warps s'il y en a.
        </>
      ),
    },
    {
      title: '5. Produit matriciel z1 = W1 · x + b1',
      tags: [['gpu', 'Tensor Cores / cœurs CUDA'], ['gpu', 'Ordonnanceur de warps'], ['mem', 'Registres']],
      hl: ['tensorcore', 'cudacore', 'regfile', 'warpsched', 'smem'], view: 'sm', show: { x: true, z1: true }, focus: 'hidden',
      body: (
        <>
          Chaque neurone caché est un produit scalaire : 4 multiplications-additions (FMA). Par exemple :
          <div className="formula">
            {`z1[0] = ${W1[0].map((w, j) => `${w}×${f(x[j])}`).join(' + ')} + ${B1[0]} = ${f(r.z1[0])}`}
          </div>
          Les 3 neurones sont calculés <b>en parallèle</b> par des threads différents. Sur un vrai modèle, les <b>Tensor Cores</b> traitent des tuiles entières (ex. 16×16) en une
          instruction ; les sommes partielles s'accumulent dans les <b>registres</b> en FP32. Résultat : z1 = [{r.z1.map(f).join(', ')}].
        </>
      ),
    },
    {
      title: '6. Épilogue fusionné : activation ReLU, puis écriture',
      tags: [['gpu', 'Cœurs CUDA'], ['mem', 'Registres → HBM']],
      hl: ['cudacore', 'regfile', 'ldst'], view: 'sm', show: { x: true, h: true }, focus: 'hidden',
      body: (
        <>
          Sans même quitter les registres, les <b>cœurs CUDA</b> appliquent ReLU (max(0, z)) : h = [{r.h.map(f).join(', ')}]. On appelle cela une <b>fusion</b> : au lieu de
          lancer un second kernel qui relirait z1 depuis la HBM, on fait l'activation « au passage ». Les unités <b>LD/ST</b> écrivent ensuite h dans la HBM (ou il reste dans
          le L2 s'il est petit).
        </>
      ),
    },
    {
      title: '7. Couche 2 : z2 = W2 · h + b2',
      tags: [['gpu', 'GigaThread → SM'], ['mem', 'HBM → registres'], ['gpu', 'Tensor Cores']],
      hl: ['tensorcore', 'cudacore', 'regfile', 'smem', 'ldst', 'warpsched'], view: 'sm', show: { x: true, h: true, z2: true }, focus: 'w2',
      body: (
        <>
          On recommence exactement le même cycle : lancement d'un kernel, chargement de W2 et h, produits scalaires, accumulation. On obtient des scores bruts appelés{' '}
          <b>logits</b> : z2 = [{r.z2.map(f).join(', ')}]. Un réseau profond, c'est simplement ce cycle répété pour chaque couche.
        </>
      ),
    },
    {
      title: '8. Softmax : transformer les scores en probabilités',
      tags: [['gpu', 'SFU (exponentielle)'], ['mem', 'Mémoire partagée (réduction)']],
      hl: ['sfu', 'smem', 'cudacore', 'regfile'], view: 'sm', show: { x: true, h: true, p: true }, focus: 'output',
      body: (
        <>
          Le softmax se fait en 3 sous-étapes :
          <ol style={{ margin: '6px 0' }}>
            <li><b>Maximum</b> des scores ({f(r.m)}), soustrait pour éviter les débordements numériques — une <i>réduction</i> entre threads via la mémoire partagée ou des échanges intra-warp (<i>warp shuffle</i>).</li>
            <li><b>Exponentielle</b> de chaque score par les <b>SFU</b> : [{r.e.map((v) => v.toFixed(3)).join(', ')}].</li>
            <li><b>Somme</b> (nouvelle réduction : {r.sum.toFixed(3)}) puis <b>division</b> : p = [{r.p.map((v) => (v * 100).toFixed(1) + ' %').join(', ')}].</li>
          </ol>
        </>
      ),
    },
    {
      title: '9. Copie du résultat vers le CPU (Device → Host)',
      tags: [['bus', 'DMA + PCIe'], ['cpu', 'RAM']],
      hl: ['hbm', 'copy', 'pcie', 'host'], view: 'chip', show: { x: true, h: true, p: true }, focus: 'output',
      body: (
        <>
          Les 2 probabilités (8 octets) repartent vers la RAM du CPU. Cette copie oblige le CPU à <b>attendre</b> que le GPU ait fini tous les kernels : c'est un point de
          synchronisation.
        </>
      ),
    },
    {
      title: '10. Décision finale',
      tags: [['cpu', 'CPU']],
      hl: ['host'], view: 'chip', show: { x: true, h: true, p: true }, focus: 'output',
      body: (
        <>
          Le CPU prend la classe la plus probable (<i>argmax</i>) : <b>{CLASSES[winner]}</b> avec {(r.p[winner] * 100).toFixed(1)} % de confiance. L'inférence est terminée. Pour la requête
          suivante, on reprend à l'étape 1 : les poids sont déjà dans la HBM.
        </>
      ),
    },
  ]

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: '0.9rem' }}>Entrée :</span>
        {Object.entries(PRESETS).map(([k, v]) => (
          <button key={k} className={`btn small ${k === preset ? 'active' : ''}`} onClick={() => setPreset(k)}>{v.label}</button>
        ))}
      </div>
      <Stepper
        steps={steps}
        render={(s) => (
          <div>
            <Network x={x} r={r} show={s.show} focus={s.focus} />
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '6px 0 4px' }}>Composants du GPU actifs à cette étape (en surbrillance clignotante) :</div>
            <GpuDiagram highlight={s.hl} view={s.view} interactive={false} showViewSwitch={false} />
          </div>
        )}
      />
    </div>
  )
}
