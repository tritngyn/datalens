import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CHART_ASPECTS,
  DEMO_REVIEWS,
  PARTIAL_PENDING_IDS,
  SCENARIOS,
  SCENARIO_ORDER,
} from '../src/prototype/data.ts'
import {
  buildComparison,
  cellFor,
  computeCell,
  coverage,
  describeScenario,
  formatRate,
  highlightSegments,
  selectReviews,
} from '../src/prototype/logic.ts'

const allIds = new Set(DEMO_REVIEWS.map((review) => review.id))

function review(id, sourceBrand, relevance, mentions) {
  return {
    id,
    recordNumber: Number(id.replace(/\D/g, '')),
    sourceBrand,
    text: 'text',
    context: '',
    relevance,
    mentions,
  }
}

test('demo mentions are verbatim evidence and sample IDs exist', () => {
  for (const review of DEMO_REVIEWS) {
    for (const mention of review.mentions) {
      assert.ok(
        review.text.includes(mention.evidence),
        `${review.id}: evidence không nằm trong text: ${mention.evidence}`,
      )
    }
  }
  for (const scenario of Object.values(SCENARIOS)) {
    for (const id of scenario.sampleIds) {
      assert.ok(allIds.has(id), `${scenario.id}: unknown sample id ${id}`)
    }
  }
})

test('scenario citations stay inside their own scope', () => {
  for (const id of SCENARIO_ORDER) {
    const scenario = SCENARIOS[id]
    const inScope = new Set(
      selectReviews(DEMO_REVIEWS, scenario.scope).map((item) => item.review.id),
    )
    for (const sampleId of scenario.sampleIds) {
      assert.ok(inScope.has(sampleId), `${id}: ${sampleId} ngoài scope`)
    }
  }
})

test('comparison counts reviews, not mentions, and derives rates', () => {
  const comparison = buildComparison(DEMO_REVIEWS)
  const dhcPrice = cellFor(comparison, 'DHC', 'Price')
  const dhcBenefits = cellFor(comparison, 'DHC', 'Benefits')
  const vaselinePrice = cellFor(comparison, 'Vaseline', 'Price')
  const vaselineBenefits = cellFor(comparison, 'Vaseline', 'Benefits')

  assert.deepEqual(dhcPrice, {
    aspect: 'Price',
    brand: 'DHC',
    negatives: 3,
    total: 4,
    rate: 75,
  })
  assert.equal(dhcBenefits?.negatives, 0)
  assert.equal(dhcBenefits?.total, 7)
  assert.equal(dhcBenefits?.rate, 0)
  assert.deepEqual(vaselinePrice, {
    aspect: 'Price',
    brand: 'Vaseline',
    negatives: 0,
    total: 2,
    rate: 0,
  })
  assert.deepEqual(vaselineBenefits, {
    aspect: 'Benefits',
    brand: 'Vaseline',
    negatives: 1,
    total: 4,
    rate: 25,
  })
  assert.equal(comparison.length, CHART_ASPECTS.length * 2)
})

test('a review with two mentions of the same aspect counts once', () => {
  const reviews = [
    review('T-1', 'DHC', 'relevant', [
      { target: 'DHC', aspect: 'Price', sentiment: 'Negative', evidence: 'a' },
      { target: 'DHC', aspect: 'Price', sentiment: 'Positive', evidence: 'b' },
    ]),
  ]
  const cell = computeCell(reviews, 'DHC', 'Price')
  assert.equal(cell.total, 1)
  assert.equal(cell.negatives, 1)
  assert.equal(cell.rate, 100)
})

test('zero denominator is reported as insufficient data', () => {
  const comparison = buildComparison(DEMO_REVIEWS)
  const vaselineBenefits = cellFor(comparison, 'Vaseline', 'Benefits')
  assert.equal(vaselineBenefits?.rate, 25)

  const processed = DEMO_REVIEWS.filter(
    (item) => !PARTIAL_PENDING_IDS.includes(item.id),
  )
  const partial = buildComparison(processed)
  const zero = cellFor(partial, 'Vaseline', 'Benefits')
  assert.equal(zero?.total, 0)
  assert.equal(zero?.rate, null)
  assert.equal(formatRate(zero?.rate ?? null), 'Không đủ dữ liệu')
})

test('sentiment filter narrows reviews but not the chart denominator', () => {
  const filter = { brand: 'DHC', aspect: 'Price', sentiment: 'Negative' }
  const matched = selectReviews(DEMO_REVIEWS, filter)
  assert.deepEqual(
    matched.map((item) => item.review.id),
    ['SYN-002', 'SYN-003', 'SYN-020'],
  )
  for (const item of matched) {
    assert.ok(item.mentions.length > 0)
    assert.ok(
      item.mentions.every(
        (mention) =>
          mention.target === 'DHC' &&
          mention.aspect === 'Price' &&
          mention.sentiment === 'Negative',
      ),
    )
  }

  const barFilter = { brand: 'DHC', aspect: 'Price' }
  const denominator = selectReviews(DEMO_REVIEWS, barFilter)
  assert.equal(denominator.length, 4)
  assert.equal(cellFor(buildComparison(DEMO_REVIEWS), 'DHC', 'Price')?.total, 4)
})

test('highlightSegments reconstructs text and marks evidence safely', () => {
  const text = 'DHC đắt thật nhưng bù lại dưỡng ẩm rất ổn, mình vẫn mua lại.'
  const segments = highlightSegments(text, ['đắt thật', 'dưỡng ẩm rất ổn'])
  assert.equal(
    segments.map((segment) => segment.text).join(''),
    text,
  )
  assert.deepEqual(
    segments.filter((segment) => segment.mark).map((segment) => segment.text),
    ['đắt thật', 'dưỡng ẩm rất ổn'],
  )

  const overlapping = highlightSegments('abcde', ['abc', 'bcd'])
  assert.equal(
    overlapping.map((segment) => segment.text).join(''),
    'abcde',
  )
  assert.deepEqual(
    overlapping.filter((segment) => segment.mark).map((segment) => segment.text),
    ['abc'],
  )

  assert.deepEqual(highlightSegments('không có trích', ['missing']), [
    { text: 'không có trích', mark: false },
  ])
})

test('coverage separates pending, off-topic, needs-review and outside pair', () => {
  const full = coverage(DEMO_REVIEWS, allIds)
  assert.deepEqual(full, {
    total: 23,
    processed: 23,
    pending: 0,
    relevant: 20,
    offTopic: 1,
    needsReview: 2,
    outsidePair: 1,
  })

  const processedIds = new Set(
    DEMO_REVIEWS.map((item) => item.id).filter(
      (id) => !PARTIAL_PENDING_IDS.includes(id),
    ),
  )
  const partial = coverage(DEMO_REVIEWS, processedIds)
  assert.equal(partial.processed, 19)
  assert.equal(partial.pending, 4)
})

test('sample answers derive their numbers from the cited reviews', () => {
  const sample = DEMO_REVIEWS.filter((item) =>
    SCENARIOS.compare.sampleIds.includes(item.id),
  )
  const compareText = describeScenario('compare', sample)
  assert.match(compareText, /Trong 5 review đã đọc/)
  assert.match(compareText, /DHC bị chê giá ở 2 review/)
  assert.match(compareText, /Vaseline được khen rẻ ở 1 review/)

  const negativeSample = DEMO_REVIEWS.filter((item) =>
    SCENARIOS['negative-benefits'].sampleIds.includes(item.id),
  )
  const negativeText = describeScenario('negative-benefits', negativeSample)
  assert.match(negativeText, /Trong 1 review khớp bộ lọc/)
  assert.match(negativeText, /không có review tiêu cực nào về hiệu quả dưỡng của DHC/)

  assert.match(describeScenario('compare', []), /Không có review nào khớp/)
})

test('filtering can produce an explicit empty result', () => {
  const empty = selectReviews(DEMO_REVIEWS, {
    aspect: 'Color',
    sentiment: 'Negative',
  })
  assert.deepEqual(empty, [])
})
