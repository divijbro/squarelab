import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, ChevronLeft, ChevronRight, Eye, Grid2X2, Pause, Play, RotateCcw, RotateCw, Square, Triangle } from 'lucide-react'
import { createSquareModel, formatNumber, squareParametersFromHandle, type Construction, type Point, type SquareModel } from './geometry'

type Activity = 'machine' | 'mystery'
const timelineSteps: Record<Construction, string[]> = {
  diagonal: ['Original square', 'Diagonal appears', 'Measure the diagonal', 'Build the new square', 'Compare regions', 'Reveal the rule'],
  midpoints: ['Original square', 'Mark midpoints', 'Connect the points', 'Inner square forms', 'Highlight corner pieces', 'Reveal the rule'],
}
const proof: Record<Construction, { title: string; formula: string; focus: string }[]> = {
  diagonal: [
    { title: 'Original square area', formula: 'A₁ = s²', focus: 'The blue square has side s.' },
    { title: 'Measure its diagonal', formula: 'd = s√2', focus: 'The diagonal is the hypotenuse of a right isosceles triangle.' },
    { title: 'Use it as a side', formula: 'A₂ = d²', focus: 'The violet square uses the diagonal as its side.' },
    { title: 'Substitute the length', formula: 'A₂ = (s√2)²', focus: 'Replace d with s√2.' },
    { title: 'Simplify', formula: 'A₂ = 2s²', focus: 'Squaring √2 doubles the area.' },
    { title: 'Conclusion', formula: 'A₂ / A₁ = 2', focus: 'The diagonal square has exactly twice the area.' },
  ],
  midpoints: [
    { title: 'Original square area', formula: 'A₁ = s²', focus: 'The original square has side s.' },
    { title: 'Inner square side', formula: 'a = s / √2', focus: 'Each inner side is the hypotenuse of a half-side right triangle.' },
    { title: 'Square the side', formula: 'A₂ = (s / √2)²', focus: 'The inner square area is its side squared.' },
    { title: 'Simplify', formula: 'A₂ = s² / 2', focus: 'The four equal corner triangles together take the other half.' },
    { title: 'Conclusion', formula: 'A₂ / A₁ = 1/2', focus: 'The midpoint square has exactly half the area.' },
  ],
}
const points = (list: Point[]) => list.map(({ x, y }) => `${x},${y}`).join(' ')
const average = (list: Point[]): Point => ({ x: list.reduce((sum, p) => sum + p.x, 0) / list.length, y: list.reduce((sum, p) => sum + p.y, 0) / list.length })
const CANVAS_SCALE = 27.5
const SIDE_LIMITS = { min: 1, max: 10 }

type DragSession = {
  pointerStart: Point
  handleStart: Point
  radial: Point
  tangent: Point
  gestureThreshold: number
  gestureMode: 'undecided' | 'resize' | 'rotate'
}
type DragUpdate = { side: number; angle: number }

function App() {
  const [activity, setActivity] = useState<Activity>('machine')
  const [construction, setConstruction] = useState<Construction>('diagonal')
  const [side, setSide] = useState(4)
  const [angle, setAngle] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [areaVision, setAreaVision] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showMidpoints, setShowMidpoints] = useState(true)
  const [showFormula, setShowFormula] = useState(true)
  const [ruleTested, setRuleTested] = useState(false)
  const [proofStep, setProofStep] = useState(0)
  const [lockedViewBox, setLockedViewBox] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragSessionRef = useRef<DragSession | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const pendingDragUpdateRef = useRef<DragUpdate | null>(null)
  const progressRef = useRef(progress)
  const model = useMemo(() => createSquareModel(side, construction, angle, CANVAS_SCALE), [side, construction, angle])
  const activeProof = proof[construction]
  const title = activity === 'machine' ? 'The Double-Area Machine' : 'The Half-Area Mystery'
  const revealFraction = Math.max(0, Math.min(1, (progress - 45) / 55))
  const mainViewBox = construction === 'diagonal'
    ? `${(model.center.x - 400) * (1 - revealFraction)} ${(model.center.y - 310) * (1 - revealFraction)} 800 620`
    : '0 0 800 620'
  const activeViewBox = lockedViewBox ?? mainViewBox

  const lockViewBox = () => {
    setLockedViewBox((current) => current ?? activeViewBox)
    setPlaying(false)
  }

  const changeProgress = (next: number) => {
    const value = Math.max(0, Math.min(100, next))
    progressRef.current = value
    setLockedViewBox(null)
    setProgress(value)
  }

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = Math.min(100, progressRef.current + 1.8)
      progressRef.current = next
      setProgress(next)
      if (next >= 100) setPlaying(false)
    }, 45)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    setLockedViewBox(null)
  }, [progress])

  useEffect(() => {
    const next = Math.round((progress / 100) * (activeProof.length - 1))
    setProofStep((current) => current === next ? current : next)
  }, [progress, activeProof.length])

  const selectActivity = (next: Activity) => {
    setActivity(next)
    if (next === 'machine') setConstruction('diagonal')
    if (next === 'mystery') setConstruction('midpoints')
    setPlaying(false)
    changeProgress(0)
    setAreaVision(false)
    setRuleTested(false)
    setProofStep(0)
  }

  const selectConstruction = (next: Construction) => {
    setConstruction(next)
    setPlaying(false)
    changeProgress(0)
    setProofStep(0)
    setAreaVision(false)
  }

  const reset = () => {
    setPlaying(false)
    setSide(4)
    setAngle(0)
    changeProgress(0)
    setAreaVision(false)
    setRuleTested(false)
    setProofStep(0)
  }

  const rotateDiagram = (delta: number) => setAngle((current) => ((current + delta + 540) % 360) - 180)
  const changeTimeline = (value: number) => {
    setPlaying(false)
    changeProgress(value)
  }
  const jumpToProof = (next: number) => {
    const value = Math.max(0, Math.min(activeProof.length - 1, next))
    setProofStep(value)
    changeTimeline((value / (activeProof.length - 1)) * 100)
  }

  const pointerPoint = (event: Pick<ReactPointerEvent<SVGSVGElement>, 'clientX' | 'clientY'>): Point | null => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const local = point.matrixTransform(matrix.inverse())
    return { x: local.x, y: local.y }
  }
  const applyPendingDragUpdate = () => {
    const next = pendingDragUpdateRef.current
    pendingDragUpdateRef.current = null
    if (!next) return
    setSide(next.side)
    setAngle(next.angle)
  }
  const queueHandleUpdate = (event: Pick<ReactPointerEvent<SVGSVGElement>, 'clientX' | 'clientY'>) => {
    const session = dragSessionRef.current
    if (!session) return
    const point = pointerPoint(event)
    if (!point) return
    const dx = point.x - session.pointerStart.x
    const dy = point.y - session.pointerStart.y
    const radialDelta = dx * session.radial.x + dy * session.radial.y
    const tangentialDelta = dx * session.tangent.x + dy * session.tangent.y
    if (session.gestureMode === 'undecided' && Math.hypot(radialDelta, tangentialDelta) >= session.gestureThreshold) {
      session.gestureMode = Math.abs(tangentialDelta) > Math.abs(radialDelta) * 0.35 ? 'rotate' : 'resize'
    }
    const filteredTangentialDelta = session.gestureMode === 'rotate'
      ? Math.sign(tangentialDelta) * Math.max(0, Math.abs(tangentialDelta) - session.gestureThreshold)
      : 0
    const target = {
      x: session.handleStart.x + session.radial.x * radialDelta + session.tangent.x * filteredTangentialDelta,
      y: session.handleStart.y + session.radial.y * radialDelta + session.tangent.y * filteredTangentialDelta,
    }
    const next = squareParametersFromHandle(target, model.dragPivot, construction, CANVAS_SCALE)
    pendingDragUpdateRef.current = {
      side: Math.min(SIDE_LIMITS.max, Math.max(SIDE_LIMITS.min, next.side)),
      angle: next.angle,
    }
    if (dragFrameRef.current === null) {
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null
        if (!dragSessionRef.current) return
        applyPendingDragUpdate()
      })
    }
  }
  const moveHandle = (event: ReactPointerEvent<SVGSVGElement>) => {
    queueHandleUpdate(event)
  }
  const beginDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const pointer = pointerPoint(event)
    if (!pointer) return
    const radialDelta = { x: model.draggablePoint.x - model.dragPivot.x, y: model.draggablePoint.y - model.dragPivot.y }
    const radius = Math.hypot(radialDelta.x, radialDelta.y)
    const radial = { x: radialDelta.x / radius, y: radialDelta.y / radius }
    dragSessionRef.current = {
      pointerStart: pointer,
      handleStart: model.draggablePoint,
      radial,
      tangent: { x: -radial.y, y: radial.x },
      gestureThreshold: Math.max(4, radius * 0.045),
      gestureMode: 'undecided',
    }
    lockViewBox()
    svgRef.current?.setPointerCapture(event.pointerId)
  }
  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    queueHandleUpdate(event)
    if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current)
    dragFrameRef.current = null
    applyPendingDragUpdate()
    dragSessionRef.current = null
    if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId)
  }

  const revealSecret = () => {
    setAreaVision(true)
    setPlaying(false)
    changeProgress(100)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#squarelab" aria-label="SquareLab home"><span className="brand-mark"><Square size={17} /></span><span>square<span>lab</span></span></a>
        <div className="topbar-context"><span className="live-dot" /> Interactive geometry lab</div>
        <button className="reset-button" onClick={reset}><RotateCcw size={15} /> Reset</button>
      </header>

      <nav className="activity-tabs" aria-label="Activities">
        <ActivityButton active={activity === 'machine'} onClick={() => selectActivity('machine')} icon={<Square size={16} />} label="Double-Area Machine" />
        <ActivityButton active={activity === 'mystery'} onClick={() => selectActivity('mystery')} icon={<Triangle size={16} />} label="Half-Area Mystery" />
      </nav>

      <div className="workspace">
        <aside className="control-panel panel">
          <div className="panel-title"><span className="eyebrow">YOUR EXPERIMENT</span><h2>Controls</h2></div>
          <div className="control-group">
            <div className="control-label">Construction</div>
            <button className={`choice ${construction === 'diagonal' ? 'selected' : ''}`} onClick={() => selectConstruction('diagonal')} aria-pressed={construction === 'diagonal'}><span className="choice-symbol diagonal-symbol"><Square size={17} /></span><span><b>Diagonal square</b><small>Area doubles</small></span>{construction === 'diagonal' && <Check size={15} />}</button>
            <button className={`choice ${construction === 'midpoints' ? 'selected' : ''}`} onClick={() => selectConstruction('midpoints')} aria-pressed={construction === 'midpoints'}><span className="choice-symbol midpoint-symbol"><Square size={17} /></span><span><b>Midpoint square</b><small>Area halves</small></span>{construction === 'midpoints' && <Check size={15} />}</button>
          </div>
          <div className="control-group">
            <div className="control-label range-heading rotation-heading"><label htmlFor="rotation-control">Rotate construction</label><strong>{Math.round(angle)}°</strong></div>
            <div className="rotation-control"><button aria-label="Rotate counterclockwise" onClick={() => rotateDiagram(-15)}><RotateCcw size={15} /></button><input id="rotation-control" className="range" type="range" min="-180" max="180" step="1" value={Math.round(angle)} onChange={(event) => setAngle(Number(event.target.value))} style={{ '--fill': `${((angle + 180) / 360) * 100}%` } as CSSProperties} /><button aria-label="Rotate clockwise" onClick={() => rotateDiagram(15)}><RotateCw size={15} /></button></div>
          </div>
          <div className="control-group display-group">
            <div className="control-label">Display</div>
            <Toggle label="Coordinate grid" checked={showGrid} onChange={setShowGrid} />
            <Toggle label="Coordinate axes" checked={showAxes} onChange={setShowAxes} />
            <Toggle label="Labels & measurements" checked={showLabels} onChange={setShowLabels} />
            <Toggle label="Show midpoints" checked={showMidpoints} onChange={setShowMidpoints} />
            <Toggle label="Show formulas" checked={showFormula} onChange={setShowFormula} />
            <Toggle label="Area Vision" checked={areaVision} onChange={setAreaVision} />
          </div>
          {activity === 'machine' && <button className="test-rule-button" onClick={() => setRuleTested((current) => !current)}><Grid2X2 size={16} /> {ruleTested ? 'Hide rule test' : 'Test the Rule'}</button>}
          {activity === 'mystery' && <button className="reveal-button" onClick={revealSecret}><Eye size={16} /> Reveal the Secret</button>}
            <p className="keyboard-hint">On the canvas: drag outward to resize or sideways to rotate. Use ← → to rotate, + / − to resize.</p>
        </aside>

        <section className="canvas-column" aria-label="Geometry workspace">
          <div className="canvas-heading"><div><span className="eyebrow">SQUARELAB / {activity.toUpperCase()}</span><h1>{title}</h1><p>{construction === 'diagonal' ? 'Can a diagonal build a square with exactly twice the area?' : 'What do four side midpoints reveal about area?'}</p></div><button className={`area-vision-button ${areaVision ? 'on' : ''}`} onClick={() => setAreaVision((current) => !current)} aria-pressed={areaVision}><Eye size={15} /> Area Vision</button></div>

          <section className="size-control" aria-label="Adjust square side lengths">
            <div className="size-readout"><label htmlFor="side-control">Original side length</label><strong>s = {formatNumber(side)} <small>units</small></strong></div>
            <div className="size-slider-wrap"><input id="side-control" className="range" aria-label="Original square side length" type="range" min="1" max="10" step="0.01" value={side} onPointerDown={lockViewBox} onKeyDown={lockViewBox} onChange={(event) => setSide(Number(event.target.value))} style={{ '--fill': `${((side - 1) / 9) * 100}%` } as CSSProperties} /><div className="range-ends"><span>1 unit</span><span>10 units</span></div></div>
            <div className="derived-length"><span>{construction === 'diagonal' ? 'Diagonal-square side' : 'Midpoint-square side'}</span><strong>{formatNumber(model.constructedSide)} <small>units</small></strong><i>{construction === 'diagonal' ? 's√2' : 's / √2'}</i></div>
          </section>

          <div className={`canvas-frame ${showGrid ? 'grid-visible' : ''}`}>
            <div className="canvas-status"><span><i className="live-dot" /> LIVE GEOMETRY</span><span>UNITS · {formatNumber(side)} × {formatNumber(side)}</span></div>
            <ConstructionSVG
              ref={svgRef}
              construction={construction}
              model={model}
              progress={progress}
              areaVision={areaVision}
              showLabels={showLabels}
              showMidpoints={showMidpoints}
              showAxes={showAxes}
              showGrid={showGrid}
              interactive
              viewBox={activeViewBox}
              onPointerDown={beginDrag}
              onPointerMove={moveHandle}
              onPointerUp={endDrag}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') { event.preventDefault(); rotateDiagram(-5) }
                if (event.key === 'ArrowRight') { event.preventDefault(); rotateDiagram(5) }
                if (event.key === '+' || event.key === '=') { event.preventDefault(); lockViewBox(); setSide((current) => Math.min(10, current + 0.25)) }
                if (event.key === '-' || event.key === '_') { event.preventDefault(); lockViewBox(); setSide((current) => Math.max(1, current - 0.25)) }
                if (event.key === ' ') { event.preventDefault(); setPlaying((current) => !current) }
              }}
            />
            <div className="canvas-legend"><span><i className="swatch blue" /> Original square</span><span><i className="swatch violet" /> Constructed square</span>{construction === 'midpoints' && <span><i className="swatch amber" /> Corner regions</span>}</div>
          </div>

          {areaVision && progress >= 72 && <div className="area-insight"><span className="insight-icon"><Eye size={16} /></span><div><b>{construction === 'diagonal' ? 'Four equal regions, two original areas' : 'Four corner pieces balance the center'}</b><p>{construction === 'diagonal' ? 'Each triangle in the diagonal square is ½s². Two such triangles equal the original square.' : 'The four congruent corner triangles together occupy ½s², matching the inner square.'}</p></div><strong>{construction === 'diagonal' ? '1 : 2' : '1/2'}</strong></div>}

          {activity === 'machine' && ruleTested && <div className="rule-table-wrap"><div className="rule-table-title"><b>Test the Rule</b><span>Same ratio at every size</span></div><div className="rule-table">{[1, 2, 4, 7, 10].map((n) => { const item = createSquareModel(n, 'diagonal'); return <div className="rule-row" key={n}><span>s = {n}</span><span>{formatNumber(item.originalArea)} u²</span><span>{formatNumber(item.constructedArea)} u²</span><strong>{formatNumber(item.ratio)}×</strong></div> })}</div></div>}

          <section className="timeline panel" aria-label="Construction timeline">
            <div className="timeline-top"><div><span className="eyebrow">GEOMETRY TIME MACHINE</span><b>Construction timeline</b></div><span className="timeline-percent">{Math.round(progress)}%</span></div>
            <input className="timeline-range range" aria-label="Scrub construction timeline" type="range" min="0" max="100" step="0.1" value={progress} onChange={(event) => changeTimeline(Number(event.target.value))} style={{ '--fill': `${progress}%` } as CSSProperties} />
            <div className="timeline-labels">{timelineSteps[construction].map((step, index) => <button key={step} className={progress >= index / (timelineSteps[construction].length - 1) * 100 ? 'reached' : ''} onClick={() => changeTimeline(index / (timelineSteps[construction].length - 1) * 100)}>{step}</button>)}</div>
            <div className="timeline-actions"><div className="timeline-transport"><button onClick={() => changeTimeline(Math.max(0, progress - 20))} aria-label="Step backward"><ChevronLeft size={16} /><span>Step back</span></button><button className="transport-play" onClick={() => { if (progress >= 100) changeProgress(0); setPlaying((current) => !current) }}>{playing ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}<span>{playing ? 'Pause' : 'Play'}</span></button><button onClick={() => changeTimeline(Math.min(100, progress + 20))} aria-label="Step forward"><span>Step forward</span><ChevronRight size={16} /></button></div><button className="timeline-reset" onClick={reset}><RotateCcw size={14} /> Reset</button></div>
          </section>
        </section>

        <aside className="proof-panel panel">
          <div className="panel-title proof-title"><span className="eyebrow">LIVE MEASUREMENTS</span><h2>Build the Proof</h2><span className="proof-count">{proofStep + 1} / {activeProof.length}</span></div>
          <div className="live-values">
            <div className="value-card"><span>Original area</span><b>{formatNumber(model.originalArea)} <small>units²</small></b><i>s² = {formatNumber(model.originalArea)}</i></div>
            <div className="value-card result-value"><span>{construction === 'diagonal' ? 'Diagonal square' : 'Midpoint square'}</span><b>{formatNumber(model.constructedArea)} <small>units²</small></b><i>{construction === 'diagonal' ? 'd = ' + formatNumber(model.diagonal) : 'a = ' + formatNumber(model.constructedSide)}</i></div>
          </div>
          <div className="ratio-meter"><div className="ratio-head"><span>Area ratio <small>A₂ / A₁</small></span><b>{construction === 'diagonal' ? '2 : 1' : '1 : 2'}</b></div><div className="meter-pairs"><span><i className="meter-original" style={{ width: construction === 'diagonal' ? '50%' : '100%' }} /></span><span><i className="meter-result" style={{ width: construction === 'diagonal' ? '100%' : '50%' }} /></span></div><div className="meter-labels"><span>Original</span><span>Constructed</span></div></div>
          {showFormula && <div className="formula-card"><div className="formula-heading"><span className="eyebrow">STEP {proofStep + 1} · {activeProof[proofStep]!.title}</span><span className="formula-symbol">ƒ</span></div><strong>{activeProof[proofStep]!.formula}</strong><p>{activeProof[proofStep]!.focus}</p><div className="proof-progress">{activeProof.map((stage, index) => <button key={stage.title} className={index <= proofStep ? 'done' : ''} onClick={() => jumpToProof(index)} aria-label={`Show proof step ${index + 1}: ${stage.title}`} />)}</div><div className="proof-actions"><button onClick={() => jumpToProof(proofStep - 1)} disabled={proofStep === 0}><ChevronLeft size={14} /> Previous</button><button className="proof-next" onClick={() => jumpToProof(proofStep + 1)} disabled={proofStep === activeProof.length - 1}>Next step <ChevronRight size={14} /></button></div></div>}
          <div className="formula-toggle"><span><b>Formula display</b><small>Show staged derivation</small></span><Toggle compact label="Show formulas" checked={showFormula} onChange={setShowFormula} /></div>
          <div className="theorem-note"><span><Check size={14} /></span><p>{construction === 'diagonal' ? 'The ratio stays 2 : 1 as the side changes or the figure rotates.' : 'The ratio stays 1 : 2 as the side changes or the figure rotates.'}</p></div>
        </aside>
      </div>
      <footer className="footer"><span>SquareLab · Interactive geometry & area explorer</span><span>Explore. Construct. Understand.</span></footer>
    </main>
  )
}

function ActivityButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button className={`activity-tab ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>{icon}<span>{label}</span></button>
}

function Toggle({ label, checked, onChange, compact = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; compact?: boolean }) {
  return <label className={`toggle ${compact ? 'compact' : ''}`}><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>
}

type DrawingProps = {
  construction: Construction
  model: SquareModel
  progress: number
  areaVision: boolean
  showLabels: boolean
  showMidpoints: boolean
  showAxes: boolean
  showGrid: boolean
  interactive: boolean
  viewBox?: string
  onPointerDown?: (event: ReactPointerEvent<SVGCircleElement>) => void
  onPointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp?: (event: ReactPointerEvent<SVGSVGElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<SVGSVGElement>) => void
}

const ConstructionSVG = forwardRef<SVGSVGElement, DrawingProps>(function ConstructionSVG({ construction, model, progress, areaVision, showLabels, showMidpoints, showAxes, showGrid, interactive, viewBox = '0 0 800 620', onPointerDown, onPointerMove, onPointerUp, onKeyDown }, forwardedRef) {
  const diagonal = construction === 'diagonal'
  const [a, , c] = model.outer
  const center = average(model.constructed)
  const reveals = diagonal ? progress >= 18 : progress >= 40
  const measured = diagonal ? progress >= 38 : progress >= 20
  const construct = diagonal ? progress >= 55 : progress >= 56
  const highlight = areaVision || progress >= 77
  const result = progress >= 96
  const gridStep = model.sidePixels / Math.sqrt(model.originalArea)
  const constructStart = diagonal ? 52 : 38
  const constructEnd = diagonal ? 66 : 58
  const opacity = Math.max(0, Math.min(1, (progress - constructStart) / (constructEnd - constructStart)))
  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => onPointerMove?.(event)
  const pointerUp = (event: ReactPointerEvent<SVGSVGElement>) => onPointerUp?.(event)

  return <svg ref={forwardedRef} className={`geometry-svg ${interactive ? 'is-interactive' : ''}`} viewBox={viewBox} role="group" aria-label={`${diagonal ? 'Diagonal square' : 'Midpoint square'} construction; side ${formatNumber(model.originalArea ** 0.5)} units`} tabIndex={interactive ? 0 : -1} onKeyDown={onKeyDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <defs><pattern id={`grid-${construction}-${interactive ? 'main' : 'split'}`} width={gridStep} height={gridStep} patternUnits="userSpaceOnUse"><path d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`} fill="none" stroke="#e2e9ed" strokeWidth=".8" /></pattern></defs>
    {showGrid && <rect x="-300" y="-300" width="1400" height="1200" fill={`url(#grid-${construction}-${interactive ? 'main' : 'split'})`} />}
    {showAxes && <g className="axes"><line x1="400" y1="30" x2="400" y2="590" /><line x1="25" y1="310" x2="775" y2="310" /><circle cx="400" cy="310" r="3" /></g>}
    <g className="geometry-drawing">
      {!diagonal && highlight && model.corners.map((corner, index) => <polygon key={index} points={points(corner)} className={`corner-region region-${index + 1}`} />)}
      {diagonal && construct && highlight && model.constructed.map((point, index) => <polygon key={index} points={points([center, point, model.constructed[(index + 1) % 4]!])} className={`diagonal-region region-${index + 1}`} />)}
      <polygon points={points(model.outer)} className={`original-fill ${!diagonal && highlight ? 'original-dimmed' : ''}`} />
      {construct && <polygon points={points(model.constructed)} className="constructed-fill" style={{ opacity: opacity * (areaVision || highlight ? 0.3 : 0.22) }} />}
      <polygon points={points(model.outer)} className="original-outline" />
      {diagonal && reveals && <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} className="diagonal-line" />}
      {progress >= constructStart && <polygon points={points(model.constructed)} className="constructed-outline" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - opacity * 100} style={{ opacity: Math.min(1, opacity * 1.7) }} />}
      {!diagonal && measured && showMidpoints && model.midpoints.map((p, i) => <g key={i} className="midpoint-dot" style={{ opacity: Math.max(0, Math.min(1, (progress - (16 + i * 4)) / 5)) }}><circle cx={p.x} cy={p.y} r="5.2" /><text x={p.x + (i === 3 ? -21 : 8)} y={p.y + (i === 0 ? -10 : i === 2 ? 18 : 4)}>M{i + 1}</text></g>)}
      {diagonal && construct && highlight && <g className="sector-labels">{model.constructed.map((p, i) => { const q = model.constructed[(i + 1) % 4]!; const mid = { x: (center.x + p.x + q.x) / 3, y: (center.y + p.y + q.y) / 3 }; return <text key={i} x={mid.x} y={mid.y}>½s²</text> })}</g>}
      {!diagonal && highlight && <g className="corner-labels">{model.corners.map((part, i) => { const p = average(part); return <text key={i} x={p.x} y={p.y}>⅛s²</text> })}</g>}
      {diagonal && measured && showLabels && <Label x={(a.x + c.x) / 2 + 22} y={(a.y + c.y) / 2 - 14} text={`d = ${formatNumber(model.diagonal)}`} kind="violet" />}
      {showLabels && <Label x={(model.outer[0].x + model.outer[1].x) / 2} y={(model.outer[0].y + model.outer[1].y) / 2 - 20} text={`s = ${formatNumber(model.originalArea ** 0.5)}`} kind="blue" />}
      {construct && showLabels && <Label x={(model.constructed[0].x + model.constructed[1].x) / 2 + 20} y={(model.constructed[0].y + model.constructed[1].y) / 2 - 15} text={`a = ${formatNumber(model.constructedSide)}`} kind="violet" />}
      {highlight && result && <g className="relationship-stamp"><rect x="335" y="48" width="130" height="34" rx="17" /><text x="400" y="70">{diagonal ? 'AREA RATIO 2 : 1' : 'AREA RATIO 1 : 2'}</text></g>}
      {interactive && <g className="drag-handle" onPointerDown={onPointerDown} aria-label="Drag to resize and rotate"><circle cx={model.draggablePoint.x} cy={model.draggablePoint.y} r="12" className="handle-halo" /><circle cx={model.draggablePoint.x} cy={model.draggablePoint.y} r="5.5" className="handle-core" /><text x={model.draggablePoint.x - 14} y={model.draggablePoint.y + 27}>DRAG</text></g>}
    </g>
  </svg>
})

function Label({ x, y, text, kind }: { x: number; y: number; text: string; kind: 'blue' | 'violet' }) {
  const width = Math.max(54, text.length * 7 + 18)
  return <g className={`shape-label ${kind}`}><rect x={x - width / 2} y={y - 15} width={width} height="26" rx="13" /><text x={x} y={y + 3}>{text}</text></g>
}

export default App
