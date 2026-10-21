import React, { useEffect, useRef, useState } from 'react'
import { Stat } from '../components/ui.jsx'

// Modèle simplifié : CPU = 8 cœurs rapides (1 tâche / tick) ; GPU = 512 cœurs lents (1 tâche / 4 ticks).
const CPU_CORES = 8
const CPU_COST = 1
const GPU_CORES = 512
const GPU_COST = 4

const SCENARIOS = {
  parallel: {
    label: '2 048 multiplications indépendantes',
    desc: "Comme dans un produit matriciel : chaque multiplication peut être faite sans attendre les autres.",
    tasks: 2048,
    dependent: false,
  },
  sequential: {
    label: '40 étapes qui dépendent chacune de la précédente',
    desc: "Comme une recette où chaque étape a besoin du résultat de l'étape d'avant : impossible de paralléliser.",
    tasks: 40,
    dependent: true,
  },
}

function timeFor(s, cores, cost) {
  if (s.dependent) return s.tasks * cost
  return Math.ceil(s.tasks / cores) * cost
}

function Bar({ label, done, total, color, time }) {
  const pct = Math.min(100, (done / total) * 100)
  return (
    <div style={{ margin: '10px 0' }}>
      <div className="row" style={{ fontSize: '0.9rem' }}>
        <b>{label}</b>
        <span className="spacer" />
        <span className="mono">{Math.floor(done)} / {total} tâches{time != null ? ` — terminé en ${time} ticks` : ''}</span>
      </div>
      <div style={{ height: 18, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden', marginTop: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.05s linear' }} />
      </div>
    </div>
  )
}

export default function CpuGpuRace() {
  const [key, setKey] = useState('parallel')
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const s = SCENARIOS[key]
  const cpuT = timeFor(s, CPU_CORES, CPU_COST)
  const gpuT = timeFor(s, GPU_CORES, GPU_COST)
  const maxT = Math.max(cpuT, gpuT)
  const raf = useRef()

  useEffect(() => {
    if (!running) return
    const speed = maxT / 180 // ~3 secondes d'animation
    const step = () => {
      setTick((t) => {
        const nt = t + speed
        if (nt >= maxT) {
          setRunning(false)
          return maxT
        }
        return nt
      })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [running, maxT])

  const doneAt = (T) => Math.min(s.tasks, (Math.min(tick, T) / T) * s.tasks)
  const reset = (k) => {
    setRunning(false)
    setTick(0)
    if (k) setKey(k)
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {Object.entries(SCENARIOS).map(([k, v]) => (
          <button key={k} className={`btn small ${k === key ? 'active' : ''}`} onClick={() => reset(k)}>{v.label}</button>
        ))}
      </div>
      <p style={{ fontSize: '0.92rem', color: 'var(--muted)', margin: '4px 0 10px' }}>{s.desc}</p>
      <div className="stats">
        <Stat label="CPU" value={`${CPU_CORES} cœurs rapides`} />
        <Stat label="GPU" value={`${GPU_CORES} cœurs lents`} />
        <Stat label="Coût d'une tâche" value={`CPU ${CPU_COST} / GPU ${GPU_COST} ticks`} />
      </div>
      <Bar label="🧠 CPU" done={doneAt(cpuT)} total={s.tasks} color="var(--blue)" time={tick >= cpuT ? cpuT : null} />
      <Bar label="🟩 GPU" done={doneAt(gpuT)} total={s.tasks} color="var(--accent-strong)" time={tick >= gpuT ? gpuT : null} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={() => { setTick(0); setRunning(true) }} disabled={running}>▶ Lancer la course</button>
        <button className="btn" onClick={() => reset()}>Réinitialiser</button>
      </div>
      {tick >= maxT && (
        <div className="quiz-expl" style={{ marginTop: 12 }}>
          {s.dependent
            ? `Le CPU gagne (${cpuT} ticks contre ${gpuT}) : les tâches dépendent les unes des autres, donc un seul cœur travaille à la fois, et un cœur de CPU est plus rapide qu'un cœur de GPU.`
            : `Le GPU gagne largement (${gpuT} ticks contre ${cpuT}, soit ${Math.round(cpuT / gpuT)}× plus rapide) : même si chaque cœur est 4× plus lent, il y en a 64× plus qui travaillent en même temps.`}
        </div>
      )}
    </div>
  )
}
