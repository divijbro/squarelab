import assert from 'node:assert/strict'
import test from 'node:test'
import { createSquareModel, polygonArea, squareParametersFromHandle } from '../src/geometry.ts'

const closeTo = (actual, expected, epsilon = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `expected ${actual} to be within ${epsilon} of ${expected}`)
}
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
const dot = (a, b) => a.x * b.x + a.y * b.y
const vector = (a, b) => ({ x: b.x - a.x, y: b.y - a.y })

for (const side of [1, 2.5, 4, 10]) {
  for (const angle of [0, 37, 90, -123]) {
    test(`side ${side}, rotation ${angle}° preserves both area rules`, () => {
      const double = createSquareModel(side, 'diagonal', angle)
      const half = createSquareModel(side, 'midpoints', angle)
      closeTo(double.originalArea, side ** 2)
      closeTo(double.constructedArea, 2 * side ** 2)
      closeTo(double.ratio, 2)
      closeTo(half.originalArea, side ** 2)
      closeTo(half.constructedArea, side ** 2 / 2)
      closeTo(half.ratio, 0.5)
    })
  }
}

test('diagonal construction is a square on the original diagonal', () => {
  const model = createSquareModel(7, 'diagonal', 41)
  const diagonal = vector(model.outer[0], model.outer[2])
  const side = vector(model.constructed[0], model.constructed[1])
  const nextSide = vector(model.constructed[1], model.constructed[2])
  closeTo(distance(model.constructed[0], model.constructed[1]), model.diagonal * 20)
  closeTo(dot(side, nextSide), 0)
  closeTo(Math.hypot(diagonal.x, diagonal.y), model.diagonal * 20)
  for (let i = 0; i < 4; i += 1) closeTo(distance(model.constructed[i], model.constructed[(i + 1) % 4]), model.sidePixels * Math.SQRT2)
  const turn = (origin, end, point) => {
    const edge = vector(origin, end)
    const towardPoint = vector(origin, point)
    return edge.x * towardPoint.y - edge.y * towardPoint.x
  }
  assert.ok(turn(model.outer[0], model.outer[2], model.outer[1]) * turn(model.outer[0], model.outer[2], model.constructed[3]) < 0, 'the two squares must be on opposite sides of the shared diagonal')
  const constructedCenter = {
    x: model.constructed.reduce((sum, point) => sum + point.x, 0) / 4,
    y: model.constructed.reduce((sum, point) => sum + point.y, 0) / 4,
  }
  const sectorAreas = model.constructed.map((point, index) => polygonArea([constructedCenter, point, model.constructed[(index + 1) % 4]]) / 400)
  sectorAreas.forEach((area) => closeTo(area, 7 ** 2 / 2))
})

test('joining the midpoints gives four equal corner triangles and a square', () => {
  const model = createSquareModel(8, 'midpoints', -29)
  const triangleAreas = model.corners.map((triangle) => {
    const [a, b, c] = triangle
    return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2 / 400
  })
  triangleAreas.forEach((area) => closeTo(area, 8 ** 2 / 8))
  model.constructed.forEach((point, index) => {
    const next = model.constructed[(index + 1) % 4]
    const after = model.constructed[(index + 2) % 4]
    closeTo(distance(point, next), model.sidePixels / Math.SQRT2)
    closeTo(dot(vector(point, next), vector(next, after)), 0)
  })
  closeTo(triangleAreas.reduce((sum, area) => sum + area, 0), model.originalArea / 2)
})

for (const construction of ['diagonal', 'midpoints']) {
  for (const angle of [-179, -90, 0, 37, 179]) {
    test(`${construction} drag mapping stays stable at ${angle}°`, () => {
      const desiredSide = 8.25
      const model = createSquareModel(desiredSide, construction, angle)
      const mapped = squareParametersFromHandle(model.draggablePoint, model.dragPivot, construction)
      closeTo(mapped.side, desiredSide)
      closeTo(Math.sin((mapped.angle - angle) * Math.PI / 360), 0)

      const rebuilt = createSquareModel(mapped.side, construction, mapped.angle)
      closeTo(distance(rebuilt.draggablePoint, model.draggablePoint), 0)
    })
  }
}

