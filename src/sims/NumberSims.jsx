import React, { useState } from 'react'

// Arrondit x au format flottant (bits de mantisse m, exposant min/max normaux, valeur max).
function roundFloat(x, mBits, eMin, maxVal) {
  if (x === 0 || !isFinite(x)) return x
  const s = Math.sign(x)
  const a = Math.abs(x)
  let e = Math.floor(Math.log2(a))
  if (e < eMin) e = eMin // zone sous-normale : pas fixe
  const step = 2 ** (e - mBits)
  let r = Math.round(a / step) * step
  if (r > maxVal) return s * Infinity
  return s * r
}

const FORMATS = [
  { id: 'fp32', name: 'FP32', bits: [1, 8, 23], bytes: 4, conv: (x) => Math.fround(x), note: 'Précision « complète » historique. Utilisée pour accumuler les sommes.' },
  { id: 'bf16', name: 'BF16', bits: [1, 8, 7], bytes: 2, conv: (x) => roundFloat(x, 7, -126, 3.39e38), note: 'Même plage que FP32, moins de précision. Standard actuel des LLM.' },
  { id: 'fp16', name: 'FP16', bits: [1, 5, 10], bytes: 2, conv: (x) => roundFloat(x, 10, -14, 65504), note: 'Plus précis que BF16 mais plage limitée (max 65 504) : risque de débordement.' },
  { id: 'fp8', name: 'FP8 (E4M3)', bits: [1, 4, 3], bytes: 1, conv: (x) => roundFloat(x, 3, -6, 448), note: 'Supporté par les Tensor Cores depuis Hopper (H100). Max 448.' },
]

function BitBar({ bits }) {
  const [s, e, m] = bits
  const total = s + e + m
  const seg = (n, color, label) => (
    <div style={{ flex: n, background: color, color: '#fff', fontSize: '0.7rem', textAlign: 'center', padding: '2px 0', minWidth: 18 }}>{label}{n > 2 ? ` ${n}` : ''}</div>
  )
  return (
    <div style={{ display: 'flex', width: `${(total / 32) * 100}%`, minWidth: 90, borderRadius: 4, overflow: 'hidden' }}>
      {seg(s, '#7a45c4', 'S')}
      {seg(e, '#2563c9', 'exp')}
      {seg(m, '#4f8a00', 'mant')}
    </div>
  )
}

export function PrecisionSim() {
  const [x, setX] = useState(3.14159265)
  const [int8Range, setInt8Range] = useState(4)
  const scale = int8Range / 127
  const q = Math.max(-127, Math.min(127, Math.round(x / scale)))
  const int8Val = q * scale
  const fmt = (v) => (isFinite(v) ? Number(v.toPrecision(10)).toString() : v > 0 ? '+∞ (débordement)' : '−∞ (débordement)')
  const err = (v) => (isFinite(v) ? (x === 0 ? 0 : Math.abs((v - x) / x) * 100) : Infinity)
  const presets = [3.14159265, 0.001234, 1000.7, 70000, -2.5]
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          Nombre à stocker : <input type="number" value={x} step="any" onChange={(e) => setX(Number(e.target.value))} style={{ width: 150 }} />
        </label>
        {presets.map((p) => <button key={p} className="btn small" onClick={() => setX(p)}>{p}</button>)}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Format</th><th>Bits (signe / exposant / mantisse)</th><th>Valeur réellement stockée</th><th>Erreur</th></tr></thead>
          <tbody>
            {FORMATS.map((f) => {
              const v = f.conv(x)
              const e = err(v)
              return (
                <tr key={f.id}>
                  <td><b>{f.name}</b><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{f.bytes} octet{f.bytes > 1 ? 's' : ''}</div></td>
                  <td style={{ minWidth: 160 }}><BitBar bits={f.bits} /><div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>{f.note}</div></td>
                  <td className="mono">{fmt(v)}</td>
                  <td className="mono" style={{ color: e > 1 ? 'var(--red)' : 'inherit' }}>{isFinite(e) ? `${e.toFixed(e < 0.01 ? 5 : 2)} %` : '—'}</td>
                </tr>
              )
            })}
            <tr>
              <td><b>INT8</b><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>1 octet</div></td>
              <td>
                Entier de −127 à 127 × facteur d'échelle
                <label className="field" style={{ marginTop: 4 }}>
                  Plage couverte : ± {int8Range}
                  <input type="range" min={1} max={100} value={int8Range} onChange={(e) => setInt8Range(+e.target.value)} />
                </label>
              </td>
              <td className="mono">{q} × {scale.toFixed(4)} = {fmt(int8Val)}{Math.abs(x) > int8Range ? ' (écrêté)' : ''}</td>
              <td className="mono" style={{ color: err(int8Val) > 1 ? 'var(--red)' : 'inherit' }}>{err(int8Val).toFixed(2)} %</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.9rem', margin: 0 }}>
        L'<b>exposant</b> fixe l'ordre de grandeur (la plage de valeurs possibles), la <b>mantisse</b> fixe le nombre de chiffres significatifs (la finesse).
        Essayez 70 000 : FP16 déborde, BF16 non. Essayez 0.001234 avec INT8 : l'échelle est trop grossière.
      </p>
    </div>
  )
}

export function NeuronSim() {
  const [x, setX] = useState([1, 0.5, -1])
  const [w, setW] = useState([0.8, -0.4, 0.3])
  const [b, setB] = useState(0.1)
  const [act, setAct] = useState('relu')
  const z = x.reduce((s, v, i) => s + v * w[i], 0) + b
  const acts = {
    none: { f: (v) => v, name: 'aucune (identité)' },
    relu: { f: (v) => Math.max(0, v), name: 'ReLU : max(0, z)' },
    sigmoid: { f: (v) => 1 / (1 + Math.exp(-v)), name: 'sigmoïde : 1 / (1 + e^−z)' },
    gelu: { f: (v) => 0.5 * v * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (v + 0.044715 * v ** 3))), name: 'GELU (transformers)' },
  }
  const y = acts[act].f(z)
  const set = (arr, fn, i, v) => { const n = [...arr]; n[i] = v; fn(n) }
  const slider = (label, val, onChange, min = -2, max = 2) => (
    <label className="field" key={label}>
      {label} = <b style={{ color: 'var(--text)' }}>{val.toFixed(2)}</b>
      <input type="range" min={min} max={max} step={0.05} value={val} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
  return (
    <div>
      <div className="grid-2">
        <div>
          <b>Entrées (données)</b>
          {x.map((v, i) => slider(`x${i + 1}`, v, (nv) => set(x, setX, i, nv)))}
        </div>
        <div>
          <b>Poids (appris pendant l'entraînement)</b>
          {w.map((v, i) => slider(`w${i + 1}`, v, (nv) => set(w, setW, i, nv)))}
          {slider('biais b', b, setB)}
        </div>
      </div>
      <div className="row" style={{ margin: '10px 0' }}>
        <span style={{ fontSize: '0.9rem' }}>Activation :</span>
        {Object.entries(acts).map(([k, v]) => <button key={k} className={`btn small ${k === act ? 'active' : ''}`} onClick={() => setAct(k)}>{v.name}</button>)}
      </div>
      <div className="formula">
        {`z = ${x.map((v, i) => `${v.toFixed(2)}×${w[i].toFixed(2)}`).join(' + ')} + ${b.toFixed(2)} = ${z.toFixed(3)}\ny = activation(z) = ${y.toFixed(3)}`}
      </div>
    </div>
  )
}
