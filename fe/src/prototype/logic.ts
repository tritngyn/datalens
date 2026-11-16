import {
  CHART_ASPECTS,
  PROTOTYPE_BRANDS,
  type Aspect,
  type BrandKey,
  type DemoMention,
  type DemoReview,
  type ScenarioId,
  type Sentiment,
  type TargetBrand,
} from './data.ts'

export type ReviewFilter = {
  brand?: BrandKey | 'all'
  aspect?: Aspect | 'all'
  sentiment?: Sentiment | 'all'
}

export type MatchedReview = {
  review: DemoReview
  mentions: DemoMention[]
}

export type ComparisonCell = {
  aspect: Aspect
  brand: BrandKey
  negatives: number
  total: number
  /** null khi mẫu số bằng 0; UI phải hiện "Không đủ dữ liệu". */
  rate: number | null
}

export type Coverage = {
  total: number
  processed: number
  pending: number
  relevant: number
  offTopic: number
  needsReview: number
  outsidePair: number
}

export type Segment = {
  text: string
  mark: boolean
}

function isAll(value: string | undefined): boolean {
  return value === undefined || value === 'all'
}

export function mentionMatches(
  mention: DemoMention,
  filter: ReviewFilter,
): boolean {
  if (!isAll(filter.brand) && mention.target !== filter.brand) return false
  if (!isAll(filter.aspect) && mention.aspect !== filter.aspect) return false
  if (!isAll(filter.sentiment) && mention.sentiment !== filter.sentiment) {
    return false
  }
  return true
}

export function matchingMentions(
  review: DemoReview,
  filter: ReviewFilter,
): DemoMention[] {
  return review.mentions.filter((mention) => mentionMatches(mention, filter))
}

/** Review được chọn khi có ít nhất một mention khớp bộ lọc hiện hành. */
export function selectReviews(
  reviews: DemoReview[],
  filter: ReviewFilter,
): MatchedReview[] {
  const selected: MatchedReview[] = []
  for (const review of reviews) {
    const mentions = matchingMentions(review, filter)
    if (mentions.length > 0) selected.push({ review, mentions })
  }
  return selected
}

/** Đếm theo review (không phải theo mention) cho một cặp brand × aspect. */
export function computeCell(
  reviews: DemoReview[],
  brand: BrandKey,
  aspect: Aspect,
): ComparisonCell {
  let total = 0
  let negatives = 0
  for (const review of reviews) {
    const mentions = review.mentions.filter(
      (mention) => mention.target === brand && mention.aspect === aspect,
    )
    if (mentions.length === 0) continue
    total += 1
    if (mentions.some((mention) => mention.sentiment === 'Negative')) {
      negatives += 1
    }
  }
  return {
    aspect,
    brand,
    negatives,
    total,
    rate: total === 0 ? null : Math.round((negatives / total) * 100),
  }
}

/** Grouped bar: mỗi aspect một nhóm, mỗi brand một cột. */
export function buildComparison(reviews: DemoReview[]): ComparisonCell[] {
  const cells: ComparisonCell[] = []
  for (const aspect of CHART_ASPECTS) {
    for (const brand of PROTOTYPE_BRANDS) {
      cells.push(computeCell(reviews, brand, aspect))
    }
  }
  return cells
}

export function cellFor(
  comparison: ComparisonCell[],
  brand: BrandKey,
  aspect: Aspect,
): ComparisonCell | undefined {
  return comparison.find(
    (cell) => cell.brand === brand && cell.aspect === aspect,
  )
}

export function formatRate(rate: number | null): string {
  return rate === null ? 'Không đủ dữ liệu' : `${rate}%`
}

export function coverage(
  reviews: DemoReview[],
  processedIds: ReadonlySet<string>,
): Coverage {
  let processed = 0
  let relevant = 0
  let offTopic = 0
  let needsReview = 0
  let outsidePair = 0
  for (const review of reviews) {
    if (!processedIds.has(review.id)) continue
    processed += 1
    if (review.relevance === 'off_topic') offTopic += 1
    if (review.relevance === 'needs_review') needsReview += 1
    if (review.relevance === 'relevant') {
      relevant += 1
      if (review.mentions.some((mention) => mention.target === 'other')) {
        outsidePair += 1
      }
    }
  }
  return {
    total: reviews.length,
    processed,
    pending: reviews.length - processed,
    relevant,
    offTopic,
    needsReview,
    outsidePair,
  }
}

export function scenarioScopeCount(
  reviews: DemoReview[],
  scope: { aspect: Aspect | 'all'; sentiment: Sentiment | 'all' },
): number {
  return selectReviews(reviews, scope).length
}

/** Tìm mention của một brand/aspect trong một review (dùng cho mẫu tóm tắt). */
function hasMention(
  review: DemoReview,
  target: TargetBrand,
  aspect: Aspect,
  sentiment: Sentiment,
): boolean {
  return review.mentions.some(
    (mention) =>
      mention.target === target &&
      mention.aspect === aspect &&
      mention.sentiment === sentiment,
  )
}

/**
 * Câu trả lời mẫu. Phần câu chữ cố định; các con số được tính từ đúng sample
 * đã đọc để không lệch với citation/chart.
 */
export function describeScenario(
  scenarioId: ScenarioId,
  sample: DemoReview[],
): string {
  if (sample.length === 0) {
    return 'Không có review nào khớp phạm vi đang chọn nên tôi không đưa ra nhận xét.'
  }

  if (scenarioId === 'compare') {
    const dhcPriceNegative = sample.filter((review) =>
      hasMention(review, 'DHC', 'Price', 'Negative'),
    ).length
    const dhcBenefitsPositive = sample.filter((review) =>
      hasMention(review, 'DHC', 'Benefits', 'Positive'),
    ).length
    const vaselinePricePositive = sample.filter((review) =>
      hasMention(review, 'Vaseline', 'Price', 'Positive'),
    ).length
    const vaselineBenefitsNegative = sample.filter((review) =>
      hasMention(review, 'Vaseline', 'Benefits', 'Negative'),
    ).length

    return (
      `Trong ${sample.length} review đã đọc, DHC bị chê giá ở ${dhcPriceNegative} review ` +
      `và được khen dưỡng ẩm ở ${dhcBenefitsPositive} review. Vaseline được khen rẻ ở ` +
      `${vaselinePricePositive} review, nhưng có ${vaselineBenefitsNegative} review chê ` +
      'dưỡng kém hơn DHC.'
    )
  }

  if (scenarioId === 'negative-benefits') {
    const vaselineNegative = sample.filter((review) =>
      hasMention(review, 'Vaseline', 'Benefits', 'Negative'),
    ).length
    const dhcNegative = sample.filter((review) =>
      hasMention(review, 'DHC', 'Benefits', 'Negative'),
    ).length

    return (
      `Trong ${sample.length} review khớp bộ lọc, ${vaselineNegative} review nhắc ` +
      `Vaseline dưỡng kém hơn DHC` +
      (dhcNegative > 0
        ? ` và ${dhcNegative} review chê hiệu quả dưỡng của DHC.`
        : '; không có review tiêu cực nào về hiệu quả dưỡng của DHC trong mẫu này.')
    )
  }

  return (
    `Đây là ${sample.length} review làm căn cứ cho câu trả lời so sánh ở trên. ` +
    'Bấm một citation để mở đúng review; phần tô sáng là câu trích đã dùng.'
  )
}

/**
 * Chia text thành các đoạn để render an toàn (React text node), tô sáng tối đa
 * một lần cho mỗi evidence. Không dùng HTML, không dangerouslySetInnerHTML.
 */
export function highlightSegments(
  text: string,
  evidences: string[],
): Segment[] {
  const ranges: { start: number; end: number }[] = []
  const seen = new Set<string>()
  for (const evidence of evidences) {
    if (!evidence || seen.has(evidence)) continue
    seen.add(evidence)
    const start = text.indexOf(evidence)
    if (start < 0) continue
    ranges.push({ start, end: start + evidence.length })
  }
  ranges.sort((left, right) => left.start - right.start)

  const segments: Segment[] = []
  let cursor = 0
  for (const range of ranges) {
    if (range.start < cursor) continue
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), mark: false })
    }
    segments.push({ text: text.slice(range.start, range.end), mark: true })
    cursor = range.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: false })
  }
  return segments
}
