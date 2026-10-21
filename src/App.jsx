import React, { useEffect, useState } from 'react'
import { CHAPTERS, PARTS, byChapterId } from './chapters/index.js'
import Quiz from './components/Quiz.jsx'
import GpuDiagram from './sims/GpuDiagram.jsx'

const STORE_KEY = 'cours-gpu-progress-v1'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { quiz: {}, visited: {} }
  } catch {
    return { quiz: {}, visited: {} }
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p))
  } catch {
    /* stockage indisponible : la progression ne sera pas conservée */
  }
}

const routeFromHash = () => window.location.hash.replace(/^#\/?/, '') || 'accueil'

function isDone(progress, id) {
  const s = progress.quiz[id]
  return s && s.score / s.total >= 0.6
}

function Home({ go, progress }) {
  const withQuiz = CHAPTERS.filter((c) => c.quiz)
  const done = withQuiz.filter((c) => isDone(progress, c.id)).length
  const next = withQuiz.find((c) => !isDone(progress, c.id))
  return (
    <>
      <div className="home-hero">
        <div className="chapter-kicker">Cours interactif</div>
        <h1>Comprendre les GPU et l'inférence des réseaux de neurones</h1>
        <p className="lead">
          De zéro jusqu'aux grands modèles de langage : ce qu'il y a dans un GPU, à quoi sert chaque composant, et comment tout cela s'enchaîne, étape par étape, quand un
          réseau de neurones produit une réponse.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => go(next ? next.id : 'ch01')}>
            {done === 0 ? '▶ Commencer le cours' : next ? `▶ Reprendre : chapitre ${next.num}` : '🎉 Cours terminé : revoir le chapitre 1'}
          </button>
          <button className="btn" onClick={() => go('ch03')}>Explorer le schéma du GPU</button>
          <button className="btn" onClick={() => go('glossaire')}>Glossaire</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Aperçu : un GPU NVIDIA H100, composant par composant</div>
        <div className="card-sub">Cliquez sur les éléments. Tout sera expliqué en détail au chapitre 3.</div>
        <GpuDiagram />
      </div>

      <h2>Comment suivre ce cours</h2>
      <ul>
        <li><b>Aucun prérequis</b> : il suffit de savoir multiplier et additionner. Les termes techniques sont définis à leur première apparition, avec leur nom anglais.</li>
        <li><b>12 chapitres progressifs</b>, en 4 parties : les fondations, le GPU, les réseaux denses, les transformers. Comptez 20 à 40 minutes par chapitre.</li>
        <li><b>Des simulateurs interactifs</b> (badge vert « Simulateur ») pour manipuler les concepts : jouez avec, c'est là qu'on comprend.</li>
        <li><b>Un quiz</b> à la fin de chaque chapitre. Un chapitre est validé à partir de 60 % de bonnes réponses. Votre progression est conservée dans ce navigateur.</li>
      </ul>

      {PARTS.map((p) => (
        <div key={p.title}>
          <div className="part-label" style={{ margin: '22px 0 0' }}>{p.title}</div>
          <div className="home-grid">
            {p.chapters.map((id) => {
              const c = byChapterId[id]
              return (
                <button key={id} className="home-card" onClick={() => go(id)}>
                  <b>{c.num ? `${c.num}. ` : ''}{c.title} {isDone(progress, id) ? '✅' : ''}</b>
                  <span>{c.lead}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash())
  const [progress, setProgress] = useState(loadProgress)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('cours-gpu-theme') || 'auto'
    } catch {
      return 'auto'
    }
  })

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    setMenuOpen(false)
  }, [route])

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('cours-gpu-theme', theme)
    } catch {
      /* ignoré */
    }
  }, [theme])

  const go = (id) => {
    window.location.hash = `/${id}`
  }

  const onQuizComplete = (id) => (score, total) => {
    setProgress((p) => {
      const prev = p.quiz[id]
      if (prev && prev.score >= score) return p
      const np = { ...p, quiz: { ...p.quiz, [id]: { score, total } } }
      saveProgress(np)
      return np
    })
  }

  const resetProgress = () => {
    if (!window.confirm('Effacer toute votre progression (scores des quiz) ?')) return
    const np = { quiz: {}, visited: {} }
    saveProgress(np)
    setProgress(np)
  }

  const chapter = byChapterId[route]
  const idx = chapter ? CHAPTERS.indexOf(chapter) : -1
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null
  const next = idx >= 0 && idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null
  const withQuiz = CHAPTERS.filter((c) => c.quiz)
  const doneCount = withQuiz.filter((c) => isDone(progress, c.id)).length

  return (
    <div className="layout">
      <div className="topbar">
        <button className="btn small" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">☰ Menu</button>
        <b style={{ fontSize: '0.95rem' }}>Cours GPU &amp; Inférence</b>
      </div>
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => go('accueil')}>
          <div className="chip"><span /><span /><span /></div>
          Cours GPU &amp; Inférence
        </div>
        <div className="progress-wrap">
          Progression : {doneCount} / {withQuiz.length} chapitres validés
          <div className="progress-bar"><div style={{ width: `${(doneCount / withQuiz.length) * 100}%` }} /></div>
        </div>
        <button className={`nav-item ${route === 'accueil' ? 'active' : ''}`} onClick={() => go('accueil')}>
          <span className="nav-num">⌂</span> Accueil
        </button>
        {PARTS.map((p) => (
          <div key={p.title}>
            <div className="part-label">{p.title}</div>
            {p.chapters.map((id) => {
              const c = byChapterId[id]
              return (
                <button key={id} className={`nav-item ${route === id ? 'active' : ''} ${isDone(progress, id) ? 'done' : ''}`} onClick={() => go(id)}>
                  <span className="nav-num">{isDone(progress, id) ? '✓' : c.num ?? 'A'}</span>
                  <span>{c.title}</span>
                </button>
              )
            })}
          </div>
        ))}
        <div className="sidebar-footer">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Thème">
            <option value="auto">Thème : système</option>
            <option value="light">Thème : clair</option>
            <option value="dark">Thème : sombre</option>
          </select>
          <button className="btn small" onClick={resetProgress}>Réinitialiser</button>
        </div>
      </nav>

      <main className="main">
        <div className="content">
          {!chapter ? (
            <Home go={go} progress={progress} />
          ) : (
            <React.Fragment key={chapter.id}>
              <div className="chapter-kicker">{chapter.num ? `Chapitre ${chapter.num}` : 'Annexe'}</div>
              <h1>{chapter.title}</h1>
              <p className="lead">{chapter.lead}</p>
              <chapter.Component go={go} />
              {chapter.quiz && <Quiz questions={chapter.quiz} onComplete={onQuizComplete(chapter.id)} savedScore={progress.quiz[chapter.id]} />}
              <div className="chapter-nav">
                {prev ? (
                  <button className="btn" onClick={() => go(prev.id)}><small>← Précédent</small>{prev.title}</button>
                ) : <button className="btn" onClick={() => go('accueil')}><small>←</small>Accueil</button>}
                {next && (
                  <button className="btn primary" onClick={() => go(next.id)} style={{ textAlign: 'right' }}>
                    <small style={{ color: 'rgba(255,255,255,0.8)' }}>Suivant →</small>{next.title}
                  </button>
                )}
              </div>
            </React.Fragment>
          )}
        </div>
      </main>
    </div>
  )
}
