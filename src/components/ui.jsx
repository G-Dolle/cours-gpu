import React, { useState } from 'react'

const ICONS = { info: 'ℹ️', tip: '💡', warn: '⚠️', analogy: '🧭', key: '🔑' }

export function Callout({ type = 'info', title, children }) {
  return (
    <div className={`callout ${type}`}>
      {title && <div className="callout-title">{ICONS[type]} {title}</div>}
      {children}
    </div>
  )
}

/** Définition d'un terme, avec son nom anglais et son rôle dans l'inférence. */
export function Def({ term, en, role, children, id }) {
  return (
    <div className="def" id={id}>
      <div className="def-term">
        {term}
        {en && <span className="def-en">({en})</span>}
      </div>
      <div className="def-body">{children}</div>
      {role && (
        <div className="def-role">
          <b>Rôle dans l'inférence :</b> {role}
        </div>
      )}
    </div>
  )
}

export function Card({ title, sub, sim, children }) {
  return (
    <div className="card">
      {title && (
        <div className="card-title">
          {sim && <span className="sim-badge">Simulateur</span>}
          {title}
        </div>
      )}
      {sub && <div className="card-sub">{sub}</div>}
      {children}
    </div>
  )
}

export function Objectives({ items }) {
  return (
    <div className="objectives">
      <h4>Dans ce chapitre, vous allez apprendre</h4>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Lecteur d'étapes générique : steps = [{ title, body, ... }].
 * render(step, index) permet d'afficher un visuel synchronisé avec l'étape courante.
 */
export function Stepper({ steps, render, autoLabel = 'Lecture auto' }) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const n = steps.length

  React.useEffect(() => {
    if (!playing) return
    if (i >= n - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setI((v) => v + 1), 2600)
    return () => clearTimeout(t)
  }, [playing, i, n])

  const s = steps[i]
  return (
    <div>
      <div className="stepper-head">
        <button className="btn small" onClick={() => setI(0)} disabled={i === 0}>⏮</button>
        <button className="btn small" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>◀ Précédent</button>
        <button className="btn small primary" onClick={() => setI(Math.min(n - 1, i + 1))} disabled={i === n - 1}>Suivant ▶</button>
        <button className={`btn small ${playing ? 'active' : ''}`} onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ Pause' : `▶ ${autoLabel}`}
        </button>
        <span className="spacer" />
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Étape {i + 1} / {n}
        </span>
      </div>
      <div className="step-dots" style={{ marginBottom: 12 }}>
        {steps.map((_, k) => (
          <button
            key={k}
            aria-label={`Étape ${k + 1}`}
            className={`step-dot ${k <= i ? 'on' : ''} ${k === i ? 'cur' : ''}`}
            onClick={() => setI(k)}
          />
        ))}
      </div>
      {render && render(s, i)}
      <div className="step-box" style={{ marginTop: 12 }}>
        <div className="step-title">{s.title}</div>
        {s.tags && (
          <div style={{ margin: '4px 0 6px' }}>
            {s.tags.map((t) => (
              <span key={t[1]} className={`pill ${t[0]}`}>{t[1]}</span>
            ))}
          </div>
        )}
        <div>{s.body}</div>
      </div>
    </div>
  )
}

export function Matrix({ data, fmt = (v) => v, cellClass, onCellClick, label }) {
  const cols = data[0].length
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className="matrix" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
        {data.map((row, r) =>
          row.map((v, c) => (
            <div
              key={`${r}-${c}`}
              className={`cell ${cellClass ? cellClass(r, c) || '' : ''}`}
              onClick={onCellClick ? () => onCellClick(r, c) : undefined}
              style={onCellClick ? { cursor: 'pointer' } : undefined}
            >
              {fmt(v)}
            </div>
          )),
        )}
      </div>
      {label && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{label}</div>}
    </div>
  )
}

export function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
