import React, { useEffect, useMemo, useState } from 'react'
import { Stat } from '../components/ui.jsx'

const N = 8

function Grid({ label, cls, size = 22 }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${N}, ${size}px)`, gap: 2 }}>
        {Array.from({ length: N * N }).map((_, k) => {
          const r = Math.floor(k / N), c = k % N
          const s = cls(r, c)
          return <div key={k} style={{ width: size, height: size, borderRadius: 3, ...s }} />
        })}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

const BASE = { background: 'var(--surface-2)', border: '1px solid var(--border)' }
const A_ON = { background: 'var(--blue)', border: '1px solid var(--blue)' }
const B_ON = { background: 'var(--orange)', border: '1px solid var(--orange)' }
const C_CUR = { background: 'var(--accent-strong)', border: '1px solid var(--accent)' }
const C_DONE = { background: 'var(--accent-soft)', border: '1px solid var(--accent)' }

export default function MatmulSim() {
  const [T, setT] = useState(4)
  const [step, setStep] = useState(0)
  const [play, setPlay] = useState(false)
  const nb = N / T // blocs par dimension
  const steps = useMemo(() => {
    const s = []
    for (let bi = 0; bi < nb; bi++) for (let bj = 0; bj < nb; bj++) for (let p = 0; p < nb; p++) s.push({ bi, bj, p })
    return s
  }, [nb])

  useEffect(() => { setStep(0); setPlay(false) }, [T])
  useEffect(() => {
    if (!play) return
    if (step >= steps.length - 1) { setPlay(false); return }
    const id = setTimeout(() => setStep((v) => v + 1), T === 1 ? 60 : 700)
    return () => clearTimeout(id)
  }, [play, step, steps.length, T])

  const cur = steps[step]
  const inTileA = (r, c) => Math.floor(r / T) === cur.bi && Math.floor(c / T) === cur.p
  const inTileB = (r, c) => Math.floor(r / T) === cur.p && Math.floor(c / T) === cur.bj
  const blockIdx = (bi, bj) => bi * nb + bj
  const curBlock = blockIdx(cur.bi, cur.bj)
  const cStyle = (r, c) => {
    const b = blockIdx(Math.floor(r / T), Math.floor(c / T))
    if (b === curBlock) return C_CUR
    if (b < curBlock) return C_DONE
    return BASE
  }

  const readsPerPhase = 2 * T * T
  const reads = (step + 1) * readsPerPhase
  const totalReads = steps.length * readsPerPhase
  const naiveTotal = 2 * N * N * N

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: '0.9rem' }}>Taille des tuiles :</span>
        {[1, 2, 4].map((v) => (
          <button key={v} className={`btn small ${v === T ? 'active' : ''}`} onClick={() => setT(v)}>
            {v === 1 ? '1×1 (naïf, sans tuilage)' : `${v}×${v}`}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 22, alignItems: 'flex-start' }}>
        <Grid label="A (entrées)" cls={(r, c) => (inTileA(r, c) ? A_ON : BASE)} />
        <Grid label="B (poids)" cls={(r, c) => (inTileB(r, c) ? B_ON : BASE)} />
        <Grid label="C = A × B (résultat)" cls={cStyle} />
      </div>
      <div className="step-box" style={{ marginTop: 12 }}>
        <div className="step-title">
          Bloc de threads ({cur.bi}, {cur.bj}) — phase {cur.p + 1} / {nb}
        </div>
        <div style={{ fontSize: '0.92rem' }}>
          {T === 1 ? (
            <>Sans tuilage, chaque thread calcule une case de C en lisant lui-même, depuis la HBM, les valeurs de A et B dont il a besoin, une par une. Aucune donnée n'est partagée : la même valeur de B est relue par {N} threads différents.</>
          ) : (
            <>
              Le bloc de {T}×{T} = {T * T} threads copie une tuile de <span style={{ color: 'var(--blue)', fontWeight: 700 }}>A</span> et une tuile de{' '}
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>B</span> ({readsPerPhase} valeurs) de la HBM vers la <b>mémoire partagée</b>. Puis chaque thread
              fait {T} multiplications-additions en réutilisant ces tuiles, et accumule dans ses <b>registres</b>. Chaque valeur chargée est réutilisée {T} fois.
            </>
          )}
        </div>
      </div>
      <div className="stepper-head" style={{ marginTop: 10 }}>
        <button className="btn small" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>◀</button>
        <button className="btn small primary" onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1}>Phase suivante ▶</button>
        <button className={`btn small ${play ? 'active' : ''}`} onClick={() => setPlay(!play)}>{play ? '⏸ Pause' : '▶ Tout jouer'}</button>
        <button className="btn small" onClick={() => { setStep(0); setPlay(false) }}>⏮ Recommencer</button>
      </div>
      <div className="stats">
        <Stat label="Lectures HBM jusqu'ici" value={reads} />
        <Stat label="Lectures HBM au total" value={totalReads} />
        <Stat label="Sans tuilage" value={naiveTotal} />
        <Stat label="Économie" value={`÷ ${naiveTotal / totalReads}`} />
      </div>
      <p style={{ fontSize: '0.9rem', margin: 0 }}>
        Règle générale : avec des tuiles de taille T, le nombre de lectures en mémoire globale est divisé par T. Les vrais kernels utilisent des tuiles de 128×128
        ou plus, limitées par la taille de la mémoire partagée et des registres.
      </p>
    </div>
  )
}
