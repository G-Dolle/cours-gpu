import React, { useState } from 'react'
import { Stat } from '../components/ui.jsx'

// Ordres de grandeur, H100 SXM
const LEVELS = [
  { name: 'Registres', where: 'dans chaque SM', cap: '256 Ko / SM (≈ 33 Mo au total)', lat: 1, bw: '≈ plusieurs centaines de To/s cumulés', human: '1 seconde', color: 'var(--accent)' },
  { name: 'Mémoire partagée / L1', where: 'dans chaque SM', cap: '256 Ko / SM (≈ 33 Mo au total)', lat: 30, bw: '≈ 30+ To/s cumulés', human: '30 secondes', color: 'var(--accent)' },
  { name: 'Cache L2', where: 'sur la puce, partagé', cap: '50 Mo', lat: 250, bw: '≈ 10 To/s', human: '4 minutes', color: 'var(--orange)' },
  { name: 'HBM (VRAM)', where: 'à côté de la puce', cap: '80 Go', lat: 600, bw: '3,35 To/s', human: '10 minutes', color: 'var(--red)' },
  { name: 'RAM du CPU via PCIe', where: 'de l\'autre côté du bus', cap: 'jusqu\'à plusieurs To', lat: 2000, bw: '≈ 0,064 To/s', human: '> 30 minutes', color: 'var(--blue)' },
]

export function MemoryHierarchy() {
  const maxLog = Math.log10(3000)
  return (
    <div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Niveau</th><th>Où ?</th><th>Capacité</th><th>Débit</th><th>Latence relative (cycles, ordre de grandeur)</th></tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.name}>
                <td><b>{l.name}</b></td>
                <td>{l.where}</td>
                <td>{l.cap}</td>
                <td>{l.bw}</td>
                <td style={{ minWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ height: 12, width: `${(Math.log10(l.lat * 3) / maxLog) * 120}px`, background: l.color, borderRadius: 3 }} />
                    <span className="mono" style={{ fontSize: '0.8rem' }}>~{l.lat}{l.name.includes('PCIe') ? '+' : ''}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>à échelle humaine : {l.human}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
        Valeurs approximatives (elles varient selon les mesures et les générations). La barre est en échelle logarithmique. L'« échelle humaine » suppose
        qu'un accès registre dure 1 seconde.
      </p>
    </div>
  )
}

const PEAK = 989e12 // FLOP/s, BF16 dense H100 SXM
const BW = 3.35e12 // octets/s HBM3
const RIDGE = PEAK / BW

function fmtTime(s) {
  if (s < 1e-6) return `${(s * 1e9).toFixed(1)} ns`
  if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µs`
  return `${(s * 1e3).toFixed(2)} ms`
}

export function RooflineSim() {
  const [op, setOp] = useState('matmul')
  const [logB, setLogB] = useState(0) // taille de lot = 2^logB
  const b = 2 ** logB
  const k = 4096
  let flops, bytes, label
  if (op === 'relu') {
    const n = k * b
    flops = n
    bytes = 2 * n * 2
    label = `ReLU sur ${b} × ${k} valeurs`
  } else if (op === 'add') {
    const n = k * b
    flops = n
    bytes = 3 * n * 2
    label = `Addition de deux tenseurs ${b} × ${k}`
  } else {
    flops = 2 * k * k * b
    bytes = 2 * (k * k + 2 * k * b)
    label = `Couche dense ${k}×${k} appliquée à ${b} entrée(s)`
  }
  const I = flops / bytes
  const tCompute = flops / PEAK
  const tMem = bytes / BW
  const bound = tMem > tCompute ? 'mémoire' : 'calcul'
  const attainable = Math.min(PEAK, I * BW)

  // Graphe roofline en log-log
  const W = 560, H = 250, pad = 44
  const xMin = -2, xMax = 4, yMin = 10, yMax = 15.3
  const X = (i) => pad + ((Math.log10(i) - xMin) / (xMax - xMin)) * (W - pad - 30)
  const Y = (p) => H - pad + 10 - ((Math.log10(p) - yMin) / (yMax - yMin)) * (H - pad - 10)
  const pts = []
  for (let e = xMin; e <= xMax; e += 0.05) {
    const i = 10 ** e
    pts.push(`${X(i)},${Y(Math.min(PEAK, i * BW))}`)
  }
  const Ic = Math.min(Math.max(I, 10 ** xMin), 10 ** xMax)

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className={`btn small ${op === 'relu' ? 'active' : ''}`} onClick={() => setOp('relu')}>ReLU (élément par élément)</button>
        <button className={`btn small ${op === 'add' ? 'active' : ''}`} onClick={() => setOp('add')}>Addition résiduelle</button>
        <button className={`btn small ${op === 'matmul' ? 'active' : ''}`} onClick={() => setOp('matmul')}>Couche dense (produit matriciel)</button>
      </div>
      <label className="field">
        Taille du lot (nombre d'entrées traitées ensemble, « batch ») : <b style={{ color: 'var(--text)' }}>{b}</b>
        <input type="range" min={0} max={12} value={logB} onChange={(e) => setLogB(+e.target.value)} />
      </label>
      <div style={{ fontSize: '0.9rem', margin: '6px 0' }}>{label}, en BF16 (2 octets par nombre), sur H100.</div>
      <div className="stats">
        <Stat label="Opérations (FLOP)" value={flops.toExponential(2)} />
        <Stat label="Octets lus/écrits" value={bytes.toExponential(2)} />
        <Stat label="Intensité arithmétique" value={`${I.toFixed(2)} FLOP/o`} />
        <Stat label="Temps si calcul seul" value={fmtTime(tCompute)} />
        <Stat label="Temps si mémoire seule" value={fmtTime(tMem)} />
        <Stat label="Limité par" value={bound === 'mémoire' ? '🧱 la mémoire' : '⚙️ le calcul'} />
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} role="img" aria-label="Graphique roofline">
          <line x1={pad} y1={H - pad + 10} x2={W - 10} y2={H - pad + 10} stroke="var(--border)" />
          <line x1={pad} y1={10} x2={pad} y2={H - pad + 10} stroke="var(--border)" />
          {[0.01, 0.1, 1, 10, 100, 1000, 10000].map((v) => (
            <g key={v}>
              <line x1={X(v)} y1={H - pad + 10} x2={X(v)} y2={H - pad + 14} stroke="var(--muted)" />
              <text x={X(v)} y={H - pad + 26} fontSize="10" textAnchor="middle" fill="var(--muted)">{v}</text>
            </g>
          ))}
          {[1e11, 1e12, 1e13, 1e14, 1e15].map((v) => (
            <text key={v} x={pad - 4} y={Y(v) + 3} fontSize="10" textAnchor="end" fill="var(--muted)">{v >= 1e15 ? '1P' : v >= 1e12 ? `${v / 1e12}T` : `${v / 1e9}G`}</text>
          ))}
          <text x={(W + pad) / 2} y={H - 4} fontSize="11" textAnchor="middle" fill="var(--muted)">Intensité arithmétique (FLOP par octet) — échelle log</text>
          <text x={12} y={H / 2} fontSize="11" textAnchor="middle" fill="var(--muted)" transform={`rotate(-90 12 ${H / 2})`}>FLOP/s atteignables</text>
          <line x1={X(RIDGE)} y1={Y(PEAK)} x2={X(RIDGE)} y2={H - pad + 10} stroke="var(--muted)" strokeDasharray="3 3" />
          <text x={X(RIDGE) + 4} y={H - pad} fontSize="10" fill="var(--muted)">point d'équilibre ≈ {Math.round(RIDGE)}</text>
          <polyline points={pts.join(' ')} fill="none" stroke="var(--text)" strokeWidth={2} />
          <text x={X(0.05)} y={Y(0.05 * BW) - 8} fontSize="10.5" fill="var(--red)" transform={`rotate(-26 ${X(0.05)} ${Y(0.05 * BW) - 8})`}>limité par la mémoire</text>
          <text x={X(2000)} y={Y(PEAK) - 6} fontSize="10.5" fill="var(--accent)" textAnchor="middle">limité par le calcul</text>
          <circle cx={X(Ic)} cy={Y(Math.min(PEAK, Ic * BW))} r={7} fill={bound === 'mémoire' ? 'var(--red)' : 'var(--accent-strong)'} stroke="var(--surface)" strokeWidth={2} />
        </svg>
      </div>
      <p style={{ fontSize: '0.9rem', margin: 0 }}>
        Performance atteinte ≈ <b>{(attainable / 1e12).toFixed(1)} TFLOP/s</b> sur {(PEAK / 1e12).toFixed(0)} possibles ({((attainable / PEAK) * 100).toFixed(1)} %).
        {op === 'matmul' && b === 1 && ' Avec une seule entrée, chaque poids lu ne sert qu\'à 2 opérations : le GPU passe son temps à attendre la mémoire. Augmentez le lot !'}
        {op === 'matmul' && b >= 512 && ' Avec un gros lot, chaque poids lu est réutilisé des centaines de fois : les Tensor Cores deviennent le facteur limitant.'}
        {op !== 'matmul' && ' Les opérations élément par élément sont toujours limitées par la mémoire, quelle que soit la taille du lot : d\'où l\'intérêt de les « fusionner » avec le produit matriciel.'}
      </p>
    </div>
  )
}
