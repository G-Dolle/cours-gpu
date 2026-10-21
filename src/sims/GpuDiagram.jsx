import React, { useState } from 'react'
import { byId, CATEGORIES } from '../data/gpuComponents.js'

const FILL = {
  host: 'var(--blue-soft)',
  link: 'var(--purple-soft)',
  sched: 'var(--orange-soft)',
  compute: 'var(--accent-soft)',
  memory: 'var(--red-soft)',
  struct: 'var(--surface-2)',
}
const STROKE = {
  host: 'var(--blue)',
  link: 'var(--purple)',
  sched: 'var(--orange)',
  compute: 'var(--accent)',
  memory: 'var(--red)',
  struct: 'var(--muted)',
}

function Part({ id, x, y, w, h, label, sub, hl, sel, onPick, fs = 11, rx = 5 }) {
  const c = byId[id]
  const cat = c ? c.cat : 'struct'
  const active = hl.includes(id)
  const selected = sel === id
  const dimmed = hl.length > 0 && !active
  return (
    <g className="gpu-part" onClick={(e) => { e.stopPropagation(); onPick(id) }} style={{ opacity: dimmed ? 0.28 : 1 }}>
      <rect
        x={x} y={y} width={w} height={h} rx={rx}
        fill={FILL[cat]}
        stroke={active ? '#f5c400' : selected ? 'var(--text)' : STROKE[cat]}
        strokeWidth={active ? 3 : selected ? 2.5 : 1.2}
      >
        {active && <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />}
      </rect>
      {label && (
        <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 4)} textAnchor="middle" fontSize={fs} fontWeight="600" fill="var(--text)" pointerEvents="none">
          {label}
        </text>
      )}
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fontSize={fs - 2} fill="var(--muted)" pointerEvents="none">
          {sub}
        </text>
      )}
    </g>
  )
}

function ChipView({ hl, sel, onPick }) {
  const gpcs = []
  const gw = 132, gh = 92
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const gx = 172 + col * (gw + 10)
      const gy = row === 0 ? 72 : 232
      const sms = []
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          if (r * 6 + c >= 17) continue
          sms.push(
            <Part key={`${r}-${c}`} id="sm" x={gx + 8 + c * 20} y={gy + 22 + r * 22} w={16} h={18} hl={hl} sel={sel} onPick={onPick} rx={2} />,
          )
        }
      }
      gpcs.push(
        <g key={`${row}-${col}`}>
          <Part id="gpc" x={gx} y={gy} w={gw} h={gh} hl={hl} sel={sel} onPick={onPick} />
          <text x={gx + 6} y={gy + 14} fontSize="10" fill="var(--muted)" pointerEvents="none">GPC {row * 4 + col + 1}</text>
          {sms}
        </g>,
      )
    }
  }
  return (
    <svg viewBox="0 0 760 460" width="760" role="img" aria-label="Schéma d'une puce GPU">
      {/* Hôte */}
      <Part id="host" x={8} y={150} w={112} h={140} label="CPU + RAM" sub="(hôte)" hl={hl} sel={sel} onPick={onPick} fs={12} />
      {/* bus PCIe */}
      <line x1={120} y1={220} x2={150} y2={220} stroke="var(--purple)" strokeWidth={6} />
      <line x1={150} y1={220} x2={150} y2={40} stroke="var(--purple)" strokeWidth={6} />
      <line x1={150} y1={40} x2={170} y2={40} stroke="var(--purple)" strokeWidth={6} />
      <text x={135} y={212} fontSize="10" fill="var(--purple)" textAnchor="middle">PCIe</text>

      {/* carte GPU */}
      <rect x={160} y={10} width={594} height={442} rx={12} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="6 4" />
      <text x={748} y={446} fontSize="10" fill="var(--muted)" textAnchor="end">Carte / module GPU</text>

      {/* bandeau haut */}
      <Part id="pcie" x={172} y={22} w={128} h={38} label="Interface PCIe" hl={hl} sel={sel} onPick={onPick} />
      <Part id="copy" x={308} y={22} w={120} h={38} label="Moteurs de copie" sub="DMA" hl={hl} sel={sel} onPick={onPick} />
      <Part id="gigathread" x={436} y={22} w={178} h={38} label="GigaThread Engine" sub="ordonnanceur global" hl={hl} sel={sel} onPick={onPick} />
      <Part id="nvlink" x={622} y={22} w={120} h={38} label="NVLink" sub="vers autres GPU" hl={hl} sel={sel} onPick={onPick} />

      {gpcs}

      <Part id="l2" x={172} y={170} w={558} h={56} label="Cache L2 (50 Mo, partagé par tous les SM)" hl={hl} sel={sel} onPick={onPick} fs={12} />

      <Part id="memctrl" x={172} y={332} w={558} h={24} label="Contrôleurs mémoire" hl={hl} sel={sel} onPick={onPick} />
      {[0, 1, 2, 3, 4].map((k) => (
        <Part key={k} id="hbm" x={172 + k * 114} y={366} w={102} h={66} label="HBM" sub="16 Go" hl={hl} sel={sel} onPick={onPick} fs={12} />
      ))}
    </svg>
  )
}

function SmView({ hl, sel, onPick }) {
  const parts = []
  const pw = 355, ph = 250
  for (let p = 0; p < 4; p++) {
    const px = 18 + (p % 2) * (pw + 14)
    const py = 36 + Math.floor(p / 2) * (ph + 12)
    parts.push(
      <g key={p}>
        <rect x={px} y={py} width={pw} height={ph} rx={8} fill="none" stroke="var(--border)" strokeWidth={1.5} />
        <text x={px + 8} y={py + 14} fontSize="10" fill="var(--muted)">Quart de SM n°{p + 1}</text>
        <Part id="l0" x={px + 8} y={py + 20} w={pw - 16} h={20} label="Cache d'instructions L0" hl={hl} sel={sel} onPick={onPick} fs={10} />
        <Part id="warpsched" x={px + 8} y={py + 44} w={pw - 16} h={22} label="Ordonnanceur de warps (32 threads/cycle)" hl={hl} sel={sel} onPick={onPick} fs={10} />
        <Part id="warpsched" x={px + 8} y={py + 70} w={pw - 16} h={20} label="Unité de dispatch" hl={hl} sel={sel} onPick={onPick} fs={10} />
        <Part id="regfile" x={px + 8} y={py + 94} w={pw - 16} h={26} label="Banc de registres (64 Ko)" hl={hl} sel={sel} onPick={onPick} fs={11} />
        {/* unités FP32/INT32 */}
        {Array.from({ length: 32 }).map((_, k) => (
          <Part key={k} id="cudacore" x={px + 8 + (k % 16) * 11} y={py + 126 + Math.floor(k / 16) * 26} w={9} h={22} hl={hl} sel={sel} onPick={onPick} rx={1.5} />
        ))}
        <text x={px + 96} y={py + 190} fontSize="9.5" fill="var(--muted)" textAnchor="middle">32 cœurs CUDA FP32 (+ INT32, FP64)</text>
        <Part id="tensorcore" x={px + 190} y={py + 126} w={pw - 198} h={62} label="Tensor Core" sub="4e génération" hl={hl} sel={sel} onPick={onPick} fs={12} />
        {Array.from({ length: 8 }).map((_, k) => (
          <Part key={k} id="ldst" x={px + 8 + k * 22} y={py + 200} w={19} h={40} hl={hl} sel={sel} onPick={onPick} rx={2} />
        ))}
        <text x={px + 92} y={py + 223} fontSize="9" fill="var(--text)" textAnchor="middle" pointerEvents="none">LD/ST ×8</text>
        <Part id="sfu" x={px + 190} y={py + 200} w={pw - 198} h={40} label="SFU ×4" sub="exp, √, sin…" hl={hl} sel={sel} onPick={onPick} fs={11} />
      </g>,
    )
  }
  return (
    <svg viewBox="0 0 760 640" width="760" role="img" aria-label="Schéma d'un SM">
      <text x={18} y={24} fontSize="13" fontWeight="700" fill="var(--text)">Intérieur d'un SM (Streaming Multiprocessor) — architecture Hopper</text>
      {parts}
      <Part id="tma" x={18} y={562} w={130} h={62} label="TMA" sub="copies de tuiles" hl={hl} sel={sel} onPick={onPick} fs={12} />
      <Part id="smem" x={158} y={562} w={584} h={62} label="Mémoire partagée / cache L1 (256 Ko)" sub="partagée par tous les threads d'un bloc" hl={hl} sel={sel} onPick={onPick} fs={13} />
    </svg>
  )
}

/** Schéma interactif du GPU. highlight = liste d'identifiants de composants à faire clignoter. */
export default function GpuDiagram({ highlight = [], defaultView = 'chip', view: forcedView, interactive = true, showViewSwitch = true }) {
  const [viewState, setView] = useState(defaultView)
  const view = forcedView || viewState
  const [sel, setSel] = useState(null)
  const onPick = (id) => {
    if (!interactive) return
    setSel(id)
    if (id === 'sm' && view === 'chip') setView('sm')
  }
  const c = sel ? byId[sel] : null
  return (
    <div>
      {showViewSwitch && (
        <div className="row" style={{ marginBottom: 10 }}>
          <button className={`btn small ${view === 'chip' ? 'active' : ''}`} onClick={() => setView('chip')}>Vue d'ensemble de la puce</button>
          <button className={`btn small ${view === 'sm' ? 'active' : ''}`} onClick={() => setView('sm')}>Zoom sur un SM</button>
          <span className="spacer" />
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.75rem' }}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: FILL[k], border: `1.5px solid ${STROKE[k]}` }} />
                {v.label}
              </span>
            ))}
          </span>
        </div>
      )}
      <div className="svg-wrap">{view === 'chip' ? <ChipView hl={highlight} sel={sel} onPick={onPick} /> : <SmView hl={highlight} sel={sel} onPick={onPick} />}</div>
      {interactive && (
        <div className="step-box" style={{ marginTop: 10, minHeight: 90 }}>
          {c ? (
            <>
              <div className="step-title">
                {c.name} <span className="def-en">({c.en})</span>
              </div>
              <div style={{ fontStyle: 'italic', marginBottom: 6 }}>{c.short}</div>
              <div style={{ fontSize: '0.93rem' }}>{c.detail}</div>
              <div className="def-role">
                <b>Rôle dans l'inférence :</b> {c.role}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 6 }}>📏 {c.example}</div>
            </>
          ) : (
            <span style={{ color: 'var(--muted)' }}>
              👆 Cliquez sur n'importe quel élément du schéma pour afficher sa définition et son rôle dans l'inférence.
              {view === 'chip' && ' Cliquez sur un petit carré (un SM) pour zoomer à l\'intérieur.'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
