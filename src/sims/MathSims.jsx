import React, { useState } from 'react'
import { Matrix } from '../components/ui.jsx'

/** Produit scalaire interactif entre deux vecteurs. */
export function DotProductSim() {
  const [a, setA] = useState([2, -1, 3])
  const [b, setB] = useState([1, 4, 0.5])
  const prods = a.map((v, i) => v * b[i])
  const sum = prods.reduce((s, v) => s + v, 0)
  const upd = (arr, set, i, v) => {
    const n = [...arr]
    n[i] = Number(v)
    set(n)
  }
  return (
    <div>
      <div className="grid-2">
        {[['Vecteur a', a, setA], ['Vecteur b', b, setB]].map(([lbl, arr, set]) => (
          <div key={lbl}>
            <b>{lbl}</b>
            <div className="row" style={{ marginTop: 6 }}>
              {arr.map((v, i) => (
                <input key={i} type="number" step="0.5" value={v} style={{ width: 70 }} onChange={(e) => upd(arr, set, i, e.target.value)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="formula">
        {`a · b = ${a.map((v, i) => `(${v} × ${b[i]})`).join(' + ')}\n      = ${prods.map((p) => p).join(' + ')}\n      = ${sum}`}
      </div>
      <p style={{ fontSize: '0.92rem', margin: 0 }}>
        On a fait <b>{a.length} multiplications</b> et <b>{a.length - 1} additions</b>. Chaque paire « multiplier puis ajouter à un total » est une opération
        <b> FMA</b> (multiply-add), l'opération de base qu'un cœur de GPU fait en un cycle.
      </p>
    </div>
  )
}

/** Produit matrice × vecteur : cliquer sur une case du résultat pour voir d'où elle vient. */
export function MatVecSim() {
  const W = [
    [1, 2, 0],
    [0, -1, 3],
    [2, 1, 1],
    [-1, 0, 2],
  ]
  const x = [3, 1, 2]
  const y = W.map((row) => row.reduce((s, v, j) => s + v * x[j], 0))
  const [sel, setSel] = useState(0)
  return (
    <div>
      <div className="row" style={{ gap: 18, justifyContent: 'center', alignItems: 'center' }}>
        <Matrix data={W} label="W (4×3) : poids" cellClass={(r) => (r === sel ? 'hl' : 'dim')} />
        <span style={{ fontSize: 22 }}>×</span>
        <Matrix data={x.map((v) => [v])} label="x (3) : entrée" cellClass={() => 'hl2'} />
        <span style={{ fontSize: 22 }}>=</span>
        <Matrix data={y.map((v) => [v])} label="y (4) : sortie" cellClass={(r) => (r === sel ? 'hl3' : '')} onCellClick={(r) => setSel(r)} />
      </div>
      <div className="formula">
        {`y[${sel}] = ${W[sel].map((w, j) => `${w}×${x[j]}`).join(' + ')} = ${y[sel]}`}
      </div>
      <p style={{ fontSize: '0.92rem', margin: 0 }}>
        👆 Cliquez sur une case de <b>y</b>. Chaque sortie est un <b>produit scalaire</b> entre une ligne de W et le vecteur x. Les 4 sorties sont
        <b> indépendantes</b> : 4 ouvriers pourraient les calculer <b>en même temps</b>. C'est exactement ce qu'exploite un GPU.
      </p>
    </div>
  )
}
