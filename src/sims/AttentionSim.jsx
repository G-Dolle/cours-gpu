import React, { useState } from 'react'

// Exemple jouet : 4 tokens, vecteurs de dimension 3, valeurs choisies à la main pour être lisibles.
const TOKENS = ['Le', 'chat', 'noir', 'dort']
const Q = [
  [0.3, 0.3, 0.3],
  [0.5, 2.5, 0.3], // « chat » cherche un adjectif
  [3.0, 0.3, 1.5], // « noir » cherche le nom qu'il qualifie
  [2.5, 0.0, 2.5], // « dort » cherche son sujet
]
const K = [
  [0.2, 0.1, 0.0],
  [1.0, 0.2, 0.9],
  [0.3, 1.0, 0.2],
  [0.8, 0.1, 0.5],
]
const V = [
  [0.1, 0.0, 0.0],
  [0.0, 1.0, 0.2],
  [0.1, 0.2, 1.0],
  [0.9, 0.1, 0.1],
]
const D = 3
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0)

function attention(masked) {
  return Q.map((q, i) => {
    const raw = K.map((k) => dot(q, k) / Math.sqrt(D))
    const vis = raw.map((s, j) => (masked && j > i ? -Infinity : s))
    const m = Math.max(...vis)
    const e = vis.map((s) => (s === -Infinity ? 0 : Math.exp(s - m)))
    const sum = e.reduce((a, b) => a + b, 0)
    const w = e.map((v) => v / sum)
    const out = [0, 1, 2].map((d) => w.reduce((s, wj, j) => s + wj * V[j][d], 0))
    return { raw, vis, w, out }
  })
}

const vec = (v) => `[${v.map((x) => x.toFixed(2)).join(', ')}]`

export default function AttentionSim() {
  const [qi, setQi] = useState(2)
  const [masked, setMasked] = useState(true)
  const A = attention(masked)
  const row = A[qi]
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: '0.9rem' }}>Token qui « pose la question » (requête) :</span>
        {TOKENS.map((t, i) => (
          <button key={t} className={`btn small ${i === qi ? 'active' : ''}`} onClick={() => setQi(i)}>{t}</button>
        ))}
        <label style={{ fontSize: '0.9rem', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} /> Masque causal
        </label>
      </div>

      <div className="grid-2">
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Matrice d'attention (lignes : requêtes, colonnes : clés)</div>
          <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(4, 1fr)`, gap: 3, fontSize: '0.8rem' }}>
            <div />
            {TOKENS.map((t) => <div key={t} style={{ textAlign: 'center', fontWeight: 600 }}>{t}</div>)}
            {A.map((r, i) => (
              <React.Fragment key={i}>
                <div style={{ fontWeight: 600, alignSelf: 'center', color: i === qi ? 'var(--accent)' : 'var(--text)' }}>{TOKENS[i]}</div>
                {r.w.map((w, j) => {
                  const hidden = masked && j > i
                  return (
                    <div key={j} onClick={() => setQi(i)} className="cell" style={{
                      cursor: 'pointer',
                      background: hidden ? 'repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 4px, var(--border) 4px, var(--border) 6px)' : `rgba(118,185,0,${0.1 + w * 0.9})`,
                      outline: i === qi ? '2px solid var(--accent)' : 'none',
                      color: w > 0.55 ? '#fff' : 'var(--text)',
                    }}>
                      {hidden ? '—' : w.toFixed(2)}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Chaque ligne somme à 1. Les cases hachurées sont masquées : un token ne peut pas regarder les tokens <b>futurs</b> (il ne les connaît pas encore lors de la génération).
          </p>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Détail du calcul pour « {TOKENS[qi]} »</div>
          <div style={{ fontSize: '0.85rem' }}>
            <div><b>1. Scores</b> : q · k / √{D} <span className="pill gpu">Tensor Cores</span></div>
            {TOKENS.map((t, j) => (
              <div key={t} className="mono" style={{ fontSize: '0.78rem', opacity: masked && j > qi ? 0.35 : 1 }}>
                {t.padEnd(5, ' ')}: {row.raw[j].toFixed(2)}{masked && j > qi ? ' → masqué (−∞)' : ''}
              </div>
            ))}
            <div style={{ marginTop: 6 }}><b>2. Softmax</b> → poids d'attention <span className="pill gpu">SFU + réduction</span></div>
            {TOKENS.map((t, j) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <span className="mono" style={{ width: 40 }}>{t}</span>
                <div style={{ height: 10, width: `${row.w[j] * 150}px`, background: 'var(--accent-strong)', borderRadius: 2 }} />
                <span className="mono">{(row.w[j] * 100).toFixed(0)} %</span>
              </div>
            ))}
            <div style={{ marginTop: 6 }}><b>3. Sortie</b> = Σ poids × v <span className="pill gpu">Tensor Cores</span></div>
            <div className="mono" style={{ fontSize: '0.78rem' }}>{vec(row.out)}</div>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>
        Observez « noir » : il porte l'essentiel de son attention sur « chat », le nom qu'il qualifie. Sa nouvelle représentation mélange donc sa propre information et
        celle de « chat ». C'est ainsi que le sens circule entre les mots. Dans un vrai modèle, les vecteurs ont 128 dimensions par tête, il y a des dizaines de têtes, et
        Q, K, V sont obtenus en multipliant chaque embedding par des matrices de poids apprises.
      </p>
    </div>
  )
}
