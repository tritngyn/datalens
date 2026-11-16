/**
 * Dữ liệu minh họa của UI-P.
 *
 * 22 review lấy nguyên văn từ fixture synthetic của project:
 * be/data/fixtures/p0_synthetic_dhc_vs_vaseline_22.csv
 * Mention được khai báo riêng cho prototype; 14 review đầu dùng đúng nội dung
 * trong be/data/fixtures/p0_synthetic_expected_extraction.json
 * (nhãn synthetic functional, KHÔNG phải gold và không dùng để benchmark).
 * SYN-023 là review synthetic viết thêm cho prototype, chỉ để duyệt trạng thái
 * text dài / "Xem đầy đủ"; nó không nhắc Giá hay Hiệu quả dưỡng nên không làm
 * đổi biểu đồ so sánh.
 *
 * Đây là dữ liệu trình diễn: không gửi lên backend, không lưu localStorage,
 * không gọi model. Mọi count/rate/chart/drill-down phải suy từ file này.
 */

export type BrandKey = 'DHC' | 'Vaseline'
export type TargetBrand = BrandKey | 'other'
export type Aspect =
  | 'GeneralExperience'
  | 'Benefits'
  | 'Color'
  | 'SideEffects'
  | 'Price'
  | 'Texture'
  | 'Longevity'
  | 'Scent'
  | 'Packaging'
  | 'Ingredients'
export type Sentiment = 'Positive' | 'Neutral' | 'Negative'
export type Relevance = 'relevant' | 'off_topic' | 'needs_review'

export type DemoMention = {
  target: TargetBrand
  aspect: Aspect
  sentiment: Sentiment
  /** Phải là chuỗi con nguyên văn của text; có test kiểm tra. */
  evidence: string
}

export type DemoReview = {
  id: string
  recordNumber: number
  sourceBrand: BrandKey
  text: string
  context: string
  relevance: Relevance
  mentions: DemoMention[]
}

export const PROTOTYPE_BRANDS: BrandKey[] = ['DHC', 'Vaseline']

export const ASPECT_LABELS: Record<Aspect, string> = {
  GeneralExperience: 'Trải nghiệm chung',
  Benefits: 'Hiệu quả dưỡng',
  Color: 'Màu',
  SideEffects: 'Tác dụng phụ',
  Price: 'Giá',
  Texture: 'Kết cấu',
  Longevity: 'Độ bền',
  Scent: 'Hương',
  Packaging: 'Bao bì',
  Ingredients: 'Thành phần',
}

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  Positive: 'Tích cực',
  Neutral: 'Trung tính',
  Negative: 'Tiêu cực',
}

/** Hai khía cạnh của câu so sánh mẫu và biểu đồ grouped bar. */
export const CHART_ASPECTS: Aspect[] = ['Price', 'Benefits']

export const DEMO_REVIEWS: DemoReview[] = [
  {
    id: 'SYN-001',
    recordNumber: 1,
    sourceBrand: 'DHC',
    text: 'DHC dưỡng ẩm tốt thật, môi mình hết khô hẳn sau một tuần.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm tốt thật',
      },
    ],
  },
  {
    id: 'SYN-002',
    recordNumber: 2,
    sourceBrand: 'DHC',
    text: 'Mua DHC vì thấy review khen, nhưng giá hơi cao so với sinh viên.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Price',
        sentiment: 'Negative',
        evidence: 'giá hơi cao',
      },
    ],
  },
  {
    id: 'SYN-003',
    recordNumber: 3,
    sourceBrand: 'DHC',
    text: 'DHC đắt thật nhưng bù lại dưỡng ẩm rất ổn, mình vẫn mua lại.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Price',
        sentiment: 'Negative',
        evidence: 'đắt thật',
      },
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm rất ổn',
      },
    ],
  },
  {
    id: 'SYN-004',
    recordNumber: 4,
    sourceBrand: 'DHC',
    text: 'Vaseline rẻ hơn nhiều mà dưỡng ẩm cũng ổn, mình chuyển sang Vaseline rồi.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Price',
        sentiment: 'Positive',
        evidence: 'rẻ hơn nhiều',
      },
      {
        target: 'Vaseline',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm cũng ổn',
      },
    ],
  },
  {
    id: 'SYN-005',
    recordNumber: 5,
    sourceBrand: 'DHC',
    text: 'Mình dùng DHC thấy thơm nhẹ, thích nhất là không bị dính môi.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Scent',
        sentiment: 'Positive',
        evidence: 'thơm nhẹ',
      },
      {
        target: 'DHC',
        aspect: 'Texture',
        sentiment: 'Positive',
        evidence: 'không bị dính môi',
      },
    ],
  },
  {
    id: 'SYN-006',
    recordNumber: 6,
    sourceBrand: 'DHC',
    text: 'DHC dưỡng tốt hơn Vaseline, còn Vaseline thì thơm hơn.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'DHC dưỡng tốt hơn Vaseline',
      },
      {
        target: 'Vaseline',
        aspect: 'Scent',
        sentiment: 'Positive',
        evidence: 'Vaseline thì thơm hơn',
      },
    ],
  },
  {
    id: 'SYN-007',
    recordNumber: 7,
    sourceBrand: 'DHC',
    text: 'Cái này dùng cũng được, chưa thấy khác gì mấy.',
    context: '',
    relevance: 'needs_review',
    mentions: [],
  },
  {
    id: 'SYN-008',
    recordNumber: 8,
    sourceBrand: 'Vaseline',
    text: 'Cái này thơm nhẹ, dùng ổn.',
    context: 'Đang nói về Vaseline hộp xanh.',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Scent',
        sentiment: 'Positive',
        evidence: 'thơm nhẹ',
      },
      {
        target: 'Vaseline',
        aspect: 'GeneralExperience',
        sentiment: 'Positive',
        evidence: 'dùng ổn',
      },
    ],
  },
  {
    id: 'SYN-009',
    recordNumber: 9,
    sourceBrand: 'Vaseline',
    text: 'Vaseline rẻ, dễ mua, dưỡng ẩm đủ dùng qua đêm.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Price',
        sentiment: 'Positive',
        evidence: 'rẻ',
      },
      {
        target: 'Vaseline',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm đủ dùng',
      },
    ],
  },
  {
    id: 'SYN-010',
    recordNumber: 10,
    sourceBrand: 'Vaseline',
    text: 'Mình thấy Vaseline bị bong tróc môi sau khi dùng, chắc không hợp.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'SideEffects',
        sentiment: 'Negative',
        evidence: 'bị bong tróc môi',
      },
    ],
  },
  {
    id: 'SYN-011',
    recordNumber: 11,
    sourceBrand: 'Vaseline',
    text: 'Vaseline thơm quá, mình thích mùi nhưng hộp khó mở.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Scent',
        sentiment: 'Negative',
        evidence: 'thơm quá',
      },
      {
        target: 'Vaseline',
        aspect: 'Packaging',
        sentiment: 'Negative',
        evidence: 'hộp khó mở',
      },
    ],
  },
  {
    id: 'SYN-012',
    recordNumber: 12,
    sourceBrand: 'Vaseline',
    text: 'DHC tốt hơn Vaseline về độ dưỡng, mình vẫn thích DHC hơn.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'DHC tốt hơn Vaseline về độ dưỡng',
      },
    ],
  },
  {
    id: 'SYN-013',
    recordNumber: 13,
    sourceBrand: 'Vaseline',
    text: 'Bánh mì phố mình ngon lắm, mọi người nên thử.',
    context: '',
    relevance: 'off_topic',
    mentions: [],
  },
  {
    id: 'SYN-014',
    recordNumber: 14,
    sourceBrand: 'DHC',
    text: 'DHC dùng ổn nhưng Vaseline thì mình thấy dưỡng kém hơn hẳn.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'GeneralExperience',
        sentiment: 'Positive',
        evidence: 'DHC dùng ổn',
      },
      {
        target: 'Vaseline',
        aspect: 'Benefits',
        sentiment: 'Negative',
        evidence: 'dưỡng kém hơn hẳn',
      },
    ],
  },
  {
    id: 'SYN-015',
    recordNumber: 15,
    sourceBrand: 'Vaseline',
    text: 'Son Vaseline có màu hồng nhạt xinh, còn độ bền thì bình thường.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Color',
        sentiment: 'Positive',
        evidence: 'màu hồng nhạt xinh',
      },
      {
        target: 'Vaseline',
        aspect: 'Longevity',
        sentiment: 'Neutral',
        evidence: 'độ bền thì bình thường',
      },
    ],
  },
  {
    id: 'SYN-016',
    recordNumber: 16,
    sourceBrand: 'DHC',
    text: 'Mình bị dị ứng với DHC, môi sưng và nổi mẩn.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'SideEffects',
        sentiment: 'Negative',
        evidence: 'bị dị ứng với DHC',
      },
    ],
  },
  {
    id: 'SYN-017',
    recordNumber: 17,
    sourceBrand: 'DHC',
    text: 'DHC thơm, dưỡng tốt, giá cũng hợp lý.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Scent',
        sentiment: 'Positive',
        evidence: 'DHC thơm',
      },
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng tốt',
      },
      {
        target: 'DHC',
        aspect: 'Price',
        sentiment: 'Positive',
        evidence: 'giá cũng hợp lý',
      },
    ],
  },
  {
    id: 'SYN-018',
    recordNumber: 18,
    sourceBrand: 'Vaseline',
    text: 'Lucas Papaw dưỡng tốt hơn Vaseline nhiều, mình đổi sang Lucas rồi.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'other',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'Lucas Papaw dưỡng tốt hơn Vaseline nhiều',
      },
    ],
  },
  {
    id: 'SYN-019',
    recordNumber: 19,
    sourceBrand: 'Vaseline',
    text: 'Son này có trị thâm môi không ạ? Mình đang tìm loại dưỡng.',
    context: '',
    relevance: 'needs_review',
    mentions: [],
  },
  {
    id: 'SYN-020',
    recordNumber: 20,
    sourceBrand: 'DHC',
    text: 'Giá DHC hơi cao, nhưng mình thấy đáng tiền vì dưỡng ẩm tốt.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Price',
        sentiment: 'Negative',
        evidence: 'Giá DHC hơi cao',
      },
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm tốt',
      },
    ],
  },
  {
    id: 'SYN-021',
    recordNumber: 21,
    sourceBrand: 'Vaseline',
    text: 'Vaseline dưỡng ẩm ổn.\nNhưng mùi hơi nồng.',
    context: 'Mình mua hộp xanh, dùng được hai tuần.',
    relevance: 'relevant',
    mentions: [
      {
        target: 'Vaseline',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: 'dưỡng ẩm ổn',
      },
      {
        target: 'Vaseline',
        aspect: 'Scent',
        sentiment: 'Negative',
        evidence: 'mùi hơi nồng',
      },
    ],
  },
  {
    id: 'SYN-023',
    recordNumber: 23,
    sourceBrand: 'DHC',
    text:
      'Đợt rồi mình mua hộp DHC loại nhỏ để dùng thử. Thỏi son mịn, lên môi ' +
      'không bị vón và không dính tóc, buổi sáng thoa một lớp là đủ ẩm tới ' +
      'trưa. Mùi hương nhẹ, không gắt, nhưng mình thấy nắp hộp hơi lỏng, để ' +
      'trong túi xách thì dễ bật ra.',
    context: 'Review synthetic viết thêm cho prototype, không lấy từ ViLipBTA.',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Texture',
        sentiment: 'Positive',
        evidence: 'Thỏi son mịn, lên môi không bị vón',
      },
      {
        target: 'DHC',
        aspect: 'Scent',
        sentiment: 'Positive',
        evidence: 'Mùi hương nhẹ, không gắt',
      },
      {
        target: 'DHC',
        aspect: 'Packaging',
        sentiment: 'Negative',
        evidence: 'nắp hộp hơi lỏng',
      },
    ],
  },
  {
    id: 'SYN-022',
    recordNumber: 22,
    sourceBrand: 'DHC',
    text: 'Mình gọi DHC là "cứu tinh" cho môi khô, nhưng hộp hơi khó mở.',
    context: '',
    relevance: 'relevant',
    mentions: [
      {
        target: 'DHC',
        aspect: 'Benefits',
        sentiment: 'Positive',
        evidence: '"cứu tinh" cho môi khô',
      },
      {
        target: 'DHC',
        aspect: 'Packaging',
        sentiment: 'Negative',
        evidence: 'hộp hơi khó mở',
      },
    ],
  },
]

export type DesignState =
  | 'running'
  | 'completed'
  | 'partial'
  | 'error'
  | 'empty'

export const DESIGN_STATES: { id: DesignState; label: string }[] = [
  { id: 'running', label: 'Đang xử lý' },
  { id: 'completed', label: 'Hoàn tất' },
  { id: 'partial', label: 'Một phần' },
  { id: 'error', label: 'Lỗi' },
  { id: 'empty', label: 'Không có kết quả' },
]

/**
 * Trạng thái "Một phần" mô phỏng một lô chưa xử lý xong. Các review này bị loại
 * khỏi chart/explorer nên mẫu số của Vaseline cho Giá và Hiệu quả dưỡng bằng 0
 * — dùng để duyệt cách hiển thị "Không đủ dữ liệu".
 */
export const PARTIAL_PENDING_IDS = ['SYN-004', 'SYN-009', 'SYN-014', 'SYN-021']

/** Số review đã xử lý ở trạng thái "Đang xử lý" (mẫu tĩnh, không có timer). */
export const RUNNING_PROCESSED_COUNT = 8

/** Trạng thái lỗi mô phỏng tác vụ dừng sau 18 review và không ghi kết quả. */
export const ERROR_PROCESSED_COUNT = 18

export type Scope = {
  aspect: Aspect | 'all'
  sentiment: Sentiment | 'all'
}

export type ScenarioId = 'compare' | 'negative-benefits' | 'evidence'

export type Scenario = {
  id: ScenarioId
  buttonLabel: string
  question: string
  scope: Scope
  /** Review đã dùng cho câu trả lời; phải nằm trong scope. */
  sampleIds: string[]
  note: string
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  compare: {
    id: 'compare',
    buttonLabel: 'So sánh giá và hiệu quả dưỡng',
    question: 'So sánh DHC và Vaseline về giá và hiệu quả dưỡng.',
    scope: { aspect: 'all', sentiment: 'all' },
    sampleIds: ['SYN-001', 'SYN-002', 'SYN-009', 'SYN-014', 'SYN-020'],
    note: 'Câu trả lời mẫu được viết từ đúng 5 review này, không phải kết luận cho toàn bộ thị trường.',
  },
  'negative-benefits': {
    id: 'negative-benefits',
    buttonLabel: 'Chỉ xem tiêu cực về hiệu quả dưỡng',
    question: 'Chỉ xem các nhận xét tiêu cực về hiệu quả dưỡng.',
    scope: { aspect: 'Benefits', sentiment: 'Negative' },
    sampleIds: ['SYN-014'],
    note: 'Bộ lọc chỉ thu hẹp danh sách review; mẫu số của biểu đồ vẫn là toàn bộ review nhắc khía cạnh đó.',
  },
  evidence: {
    id: 'evidence',
    buttonLabel: 'Đọc review làm căn cứ',
    question: 'Cho tôi đọc những review làm căn cứ cho câu trả lời đó.',
    scope: { aspect: 'all', sentiment: 'all' },
    sampleIds: ['SYN-001', 'SYN-002', 'SYN-009', 'SYN-014', 'SYN-020'],
    note: 'Mỗi citation mở đúng một review; phần tô sáng là câu trích đã dùng.',
  },
}

export const SCENARIO_ORDER: ScenarioId[] = [
  'compare',
  'negative-benefits',
  'evidence',
]
