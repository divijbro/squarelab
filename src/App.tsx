import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  EyeOff,
  Grid3X3,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Tags,
  X,
} from 'lucide-react'
import { createSquareModel, formatNumber, type Construction, type Point } from './geometry'

type Mode = 'explore' | 'guided' | 'discover' | 'challenge'

const guideSteps: Record<Construction, { title: string; detail: string; progress: number }[]> = {
  diagonal: [
    { title: 'Start with a square', detail: 'Choose a side length and note the area of the original square.', progress: 0 },
    { title: 'Draw its diagonal', detail: 'The diagonal is the hypotenuse of two congruent right triangles.', progress: 30 },
    { title: 'Build a square on it', detail: 'Use the diagonal as the side of a new, accurately constructed square.', progress: 72 },
    { title: 'Compare the areas', detail: 'Squaring a side that is √2 times longer gives twice the area.', progress: 100 },
  ],
  midpoints: [
    { title: 'Start with a square', detail: 'The four sides have the same length and the same area is inside.', progress: 0 },
    { title: 'Mark each midpoint', detail: 'Place one midpoint halfway along every side of the original square.', progress: 30 },
    { title: 'Join neighboring points', detail: 'Connecting the midpoints forms a rotated square at the center.', progress: 66 },
    { title: 'Compare the areas', detail: 'The center is equal in area to two of the four corner triangles.', progress: 100 },
  ],
}

const challengePool = [
  { prompt: 'The original square has area 25 cm². What is the area on its diagonal?', answer: 50, unit: 'cm²', hint: 'A diagonal square has twice the original area.' },
  { prompt: 'The original square has area 64 cm². What is the midpoint square’s area?', answer: 32, unit: 'cm²', hint: 'The midpoint square takes one half of the original area.' },
  { prompt: 'A diagonal square has area 72 cm². What was the original area?', answer: 36, unit: 'cm²', hint: 'Divide the diagonal square’s area by 2.' },
  { prompt: 'A midpoint square has area 18 cm². What was the original area?', answer: 36, unit: 'cm²', hint: 'Double the midpoint square’s area.' },
]

const pointString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')
const pathString = (points: Point[], close = true) => `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')}${close ? ' Z' : ''}`
function App() {
  const [construction, setConstruction] = useState<Construction>('diagonal')
  const [mode, setMode] = useState<Mode>('explore')
  const [side, setSide] = useState(4)
  const [progress, setProgress] = useState(100)
  const [playing, setPlaying] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showFills, setShowFills] = useState(true)
  const [highlightInner, setHighlightInner] = useState(true)
  const [showDiagonal, setShowDiagonal] = useState(true)
  const [showMidpoints, setShowMidpoints] = useState(true)
  const [showCorners, setShowCorners] = useState(true)
  const [showCalculations, setShowCalculations] = useState(true)
  const [showProof, setShowProof] = useState(true)
  const [prediction, setPrediction] = useState('')
  const [predictionChecked, setPredictionChecked] = useState(false)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [challengeAnswer, setChallengeAnswer] = useState('')
  const [challengeChecked, setChallengeChecked] = useState(false)
  const [challengeHint, setChallengeHint] = useState(false)
  const [guideIndex, setGuideIndex] = useState(0)

  const model = useMemo(() => createSquareModel(side, construction), [side, construction])
  const steps = guideSteps[construction]
  const challenge = challengePool[challengeIndex]!
  const revealRatio = mode !== 'discover' || predictionChecked
  const completedFraction = construction === 'diagonal'
    ? Math.max(0, Math.min(1, (progress - 35) / 52))
    : Math.max(0, Math.min(1, (progress - 30) / 48))

  useEffect(() => {
    if (!playing) return
    let current = progress
    const timer = window.setInterval(() => {
      current = Math.min(100, current + 2)
      setProgress(current)
      if (current >= 100) {
        setPlaying(false)
        window.clearInterval(timer)
      }
    }, 35)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    setPlaying(false)
    setPrediction('')
    setPredictionChecked(false)
    setGuideIndex(0)
    setProgress(mode === 'guided' ? 0 : 100)
  }, [construction, mode])

  const selectConstruction = (next: Construction) => {
    if (next === construction) return
    setConstruction(next)
    setShowDiagonal(true)
    setShowMidpoints(true)
    setShowCorners(true)
  }

  const reset = () => {
    setPlaying(false)
    setSide(4)
    setProgress(mode === 'guided' ? 0 : 100)
    setPrediction('')
    setPredictionChecked(false)
    setChallengeAnswer('')
    setChallengeChecked(false)
    setChallengeHint(false)
    setGuideIndex(0)
  }

  const setModeSafely = (nextMode: Mode) => {
    setMode(nextMode)
    setChallengeAnswer('')
    setChallengeChecked(false)
    setChallengeHint(false)
  }

  const startAnimation = () => {
    if (progress >= 100) setProgress(0)
    setPlaying(true)
  }

  const advanceGuide = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(steps.length - 1, guideIndex + direction))
    setGuideIndex(next)
    setProgress(steps[next]!.progress)
    setPlaying(false)
  }

  const checkPrediction = () => {
    if (prediction.trim()) setPredictionChecked(true)
  }

  const checkChallenge = () => {
    if (challengeAnswer.trim()) setChallengeChecked(true)
  }

  const nextChallenge = () => {
    setChallengeIndex((current) => (current + 1) % challengePool.length)
    setChallengeAnswer('')
    setChallengeChecked(false)
    setChallengeHint(false)
  }

  const normalizedPrediction = prediction.trim().replace(',', '.').replace(/\s/g, '').toLowerCase()
  const predictionIsCorrect = construction === 'diagonal'
    ? ['2', '2:1', '2/1'].includes(normalizedPrediction)
    : ['0.5', '1/2', '0.5:1', '1:2'].includes(normalizedPrediction)
  const challengeIsCorrect = Number(challengeAnswer) === challenge.answer

  return (
    <main className="app-shell min-h-screen">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="SquareLab home">
          <span className="brand-mark"><Square size={18} strokeWidth={2.2} /></span>
          <span>square<span className="brand-light">lab</span></span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> Interactive geometry lab</div>
        <button className="icon-button top-reset" onClick={reset} aria-label="Reset construction" title="Reset construction">
          <RotateCcw size={17} /><span>Reset</span>
        </button>
      </header>

      <div className="workspace">
        <aside className="panel left-panel" aria-label="Construction controls">
          <div className="panel-heading"><span className="eyebrow">WORKSPACE</span><h2>Explore</h2></div>
          <section className="control-section">
            <div className="section-label">Construction</div>
            <button className={`construction-option ${construction === 'diagonal' ? 'selected' : ''}`} onClick={() => selectConstruction('diagonal')} aria-pressed={construction === 'diagonal'}>
              <span className="option-icon diagonal-icon"><Square size={18} /></span>
              <span className="option-copy"><strong>On the diagonal</strong><small>{mode === 'discover' ? 'Predict the ratio' : 'Area doubles'}</small></span>
              <span className="option-radio" />
            </button>
            <button className={`construction-option ${construction === 'midpoints' ? 'selected' : ''}`} onClick={() => selectConstruction('midpoints')} aria-pressed={construction === 'midpoints'}>
              <span className="option-icon midpoint-icon"><Square size={17} className="rotated-square" /></span>
              <span className="option-copy"><strong>On the midpoints</strong><small>{mode === 'discover' ? 'Predict the ratio' : 'Area halves'}</small></span>
              <span className="option-radio" />
            </button>
          </section>

          <section className="control-section mode-section">
            <div className="section-label">Learning mode</div>
            <div className="mode-list" role="group" aria-label="Learning mode">
              <button className={`mode-option ${mode === 'explore' ? 'active' : ''}`} onClick={() => setModeSafely('explore')} aria-pressed={mode === 'explore'}><Grid3X3 size={16} /><span>Explore</span>{mode === 'explore' && <span className="mode-check"><Check size={13} /></span>}</button>
              <button className={`mode-option ${mode === 'guided' ? 'active' : ''}`} onClick={() => setModeSafely('guided')} aria-pressed={mode === 'guided'}><ArrowRight size={16} /><span>Guided tour</span>{mode === 'guided' && <span className="mode-check"><Check size={13} /></span>}</button>
              <button className={`mode-option ${mode === 'discover' ? 'active' : ''}`} onClick={() => setModeSafely('discover')} aria-pressed={mode === 'discover'}><Lightbulb size={16} /><span>Discover</span>{mode === 'discover' && <span className="mode-check"><Check size={13} /></span>}</button>
              <button className={`mode-option ${mode === 'challenge' ? 'active' : ''}`} onClick={() => setModeSafely('challenge')} aria-pressed={mode === 'challenge'}><Sparkles size={16} /><span>Challenge</span>{mode === 'challenge' && <span className="mode-check"><Check size={13} /></span>}</button>
            </div>
          </section>

          <section className="control-section">
            <div className="section-label">Display</div>
            <ToggleRow icon={<Grid3X3 size={16} />} label="Grid" checked={showGrid} onChange={setShowGrid} />
            <ToggleRow icon={<Tags size={16} />} label="Labels" checked={showLabels} onChange={setShowLabels} />
            <ToggleRow icon={<Square size={15} />} label="Area fills" checked={showFills} onChange={setShowFills} />
            {construction === 'diagonal' ? (
              <ToggleRow icon={showDiagonal ? <Eye size={16} /> : <EyeOff size={16} />} label="Diagonal" checked={showDiagonal} onChange={setShowDiagonal} />
            ) : (
              <>
                <ToggleRow icon={<Square size={15} />} label="Inner square" checked={highlightInner} onChange={setHighlightInner} />
                <ToggleRow icon={showMidpoints ? <Eye size={16} /> : <EyeOff size={16} />} label="Midpoint markers" checked={showMidpoints} onChange={setShowMidpoints} />
                <ToggleRow icon={showCorners ? <Eye size={16} /> : <EyeOff size={16} />} label="Corner triangles" checked={showCorners} onChange={setShowCorners} />
              </>
            )}
          </section>

          <div className="sidebar-note"><CircleHelp size={16} /><span>Drag the progress slider to build or rewind the construction.</span></div>
        </aside>

        <section className="canvas-column" aria-label="Interactive construction">
          <div className="canvas-toolbar">
            <div>
              <div className="canvas-title-row"><h1>{construction === 'diagonal' ? 'Square on the diagonal' : 'Square on the midpoints'}</h1><span className="canvas-badge">{mode === 'explore' ? 'EXPLORE' : mode.toUpperCase()}</span></div>
              <p>{construction === 'diagonal' ? 'Build a square using the original diagonal as its side.' : 'Join the side midpoints to reveal the inner square.'}</p>
            </div>
            <button className={`play-button ${playing ? 'is-playing' : ''}`} onClick={() => playing ? setPlaying(false) : startAnimation()}>
              {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              <span>{playing ? 'Pause' : 'Animate'}</span>
            </button>
          </div>

          <div className={`drawing-board ${showGrid ? 'grid-on' : ''}`}>
            <div className="board-topline"><span className="board-status"><span className="live-dot" /> LIVE CONSTRUCTION</span><span className="board-unit">ALL MEASUREMENTS IN UNITS</span></div>
            <svg className="geometry-svg" viewBox="0 0 800 620" role="img" aria-label={`${construction === 'diagonal' ? 'Square constructed on a diagonal' : 'Square formed by connecting the midpoints'}; side length ${side} units`}>
              <defs>
                <pattern id="minor-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 22 0 L 0 0 0 22" fill="none" stroke="#dce4ef" strokeWidth="0.7" /></pattern>
                <pattern id="major-grid" width="110" height="110" patternUnits="userSpaceOnUse"><rect width="110" height="110" fill="url(#minor-grid)" /><path d="M 110 0 L 0 0 0 110" fill="none" stroke="#cbd7e7" strokeWidth="1.1" /></pattern>
              </defs>
              {showGrid && <rect width="800" height="620" fill="url(#major-grid)" />}
              <ConstructionDrawing
                construction={construction}
                model={model}
                progress={progress}
                fraction={completedFraction}
                showLabels={showLabels}
                showFills={showFills}
                highlightInner={highlightInner}
                showDiagonal={showDiagonal}
                showMidpoints={showMidpoints}
                showCorners={showCorners}
                revealResult={revealRatio}
              />
            </svg>
            <div className="legend">
              <span><i className="legend-swatch original-swatch" /> Original square</span>
              <span><i className="legend-swatch result-swatch" /> Constructed square</span>
              {construction === 'midpoints' && <span><i className="legend-swatch corner-swatch" /> Corner triangles</span>}
            </div>
          </div>

          <div className="progress-control">
            <div className="progress-heading"><label htmlFor="progress">Construction progress</label><span>{Math.round(progress)}%</span></div>
            <input id="progress" type="range" min="0" max="100" value={progress} onChange={(event) => { setProgress(Number(event.target.value)); setPlaying(false) }} aria-label="Construction progress" style={{ '--range-progress': `${progress}%` } as React.CSSProperties} />
            <div className="progress-labels"><span>Original square</span><span>{construction === 'diagonal' ? 'Diagonal' : 'Midpoints'}</span><span>Area comparison</span></div>
          </div>

          {mode === 'guided' && (
            <div className="guided-card">
              <div className="guide-step"><span className="step-number">{guideIndex + 1}</span><div><span className="eyebrow">STEP {guideIndex + 1} OF {steps.length}</span><h3>{steps[guideIndex]!.title}</h3><p>{steps[guideIndex]!.detail}</p></div></div>
              <div className="guide-actions"><button className="secondary-button" onClick={() => advanceGuide(-1)} disabled={guideIndex === 0}><ArrowLeft size={15} /> Previous</button><button className="secondary-button primary-outline" onClick={() => advanceGuide(1)} disabled={guideIndex === steps.length - 1}>Next step <ArrowRight size={15} /></button></div>
            </div>
          )}

          {mode === 'discover' && (
            <div className="discover-card">
              <div className="discover-intro"><span className="discover-icon"><Lightbulb size={18} /></span><div><h3>Make a prediction</h3><p>How does the constructed square’s area compare to the original?</p></div></div>
              <div className="answer-row"><label className="sr-only" htmlFor="prediction">Your area ratio prediction</label><input id="prediction" value={prediction} onChange={(event) => { setPrediction(event.target.value); setPredictionChecked(false) }} onKeyDown={(event) => event.key === 'Enter' && checkPrediction()} placeholder={construction === 'diagonal' ? 'e.g. 2 or 2:1' : 'e.g. 1/2 or 0.5'} /><button className="primary-button" onClick={checkPrediction}>Check</button></div>
              {predictionChecked && <p className={`feedback ${predictionIsCorrect ? 'correct' : 'incorrect'}`}><span>{predictionIsCorrect ? <Check size={15} /> : <X size={15} />}</span>{predictionIsCorrect ? 'That’s right — now explore why.' : 'Not quite. Scrub through the construction and try again.'}</p>}
            </div>
          )}

          {mode === 'challenge' && (
            <div className="challenge-card">
              <div className="challenge-heading"><span className="challenge-icon"><Sparkles size={17} /></span><div><span className="eyebrow">QUICK CHALLENGE</span><p>{challenge.prompt}</p></div><button className="quiet-icon-button" onClick={nextChallenge} title="New question" aria-label="New question"><RotateCcw size={16} /></button></div>
              <div className="answer-row challenge-answer"><label className="sr-only" htmlFor="challenge-answer">Your answer</label><input id="challenge-answer" inputMode="decimal" type="number" value={challengeAnswer} onChange={(event) => { setChallengeAnswer(event.target.value); setChallengeChecked(false) }} onKeyDown={(event) => event.key === 'Enter' && checkChallenge()} placeholder="Your answer" /><span className="answer-unit">{challenge.unit}</span><button className="primary-button" onClick={checkChallenge}>Check</button></div>
              <div className="challenge-footer">{challengeChecked ? <p className={`feedback ${challengeIsCorrect ? 'correct' : 'incorrect'}`}><span>{challengeIsCorrect ? <Check size={15} /> : <X size={15} />}</span>{challengeIsCorrect ? 'Correct. You’ve got the relationship.' : 'Try again, or use a hint.'}</p> : <button className="hint-button" onClick={() => setChallengeHint(!challengeHint)}><Lightbulb size={14} /> {challengeHint ? challenge.hint : 'Show a hint'}</button>}<span>{challengeIndex + 1} / {challengePool.length}</span></div>
            </div>
          )}
        </section>

        <aside className="panel right-panel" aria-label="Measurements and area calculations">
          <div className="panel-heading right-heading"><div><span className="eyebrow">MEASUREMENTS</span><h2>Area lab</h2></div><button className="quiet-icon-button" onClick={() => setShowCalculations(!showCalculations)} title={showCalculations ? 'Hide calculations' : 'Show calculations'} aria-label={showCalculations ? 'Hide calculations' : 'Show calculations'}>{showCalculations ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>

          <section className="dimension-card">
            <div className="dimension-heading"><div><span className="section-label">Original side length</span><strong><span>{formatNumber(side)}</span><small>units</small></strong></div><span className="dimension-glyph"><Square size={22} /></span></div>
            <label className="sr-only" htmlFor="side-length">Original square side length</label>
            <input id="side-length" type="range" min="2" max="10" step="0.5" value={side} onChange={(event) => setSide(Number(event.target.value))} style={{ '--range-progress': `${((side - 2) / 8) * 100}%` } as React.CSSProperties} />
            <div className="range-ends"><span>2</span><span>10</span></div>
          </section>

          {mode === 'discover' && !revealRatio ? (
            <div className="hidden-result"><div className="lock-mark"><EyeOff size={17} /></div><strong>Result hidden</strong><p>Submit your prediction to reveal the calculations and area ratio.</p></div>
          ) : showCalculations ? (
            <>
              <section className="measurements-section">
                <div className="section-label">Live calculations</div>
                <div className="calculation-row"><span className="calc-mark original-mark">A₁</span><div className="calculation-copy"><span>Original area</span><strong>{formatNumber(model.originalArea)} <small>units²</small></strong></div><span className="calculation-formula">s²</span></div>
                <div className="calculation-row"><span className="calc-mark result-mark">A₂</span><div className="calculation-copy"><span>{construction === 'diagonal' ? 'Diagonal square' : 'Midpoint square'}</span><strong>{formatNumber(model.constructedArea)} <small>units²</small></strong></div><span className="calculation-formula">{construction === 'diagonal' ? '2s²' : '½s²'}</span></div>
                <div className="metric-line"><span>{construction === 'diagonal' ? 'Diagonal length' : 'Inner side length'}</span><strong>{construction === 'diagonal' ? `${formatNumber(side)}√2` : `${formatNumber(side)} / √2`}</strong></div>
                <div className="metric-line"><span>Constructed side</span><strong>{formatNumber(model.constructedSide)} units</strong></div>
              </section>

              <section className="ratio-card">
                <div className="ratio-heading"><span className="section-label">Area ratio <span className="ratio-suffix">A₂ / A₁</span></span><span className="ratio-pill">{construction === 'diagonal' ? '2×' : '½×'}</span></div>
                <div className={`ratio-bars ${construction}`}>
                  <div className="ratio-bar-row"><span>Original</span><div className="ratio-track"><i className={`bar ${construction === 'diagonal' ? 'original-bar half-bar' : 'original-bar full-bar'}`} /></div></div>
                  <div className="ratio-bar-row"><span>{construction === 'diagonal' ? 'Diagonal' : 'Inner'}</span><div className="ratio-track"><i className={`bar result-bar ${construction === 'diagonal' ? 'full-bar' : 'half-bar'}`} /></div></div>
                  <div className="ratio-legend"><span><i className="tiny-dot blue-dot" /> 1 area unit</span><span><i className="tiny-dot violet-dot" /> {construction === 'diagonal' ? '2 area units' : '½ area'}</span></div>
                </div>
                <div className="ratio-equation">{construction === 'diagonal' ? `${formatNumber(model.constructedArea)} ÷ ${formatNumber(model.originalArea)} = 2` : `${formatNumber(model.constructedArea)} ÷ ${formatNumber(model.originalArea)} = ½`}</div>
              </section>

              <section className="conclusion-card"><span className="conclusion-check"><Check size={15} /></span><p>{construction === 'diagonal' ? 'The diagonal square has exactly twice the area.' : 'The midpoint square has exactly half the area.'}</p></section>
            </>
          ) : (
            <div className="hidden-result"><div className="lock-mark"><EyeOff size={17} /></div><strong>Calculations hidden</strong><p>Show calculations to see the live area comparison.</p></div>
          )}

          {revealRatio && <>
            <div className="proof-divider" />
            <button className="proof-toggle-row" onClick={() => setShowProof(!showProof)} aria-expanded={showProof}>
              <span><span className="section-label">Why it works</span><span className="proof-subtitle">{construction === 'diagonal' ? 'The diagonal gives a longer square side.' : 'The corner pieces balance the center.'}</span></span>
              <ChevronDown size={16} className={showProof ? '' : 'chevron-collapsed'} />
            </button>
            {showProof && <>
              <div className="proof-copy">{construction === 'diagonal' ? <><span>d = s√2</span><span>A₂ = d² = (s√2)²</span><strong>A₂ = 2s²</strong></> : <><span>a = s / √2</span><span>A₂ = a² = (s / √2)²</span><strong>A₂ = s² / 2</strong></>}</div>
              {construction === 'midpoints' && <div className="triangle-note"><span className="triangle-dots"><i /><i /><i /><i /></span><span>4 equal corner triangles</span><strong>4 × ⅛ = ½</strong></div>}
            </>}
          </>}
        </aside>
      </div>
      <footer className="footer"><span>SquareLab <b>·</b> Geometry & area explorer</span><span>Made for curious minds <span className="footer-star">✳</span></span></footer>
    </main>
  )
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row"><span className="toggle-label">{icon}<span>{label}</span></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="switch" aria-hidden="true" /></label>
}

function ConstructionDrawing({
  construction,
  model,
  progress,
  fraction,
  showLabels,
  showFills,
  highlightInner,
  showDiagonal,
  showMidpoints,
  showCorners,
  revealResult,
}: {
  construction: Construction
  model: ReturnType<typeof createSquareModel>
  progress: number
  fraction: number
  showLabels: boolean
  showFills: boolean
  highlightInner: boolean
  showDiagonal: boolean
  showMidpoints: boolean
  showCorners: boolean
  revealResult: boolean
}) {
  const [a, b, c, d] = model.outer
  const diagonalConstruction = construction === 'diagonal'
  const midpointSide = model.constructedSide
  const edgeA = diagonalConstruction ? a : model.midpoints[0]
  const edgeB = diagonalConstruction ? c : model.midpoints[1]
  const labelPosition = diagonalConstruction
    ? { x: (a.x + c.x) / 2 + 16, y: (a.y + c.y) / 2 + 8 }
    : { x: (model.midpoints[0].x + model.midpoints[1].x) / 2 + 12, y: (model.midpoints[0].y + model.midpoints[1].y) / 2 - 10 }
  const outerSideMid = {
    x: (a.x + b.x) / 2 - (diagonalConstruction ? 0 : model.sidePixels * 0.25),
    y: a.y - 15,
  }
  const constructedPath = pathString(model.constructed)
  const strokeLength = Math.max(0, 100 - fraction * 100)

  return (
    <g>
      {diagonalConstruction ? (
        <>
          <path d={constructedPath} className="constructed-fill" style={{ opacity: showFills ? Math.max(0, (progress - 56) / 44) * 0.76 : 0 }} />
          {progress >= 34 && <path d={constructedPath} className="constructed-outline draw-path" pathLength="100" strokeDasharray="100" strokeDashoffset={strokeLength} />}
          <path d={pathString(model.outer)} className="original-fill" style={{ opacity: showFills ? 1 : 0 }} />
          <path d={pathString(model.outer)} className="original-outline" />
          {showDiagonal && progress >= 10 && <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} className="diagonal-line" style={{ opacity: Math.min(1, progress / 30) }} />}
          {showLabels && <>
            <SvgLabel x={outerSideMid.x} y={outerSideMid.y} text={`s = ${formatNumber(model.originalArea ** 0.5)}`} kind="blue" />
            {progress >= 30 && <SvgLabel x={labelPosition.x} y={labelPosition.y} text="d = s√2" kind="violet" />}
            <Vertex x={a.x} y={a.y} label="A" dx={-17} dy={18} />
            <Vertex x={c.x} y={c.y} label="C" dx={10} dy={-10} />
          </>}
        </>
      ) : (
        <>
          {showCorners && progress >= 36 && model.corners.map((corner, index) => <polygon key={index} points={pointString(corner)} className={`corner-fill corner-${index + 1}`} style={{ opacity: showFills ? Math.max(0.15, fraction) * 0.8 : 0 }} />)}
          <path d={pathString(model.constructed)} className="constructed-fill" style={{ opacity: showFills && highlightInner ? Math.max(0, (progress - 48) / 52) * 0.85 : 0 }} />
          {progress >= 30 && <path d={constructedPath} className="constructed-outline draw-path" pathLength="100" strokeDasharray="100" strokeDashoffset={strokeLength} />}
          <path d={pathString(model.outer)} className="original-outline" />
          {showMidpoints && progress >= 15 && model.midpoints.map((point, index) => <g key={index} className="midpoint-marker" style={{ opacity: Math.min(1, (progress - 15) / 20) }}><circle cx={point.x} cy={point.y} r="5" /><text x={point.x + (index === 1 ? 10 : index === 3 ? -20 : 7)} y={point.y + (index === 0 ? -10 : index === 2 ? 19 : 5)}>{`M${index + 1}`}</text></g>)}
          {showLabels && <>
            <SvgLabel x={outerSideMid.x} y={outerSideMid.y} text={`s = ${formatNumber(model.originalArea ** 0.5)}`} kind="blue" />
            {progress >= 55 && <SvgLabel x={labelPosition.x} y={labelPosition.y} text="s / √2" kind="violet" />}
            <g className="corner-caption"><text x={a.x + 11} y={a.y + 28}>⅛</text><text x={b.x - 27} y={b.y + 28}>⅛</text><text x={c.x - 27} y={c.y - 14}>⅛</text><text x={d.x + 11} y={d.y - 14}>⅛</text></g>
          </>}
          {revealResult && progress >= 80 && <g className="area-tag"><rect x={model.midpoints[0].x + 22} y={model.midpoints[0].y + 27} width="122" height="28" rx="14" /><text x={model.midpoints[0].x + 83} y={model.midpoints[0].y + 46}>Area = ½ × A₁</text></g>}
        </>
      )}
      {!diagonalConstruction && progress > 57 && <text className="center-area-label" x={model.midpoints[0].x} y={model.midpoints[2].y + 5}>A₂</text>}
      {diagonalConstruction && progress > 76 && <text className="outside-area-label" x={(model.constructed[2].x + model.constructed[3].x) / 2} y={(model.constructed[2].y + model.constructed[3].y) / 2 + 5}>A₂</text>}
      {showLabels && !diagonalConstruction && progress >= 45 && <text className="unit-side-label" x={edgeA.x + 10} y={edgeB.y - 10}>{formatNumber(midpointSide)} u</text>}
    </g>
  )
}

function SvgLabel({ x, y, text, kind }: { x: number; y: number; text: string; kind: 'blue' | 'violet' }) {
  const width = text.length * 7.2 + 18
  return <g className={`svg-label ${kind}`}><rect x={x - width / 2} y={y - 13} width={width} height="26" rx="13" /><text x={x} y={y + 4}>{text}</text></g>
}

function Vertex({ x, y, label, dx, dy }: { x: number; y: number; label: string; dx: number; dy: number }) {
  return <g className="vertex"><circle cx={x} cy={y} r="4.4" /><text x={x + dx} y={y + dy}>{label}</text></g>
}

export default App
