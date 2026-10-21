import React, { useState } from 'react'
import { Stat } from '../components/ui.jsx'

const MODELS = {
  'llama1b': { name: 'Llama 3.2 1B', params: 1.24e9, layers: 16, kvHeads: 8, headDim: 64 },
  'llama8b': { name: 'Llama 3.1 8B', params: 8.03e9, layers: 32, kvHeads: 8, headDim: 128 },
  'llama70b': { name: 'Llama 3.1 70B', params: 70.6e9, layers: 80, kvHeads: 8, headDim: 128 },
  'llama405b': { name: 'Llama 3.1 405B', params: 405e9, layers: 126, kvHeads: 8, headDim: 128 },
}
// Bande passante mémoire (octets/s), capacité (octets), puissance tensorielle 16 bits dense (FLOP/s)
const GPUS = {
  rtx3060: { name: 'RTX 3060 (12 Go)', mem: 12e9, bw: 360e9, flops: 25e12 },
  rtx4090: { name: 'RTX 4090 (24 Go)', mem: 24e9, bw: 1008e9, flops: 165e12 },
  a100: { name: 'A100 SXM (80 Go)', mem: 80e9, bw: 2039e9, flops: 312e12 },
  h100: { name: 'H100 SXM (80 Go)', mem: 80e9, bw: 3350e9, flops: 989e12 },
  h200: { name: 'H200 (141 Go)', mem: 141e9, bw: 4800e9, flops: 989e12 },
}
const PRECISIONS = {
  bf16: { name: 'BF16 (2 octets)', bytes: 2 },
  fp8: { name: 'FP8 / INT8 (1 octet)', bytes: 1 },
  int4: { name: 'INT4 (0,5 octet)', bytes: 0.5 },
}

const gb = (b) => `${(b / 1e9).toFixed(b < 10e9 ? 2 : 1)} Go`

export default function LlmCalculator() {
  const [m, setM] = useState('llama8b')
  const [g, setG] = useState('h100')
  const [p, setP] = useState('bf16')
  const [nGpu, setNGpu] = useState(1)
  const [ctx, setCtx] = useState(4096)
  const [batch, setBatch] = useState(1)
  const [prompt, setPrompt] = useState(1000)

  const M = MODELS[m], G = GPUS[g], P = PRECISIONS[p]
  const weights = M.params * P.bytes
  const kvPerToken = 2 * M.layers * M.kvHeads * M.headDim * 2 // K et V en 16 bits
  const kvTotal = kvPerToken * ctx * batch
  const overhead = 0.1 * weights // activations, buffers, contexte CUDA (ordre de grandeur)
  const needed = weights + kvTotal + overhead
  const available = G.mem * nGpu
  const fits = needed <= available
  const bw = G.bw * nGpu * 0.8 // efficacité réaliste ~80 %, parallélisme de tenseurs idéal
  const flops = G.flops * nGpu * 0.5 * (P.bytes < 2 && g !== 'rtx3060' ? 2 : 1) // ~50 % d'efficacité ; FP8 double le débit si supporté

  // Décodage : à chaque pas, on lit tous les poids + le cache KV moyen du lot
  const kvRead = kvPerToken * (ctx / 2) * batch
  const tStepMem = (weights + kvRead) / bw
  const tStepCompute = (2 * M.params * batch) / flops
  const tStep = Math.max(tStepMem, tStepCompute)
  const tokPerSeq = 1 / tStep
  const tokTotal = batch / tStep
  const boundDecode = tStepMem >= tStepCompute ? 'mémoire' : 'calcul'
  // Prefill : 2 × params × tokens du prompt
  const tPrefill = Math.max((2 * M.params * prompt) / flops, weights / bw)
  const minGpus = Math.ceil(needed / G.mem)

  const sel = (label, val, set, opts) => (
    <label className="field">
      {label}
      <select value={val} onChange={(e) => set(e.target.value)}>
        {Object.entries(opts).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
      </select>
    </label>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        {sel('Modèle', m, setM, MODELS)}
        {sel('GPU', g, setG, GPUS)}
        {sel('Précision des poids', p, setP, PRECISIONS)}
        <label className="field">Nombre de GPU
          <select value={nGpu} onChange={(e) => setNGpu(+e.target.value)}>{[1, 2, 4, 8].map((v) => <option key={v}>{v}</option>)}</select>
        </label>
        <label className="field">Longueur de contexte : {ctx.toLocaleString('fr')} tokens
          <input type="range" min={9} max={17} value={Math.log2(ctx)} onChange={(e) => setCtx(2 ** +e.target.value)} />
        </label>
        <label className="field">Utilisateurs simultanés (lot) : {batch}
          <input type="range" min={0} max={8} value={Math.log2(batch)} onChange={(e) => setBatch(2 ** +e.target.value)} />
        </label>
        <label className="field">Longueur du prompt : {prompt} tokens
          <input type="range" min={10} max={8000} step={10} value={prompt} onChange={(e) => setPrompt(+e.target.value)} />
        </label>
      </div>

      <h3 style={{ marginTop: 18 }}>Mémoire</h3>
      <div className="stats">
        <Stat label="Poids" value={gb(weights)} />
        <Stat label="Cache KV" value={gb(kvTotal)} />
        <Stat label="Divers (~10 %)" value={gb(overhead)} />
        <Stat label="Total nécessaire" value={gb(needed)} />
        <Stat label="Disponible" value={gb(available)} />
      </div>
      <div style={{ height: 22, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
        <div title="Poids" style={{ width: `${Math.min(100, (weights / available) * 100)}%`, background: 'var(--blue)' }} />
        <div title="Cache KV" style={{ width: `${Math.min(100, (kvTotal / available) * 100)}%`, background: 'var(--orange)' }} />
        <div title="Divers" style={{ width: `${Math.min(100, (overhead / available) * 100)}%`, background: 'var(--muted)' }} />
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
        <span style={{ color: 'var(--blue)' }}>■</span> poids <span style={{ color: 'var(--orange)' }}>■</span> cache KV <span style={{ color: 'var(--muted)' }}>■</span> divers
      </div>
      <div className="quiz-expl" style={{ background: fits ? 'var(--accent-soft)' : 'var(--red-soft)', marginTop: 8 }}>
        {fits
          ? `✅ Ça tient en mémoire (${Math.round((needed / available) * 100)} % utilisés).`
          : `❌ Ça ne tient pas : il faudrait au moins ${minGpus} × ${G.name}, ou une précision plus faible (quantification), ou un contexte / lot plus petit.`}
      </div>

      {fits && (
        <>
          <h3>Vitesse (estimation théorique optimiste)</h3>
          <div className="stats">
            <Stat label="Temps de prefill (TTFT)" value={`${(tPrefill * 1000).toFixed(0)} ms`} />
            <Stat label="Temps par token (décodage)" value={`${(tStep * 1000).toFixed(1)} ms`} />
            <Stat label="Tokens/s par utilisateur" value={tokPerSeq.toFixed(0)} />
            <Stat label="Tokens/s au total" value={tokTotal.toFixed(0)} />
            <Stat label="Décodage limité par" value={boundDecode === 'mémoire' ? '🧱 mémoire' : '⚙️ calcul'} />
          </div>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            Hypothèses : bande passante utilisée à 80 %, calcul à 50 % du pic, parallélisme parfait entre GPU (en réalité, la communication NVLink/PCIe coûte du temps).
            Augmentez le nombre d'utilisateurs simultanés : le débit total grimpe presque proportionnellement tant que le décodage reste limité par la mémoire, car les poids lus
            une fois servent à tout le lot.
          </p>
        </>
      )}
    </div>
  )
}
