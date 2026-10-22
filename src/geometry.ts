export type Construction = 'diagonal' | 'midpoints'

export type Point = { x: number; y: number }

export type SquareModel = {
  outer: [Point, Point, Point, Point]
  constructed: [Point, Point, Point, Point]
  midpoints: [Point, Point, Point, Point]
  corners: [Point[], Point[], Point[], Point[]]
  sidePixels: number
  originalArea: number
  constructedArea: number
  ratio: number
  constructedSide: number
}

const midpoint = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })

export function createSquareModel(side: number, construction: Construction): SquareModel {
  const sidePixels = side * 28
  const half = sidePixels / 2
  // Center the complete diagonal-square construction in the viewBox. Because
  // its side is an interior diagonal, the new square shares one half of the
  // original square; the drawing keeps that overlap mathematically honest.
  const centerX = construction === 'diagonal' ? 400 - half : 400
  const centerY = construction === 'diagonal' ? 310 + half : 310
  const outer: [Point, Point, Point, Point] = [
    { x: centerX - half, y: centerY - half },
    { x: centerX + half, y: centerY - half },
    { x: centerX + half, y: centerY + half },
    { x: centerX - half, y: centerY + half },
  ]
  const [a, b, c, d] = outer
  const midpoints: [Point, Point, Point, Point] = [midpoint(a, b), midpoint(b, c), midpoint(c, d), midpoint(d, a)]
  const corners: [Point[], Point[], Point[], Point[]] = [
    [a, midpoints[0], midpoints[3]],
    [midpoints[0], b, midpoints[1]],
    [midpoints[1], c, midpoints[2]],
    [midpoints[2], d, midpoints[3]],
  ]

  if (construction === 'midpoints') {
    return {
      outer,
      constructed: midpoints,
      midpoints,
      corners,
      sidePixels,
      originalArea: side * side,
      constructedArea: (side * side) / 2,
      ratio: 0.5,
      constructedSide: side / Math.sqrt(2),
    }
  }

  // A square on diagonal AC sits on the opposite side of AC from the original.
  // Rotating AC by 90° gives an exactly equal perpendicular side.
  const diagonalOffset = { x: sidePixels, y: -sidePixels }
  const diagonalSquare: [Point, Point, Point, Point] = [
    a,
    c,
    { x: c.x + diagonalOffset.x, y: c.y + diagonalOffset.y },
    { x: a.x + diagonalOffset.x, y: a.y + diagonalOffset.y },
  ]
  return {
    outer,
    constructed: diagonalSquare,
    midpoints,
    corners,
    sidePixels,
    originalArea: side * side,
    constructedArea: side * side * 2,
    ratio: 2,
    constructedSide: side * Math.SQRT2,
  }
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function ratioLabel(construction: Construction): string {
  return construction === 'diagonal' ? '2 : 1' : '1 : 2'
}
