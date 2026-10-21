import React, { useEffect, useState } from 'react'
import { Stat } from '../components/ui.jsx'

const BLOCK_COLORS = ['#76b900', '#2563c9', '#c2620a', '#7a45c4', '#c0392b', '#0f8f8f']

/** Montre comment l'indice global d'un thread est calculé à partir de blockIdx et threadIdx. */
export function ThreadIndexSim() {
  const [blockDim, setBlockDim] = useState(8)
  const N = 24
  const nBlocks = Math.ceil(N / blockDim)
  const [hover, setHover] = useState(11)
  const b = Math.floor(hover / blockDim)
  const t = hover % blockDim
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          Threads par bloc (blockDim) :
          <select value={blockDim} onChange={(e) => setBlockDim(Number(e.target.value))}>
            {[4, 6, 8, 12].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          → grille de <b>{nBlocks}</b> blocs pour traiter un vecteur de {N} éléments
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {Array.from({ length: N }).map((_, i) => {
          const bi = Math.floor(i / blockDim)
          return (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
              className="cell"
              style={{
                width: 34, cursor: 'pointer',
                background: BLOCK_COLORS[bi % BLOCK_COLORS.length] + (i === hover ? 'ff' : '44'),
                color: i === hover ? '#fff' : 'var(--text)',
                marginRight: (i + 1) % blockDim === 0 ? 8 : 0,
              }}
            >
              {i}
            </div>
          )
        })}
      </div>
      <div className="formula">
        {`Thread survolé : blockIdx = ${b}, threadIdx = ${t}\nindice global i = blockIdx × blockDim + threadIdx = ${b} × ${blockDim} + ${t} = ${hover}\n→ ce thread calcule y[${hover}] = relu(x[${hover}])`}
      </div>
    </div>
  )
}

/** Répartition des blocs d'un kernel sur les SM, par « vagues ». */
export function BlockSchedulerSim() {
  const [nSM, setNSM] = useState(4)
  const [nBlocks, setNBlocks] = useState(14)
  const [perSM, setPerSM] = useState(2)
  const [t, setT] = useState(0)
  const [run, setRun] = useState(false)
  const slots = nSM * perSM
  const waves = Math.ceil(nBlocks / slots)

  // t = 0 : pas démarré ; 1..waves : vague en cours ; waves + 1 : terminé
  useEffect(() => {
    if (!run) return
    if (t > waves) {
      setRun(false)
      return
    }
    const id = setTimeout(() => setT((v) => v + 1), 900)
    return () => clearTimeout(id)
  }, [run, t, waves])

  useEffect(() => {
    setT(0)
    setRun(false)
  }, [nSM, nBlocks, perSM])

  // le bloc b s'exécute pendant la vague floor(b / slots), sur le SM (b % slots) % nSM
  const status = (b) => {
    if (t === 0) return 'wait'
    const w = Math.floor(b / slots)
    if (w < t - 1) return 'done'
    if (w === t - 1) return 'run'
    return 'wait'
  }
  const lastWaveUse = nBlocks - (waves - 1) * slots

  return (
    <div>
      <div className="row" style={{ gap: 16, marginBottom: 10 }}>
        <label className="field">Nombre de SM : {nSM}<input type="range" min={1} max={8} value={nSM} onChange={(e) => setNSM(+e.target.value)} /></label>
        <label className="field">Blocs dans la grille : {nBlocks}<input type="range" min={1} max={40} value={nBlocks} onChange={(e) => setNBlocks(+e.target.value)} /></label>
        <label className="field">Blocs simultanés par SM : {perSM}<input type="range" min={1} max={4} value={perSM} onChange={(e) => setPerSM(+e.target.value)} /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${nSM}, 1fr)`, gap: 8 }}>
        {Array.from({ length: nSM }).map((_, s) => (
          <div key={s} style={{ border: '1.5px solid var(--accent)', borderRadius: 8, padding: 6, minHeight: 70, background: 'var(--accent-soft)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>SM {s}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
              {t > 0 &&
                Array.from({ length: nBlocks })
                  .map((_, b) => b)
                  .filter((b) => Math.floor(b / slots) === t - 1 && (b % slots) % nSM === s)
                  .map((b) => (
                    <div key={b} className="cell" style={{ minWidth: 30, height: 24, background: BLOCK_COLORS[b % 6], color: '#fff' }}>B{b}</div>
                  ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: '0.85rem' }}>
        <b>File d'attente de l'ordonnanceur global :</b>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
          {Array.from({ length: nBlocks }).map((_, b) => {
            const st = status(b)
            return (
              <div key={b} className="cell" style={{ minWidth: 30, height: 22, opacity: st === 'done' ? 0.25 : 1, background: st === 'run' ? BLOCK_COLORS[b % 6] : 'var(--surface-2)', color: st === 'run' ? '#fff' : 'var(--text)' }}>
                {st === 'done' ? '✓' : `B${b}`}
              </div>
            )
          })}
        </div>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={() => { setT(1); setRun(true) }} disabled={run}>▶ Lancer le kernel</button>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{t > waves ? `Terminé en ${waves} vague(s)` : t > 0 ? `Vague ${t} / ${waves} en cours` : ''}</span>
      </div>
      <div className="stats">
        <Stat label="Emplacements simultanés" value={slots} />
        <Stat label="Nombre de vagues" value={waves} />
        <Stat label="Occupation dernière vague" value={`${Math.round((lastWaveUse / slots) * 100)} %`} />
      </div>
      <p style={{ fontSize: '0.9rem', margin: 0 }}>
        Si la dernière vague est peu remplie, une partie du GPU reste inactive : c'est l'effet de « queue de vague » (<i>wave quantization</i>).
        Avec trop peu de blocs (moins que le nombre de SM), certains SM ne font rien du tout.
      </p>
    </div>
  )
}

const DIV_CASES = {
  none: { label: 'Pas de condition', cond: () => true, code: 'y[i] = x[i] * 2;', twoPaths: false },
  half: { label: 'if (i < 16)', cond: (i) => i < 16, code: 'if (i < 16) y[i] = x[i] * 2;\nelse        y[i] = 0;', twoPaths: true },
  odd: { label: 'if (i % 2 == 0)', cond: (i) => i % 2 === 0, code: 'if (i % 2 == 0) y[i] = x[i] * 2;\nelse            y[i] = 0;', twoPaths: true },
  relu: { label: 'ReLU sans branche', cond: () => true, code: 'y[i] = max(x[i], 0.0f);  // une seule instruction', twoPaths: false },
}

/** Divergence de warp : les 32 threads d'un warp exécutent la même instruction. */
export function WarpDivergenceSim() {
  const [k, setK] = useState('half')
  const c = DIV_CASES[k]
  const passes = c.twoPaths ? 2 : 1
  const lane = (i, pass) => {
    if (!c.twoPaths) return true
    return pass === 0 ? c.cond(i) : !c.cond(i)
  }
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {Object.entries(DIV_CASES).map(([kk, v]) => (
          <button key={kk} className={`btn small ${kk === k ? 'active' : ''}`} onClick={() => setK(kk)}>{v.label}</button>
        ))}
      </div>
      <pre><code>{c.code}</code></pre>
      {Array.from({ length: passes }).map((_, p) => (
        <div key={p} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 3 }}>
            {c.twoPaths ? (p === 0 ? 'Passe 1 : branche « if »' : 'Passe 2 : branche « else »') : 'Passe unique'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(32, 1fr)', gap: 2 }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} title={`thread ${i}`} style={{ height: 22, borderRadius: 3, background: lane(i, p) ? 'var(--accent-strong)' : 'var(--surface-2)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        </div>
      ))}
      <p style={{ fontSize: '0.9rem', margin: 0 }}>
        {c.twoPaths
          ? `Les 32 threads doivent exécuter les deux branches l'une après l'autre ; à chaque passe, une partie des threads est « masquée » (en gris) et ne fait rien. Coût : ${passes} passes au lieu d'une, soit 50 % d'efficacité.`
          : "Tous les threads exécutent la même instruction en même temps : efficacité maximale. C'est pour cela que les kernels d'inférence évitent les branches (ReLU = max(x, 0) est une seule instruction)."}
      </p>
    </div>
  )
}
