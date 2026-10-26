export type Construction = 'diagonal' | 'midpoints'
export type Point = { x: number; y: number }

export type SquareModel = {
  outer: [Point, Point, Point, Point]
  constructed: [Point, Point, Point, Point]
  midpoints: [Point, Point, Point, Point]
  corners: [Point[], Point[], Point[], Point[]]
  center: Point
  dragPivot: Point
  draggablePoint: Point
  sidePixels: number
  originalArea: number
  constructedArea: number
  ratio: number
  constructedSide: number
  diagonal: number
}

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const rotate = (point: Point, angle: number): Point => {
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }
}

export function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + point.x * next.y - next.x * point.y
  }, 0)) / 2
}

/** Build both constructions from exact square vectors, then apply one rigid rotation. */
export function createSquareModel(side: number, construction: Construction, angle = 0, scaleFactor = 20): SquareModel {
  const sidePixels = side * scaleFactor
  const center = { x: 400, y: 310 }
  const origin = construction === 'diagonal'
    ? add(center, rotate({ x: sidePixels, y: -sidePixels }, angle))
    : center
  const at = (vector: Point) => add(origin, rotate(vector, angle))
  let outer: [Point, Point, Point, Point]

  if (construction === 'diagonal') {
    // B is the shared anchor. AC is the original square's diagonal and the
    // first side of the attached square; rotating AC by 90° supplies its next side.
    outer = [at({ x: -sidePixels, y: 0 }), origin, at({ x: 0, y: sidePixels }), at({ x: -sidePixels, y: sidePixels })]
  } else {
    const half = sidePixels / 2
    outer = [at({ x: -half, y: -half }), at({ x: half, y: -half }), at({ x: half, y: half }), at({ x: -half, y: half })]
  }

  const [a, b, c, d] = outer
  const midpoints: [Point, Point, Point, Point] = [midpoint(a, b), midpoint(b, c), midpoint(c, d), midpoint(d, a)]
  const corners: [Point[], Point[], Point[], Point[]] = [
    [a, midpoints[0], midpoints[3]],
    [midpoints[0], b, midpoints[1]],
    [midpoints[1], c, midpoints[2]],
    [midpoints[2], d, midpoints[3]],
  ]
  const squareCenter = {
    x: outer.reduce((sum, point) => sum + point.x, 0) / 4,
    y: outer.reduce((sum, point) => sum + point.y, 0) / 4,
  }
  const constructed: [Point, Point, Point, Point] = construction === 'midpoints'
    ? midpoints
    : (() => {
        const offset = rotate({ x: -sidePixels, y: sidePixels }, angle)
        return [a, c, add(c, offset), add(a, offset)]
      })()
  const originalArea = polygonArea(outer) / (scaleFactor * scaleFactor)
  const constructedArea = polygonArea(constructed) / (scaleFactor * scaleFactor)
  const constructedSide = Math.hypot(constructed[1].x - constructed[0].x, constructed[1].y - constructed[0].y) / scaleFactor

  return {
    outer,
    constructed,
    midpoints,
    corners,
    center: squareCenter,
    dragPivot: center,
    draggablePoint: outer[0],
    sidePixels,
    originalArea,
    constructedArea,
    ratio: constructedArea / originalArea,
    constructedSide,
    diagonal: Math.hypot(c.x - a.x, c.y - a.y) / scaleFactor,
  }
}

/** Convert a dragged top-left vertex back to side length and rotation around a fixed canvas pivot. */
export function squareParametersFromHandle(point: Point, pivot: Point, construction: Construction, scaleFactor = 20): { side: number; angle: number } {
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y
  const baseAngle = construction === 'diagonal' ? -90 : -135
  const sideScale = construction === 'diagonal' ? 1 : Math.SQRT2
  const angle = Math.atan2(dy, dx) * 180 / Math.PI - baseAngle
  return {
    side: Math.hypot(dx, dy) * sideScale / scaleFactor,
    angle: ((angle + 540) % 360) - 180,
  }
}

export function formatNumber(value: number, digits = 2): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value))
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

export function ratioLabel(construction: Construction): string {
  return construction === 'diagonal' ? '2 : 1' : '1 : 2'
}
