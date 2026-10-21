import React, { useState } from 'react'

/**
 * questions = [{ q, options: [..], answer: index, explain }]
 * onComplete(score, total) est appelé quand toutes les questions ont une réponse.
 */
export default function Quiz({ questions, onComplete, savedScore }) {
  const [answers, setAnswers] = useState({})
  const answeredCount = Object.keys(answers).length
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0)
  const finished = answeredCount === questions.length

  const choose = (qi, oi) => {
    if (answers[qi] !== undefined) return
    const next = { ...answers, [qi]: oi }
    setAnswers(next)
    if (Object.keys(next).length === questions.length && onComplete) {
      const s = questions.reduce((acc, q, i) => acc + (next[i] === q.answer ? 1 : 0), 0)
      onComplete(s, questions.length)
    }
  }

  return (
    <div className="quiz">
      <h2>🎯 Quiz de validation</h2>
      {savedScore && !finished && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Meilleur score précédent : {savedScore.score} / {savedScore.total}
        </p>
      )}
      {questions.map((q, qi) => {
        const a = answers[qi]
        return (
          <div className="quiz-q" key={qi}>
            <div className="quiz-q-title">
              {qi + 1}. {q.q}
            </div>
            {q.options.map((o, oi) => {
              let cls = ''
              if (a !== undefined) {
                if (oi === q.answer) cls = 'correct'
                else if (oi === a) cls = 'wrong'
              }
              return (
                <button key={oi} className={`quiz-opt ${cls}`} disabled={a !== undefined} onClick={() => choose(qi, oi)}>
                  {o}
                </button>
              )
            })}
            {a !== undefined && (
              <div className="quiz-expl">
                {a === q.answer ? '✅ Correct. ' : '❌ Pas tout à fait. '}
                {q.explain}
              </div>
            )}
          </div>
        )
      })}
      {finished && (
        <div className="quiz-score">
          Score : {score} / {questions.length}{' '}
          {score === questions.length ? '— parfait, chapitre validé ! 🎉' : score >= questions.length * 0.6 ? '— chapitre validé, relisez les explications des erreurs.' : '— relisez le chapitre puis réessayez.'}
          <div style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => setAnswers({})}>Recommencer le quiz</button>
          </div>
        </div>
      )}
    </div>
  )
}
