import { useEffect, useMemo, useRef, useState } from 'react'

import PrototypeChart, { type ChartSelection } from './prototype/Chart'
import {
  ASPECT_LABELS,
  DEMO_REVIEWS,
  DESIGN_STATES,
  ERROR_PROCESSED_COUNT,
  PARTIAL_PENDING_IDS,
  PROTOTYPE_BRANDS,
  RUNNING_PROCESSED_COUNT,
  SCENARIOS,
  SCENARIO_ORDER,
  SENTIMENT_LABELS,
  type Aspect,
  type BrandKey,
  type DesignState,
  type ScenarioId,
  type Sentiment,
} from './prototype/data'
import {
  buildComparison,
  coverage,
  describeScenario,
  highlightSegments,
  scenarioScopeCount,
  selectReviews,
  type MatchedReview,
  type ReviewFilter,
} from './prototype/logic'
import './prototype.css'

type Props = {
  onExit: () => void
  ignoredAnalysis: boolean
}

const ASPECT_OPTIONS = (Object.keys(ASPECT_LABELS) as Aspect[]).filter(
  (aspect) =>
    aspect !== 'Ingredients' &&
    DEMO_REVIEWS.some((review) =>
      review.mentions.some(
        (mention) => mention.target !== 'other' && mention.aspect === aspect,
      ),
    ),
)

function HighlightedText({
  text,
  mentions,
  clamped,
}: {
  text: string
  mentions: { evidence: string }[]
  clamped: boolean
}) {
  const segments = highlightSegments(
    text,
    mentions.map((mention) => mention.evidence),
  )
  return (
    <p
      className={
        clamped ? 'demo-review__text demo-review__text--clamp' : 'demo-review__text'
      }
    >
      {segments.map((segment, index) =>
        segment.mark ? (
          <mark key={index}>{segment.text}</mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  )
}

function DemoReviewCard({
  item,
  focused,
}: {
  item: MatchedReview
  focused: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { review, mentions } = item
  const clampable =
    review.text.length > 220 || review.text.split('\n').length > 2

  return (
    <li className="proto-reviews__item">
      <article
        id={`demo-review-${review.id}`}
        tabIndex={-1}
        className={focused ? 'demo-review is-focused' : 'demo-review'}
        aria-label={`Review ${review.id}, thương hiệu nguồn ${review.sourceBrand}, bản ghi ${review.recordNumber}`}
      >
        <div className="demo-review__meta">
          <span
            className={
              review.sourceBrand === 'DHC' ? 'chip chip--a' : 'chip chip--b'
            }
          >
            {review.sourceBrand}
          </span>
          <span className="demo-review__number">
            Bản ghi #{review.recordNumber}
          </span>
          <code>{review.id}</code>
          {review.relevance === 'off_topic' ? (
            <span className="chip chip--pending">Lạc đề</span>
          ) : null}
          {review.relevance === 'needs_review' ? (
            <span className="chip chip--pending">Chưa rõ target</span>
          ) : null}
        </div>

        <HighlightedText
          text={review.text}
          mentions={mentions}
          clamped={clampable && !expanded}
        />
        {clampable ? (
          <button
            type="button"
            className="link-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Thu gọn' : 'Xem đầy đủ'}
          </button>
        ) : null}

        {review.context ? (
          <div className="demo-review__context">
            <p className="demo-review__context-label">Ngữ cảnh</p>
            <p>{review.context}</p>
          </div>
        ) : null}

        <ul className="mention-list" aria-label="Nhãn của review này">
          {mentions.map((mention, index) => (
            <li key={`${mention.aspect}-${mention.sentiment}-${index}`}>
              <span
                className={`chip chip--sentiment chip--sentiment--${mention.sentiment.toLowerCase()}`}
              >
                {SENTIMENT_LABELS[mention.sentiment]}
              </span>
              <span className="mention-list__aspect">
                {ASPECT_LABELS[mention.aspect]}
              </span>
              <span className="mention-list__target">
                {mention.target === 'other'
                  ? 'nhắc thương hiệu ngoài cặp chọn'
                  : `nhắc ${mention.target}`}
              </span>
              <q className="mention-list__evidence">{mention.evidence}</q>
            </li>
          ))}
        </ul>
      </article>
    </li>
  )
}

export default function PrototypeWorkspace({ onExit, ignoredAnalysis }: Props) {
  const [designState, setDesignState] = useState<DesignState>('completed')
  const [aspectFilter, setAspectFilter] = useState<Aspect | 'all'>('all')
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | 'all'>('all')
  const [bar, setBar] = useState<ChartSelection | null>(null)
  const [scenarioId, setScenarioId] = useState<ScenarioId>('compare')
  const [focused, setFocused] = useState<{ id: string; nonce: number } | null>(
    null,
  )
  const focusSeq = useRef(0)

  const processedIds = useMemo(() => {
    if (designState === 'running') {
      return new Set(
        DEMO_REVIEWS.slice(0, RUNNING_PROCESSED_COUNT).map((review) => review.id),
      )
    }
    if (designState === 'partial') {
      return new Set(
        DEMO_REVIEWS.filter(
          (review) => !PARTIAL_PENDING_IDS.includes(review.id),
        ).map((review) => review.id),
      )
    }
    if (designState === 'error') {
      return new Set(
        DEMO_REVIEWS.slice(0, ERROR_PROCESSED_COUNT).map((review) => review.id),
      )
    }
    if (designState === 'empty') {
      return new Set<string>()
    }
    return new Set(DEMO_REVIEWS.map((review) => review.id))
  }, [designState])

  const processed = useMemo(
    () => DEMO_REVIEWS.filter((review) => processedIds.has(review.id)),
    [processedIds],
  )
  const comparison = useMemo(() => buildComparison(processed), [processed])
  const dataCoverage = useMemo(
    () => coverage(DEMO_REVIEWS, processedIds),
    [processedIds],
  )

  const visible = useMemo(() => {
    const filter: ReviewFilter = bar
      ? { brand: bar.brand, aspect: bar.aspect, sentiment: 'all' }
      : { aspect: aspectFilter, sentiment: sentimentFilter }
    return selectReviews(processed, filter)
  }, [processed, bar, aspectFilter, sentimentFilter])

  const selectedCell = bar
    ? comparison.find(
        (cell) => cell.brand === bar.brand && cell.aspect === bar.aspect,
      )
    : undefined

  const scenario = SCENARIOS[scenarioId]
  const scenarioSample = useMemo(
    () =>
      DEMO_REVIEWS.filter(
        (review) =>
          scenario.sampleIds.includes(review.id) && processedIds.has(review.id),
      ),
    [scenario, processedIds],
  )
  const scenarioTotal = useMemo(
    () => scenarioScopeCount(processed, scenario.scope),
    [processed, scenario],
  )
  const answer = describeScenario(scenarioId, scenarioSample)

  const insufficient = comparison.filter((cell) => cell.total === 0)

  useEffect(() => {
    if (!focused) return
    const element = document.getElementById(`demo-review-${focused.id}`)
    if (!element) return
    element.scrollIntoView({ block: 'center', behavior: 'auto' })
    element.focus({ preventScroll: true })
  }, [focused, visible])

  function resetScope() {
    setBar(null)
    setAspectFilter('all')
    setSentimentFilter('all')
    setFocused(null)
  }

  function chooseState(next: DesignState) {
    setDesignState(next)
    resetScope()
    setScenarioId('compare')
  }

  function selectBar(aspect: Aspect, brand: BrandKey) {
    const isSame = bar?.aspect === aspect && bar?.brand === brand
    if (isSame) {
      resetScope()
      return
    }
    setBar({ aspect, brand })
    setAspectFilter('all')
    setSentimentFilter('all')
    setFocused(null)
    window.requestAnimationFrame(() => {
      document.getElementById('proto-explorer-heading')?.focus()
    })
  }

  function activateScenario(id: ScenarioId) {
    const next = SCENARIOS[id]
    setScenarioId(id)
    setBar(null)
    setAspectFilter(next.scope.aspect)
    setSentimentFilter(next.scope.sentiment)
    setFocused(null)
  }

  function openCitation(id: string) {
    setBar(null)
    setAspectFilter(scenario.scope.aspect)
    setSentimentFilter(scenario.scope.sentiment)
    focusSeq.current += 1
    setFocused({ id, nonce: focusSeq.current })
  }

  const scopeParts: string[] = []
  if (bar) {
    scopeParts.push(bar.brand, ASPECT_LABELS[bar.aspect])
  } else {
    if (aspectFilter !== 'all') scopeParts.push(ASPECT_LABELS[aspectFilter])
    if (sentimentFilter !== 'all') {
      scopeParts.push(SENTIMENT_LABELS[sentimentFilter])
    }
  }
  const scopeText =
    scopeParts.length > 0 ? scopeParts.join(' · ') : 'Tất cả review có nhãn'

  const brandOrder = PROTOTYPE_BRANDS
  const showToolbar = designState !== 'running' && designState !== 'error'
  const showChart = designState !== 'running' && designState !== 'error'

  return (
    <div className="proto">
      <a className="skip-link" href="#proto-main">
        Bỏ qua tới nội dung
      </a>
      <header className="proto-header">
        <div className="proto-header__inner">
          <div className="proto-brand">
            <span className="proto-brand__name">Review Intelligence</span>
            <span className="chip chip--pending">Bản xem trước</span>
          </div>
          <p className="proto-header__scope">
            {brandOrder.join(' và ')} · {DEMO_REVIEWS.length} review minh họa
          </p>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={onExit}
          >
            Thoát xem trước
          </button>
        </div>
        <p className="proto-banner">
          <strong>Bản xem trước</strong>
          <span aria-hidden="true"> · </span>
          Dữ liệu minh họa
          <span aria-hidden="true"> · </span>
          Không chạy AI
          <span aria-hidden="true"> · </span>
          Không ghi vào DB
          {ignoredAnalysis ? (
            <>
              <span aria-hidden="true"> · </span>
              Đã bỏ qua tham số analysis trong URL
            </>
          ) : null}
        </p>
      </header>

      <main className="proto-page" id="proto-main" tabIndex={-1}>
        <div className="proto-layout">
          <aside className="proto-side" aria-label="Dữ liệu và trạng thái thiết kế">
            <section className="card">
              <div className="card__head">
                <h2>Dữ liệu minh họa</h2>
              </div>
              <div className="card__body">
                <p className="proto-side__file">
                  p0_synthetic_dhc_vs_vaseline_22.csv
                </p>
                <div className="brand-pair">
                  <span className="chip chip--a">DHC</span>
                  <span className="chip chip--b">Vaseline</span>
                </div>
                <dl className="coverage">
                  <div>
                    <dt>Tổng review</dt>
                    <dd>{dataCoverage.total}</dd>
                  </div>
                  <div>
                    <dt>Đã xử lý</dt>
                    <dd>{dataCoverage.processed}</dd>
                  </div>
                  <div>
                    <dt>Chưa xử lý</dt>
                    <dd>{dataCoverage.pending}</dd>
                  </div>
                  <div>
                    <dt>Lạc đề</dt>
                    <dd>{dataCoverage.offTopic}</dd>
                  </div>
                  <div>
                    <dt>Chưa rõ target</dt>
                    <dd>{dataCoverage.needsReview}</dd>
                  </div>
                  <div>
                    <dt>Nhắc brand ngoài cặp</dt>
                    <dd>{dataCoverage.outsidePair}</dd>
                  </div>
                </dl>
                <p className="fineprint">
                  Các nhóm không rời nhau hoàn toàn; không cộng dồn thành tổng.
                  Số review, không phải số khách hàng.
                </p>
              </div>
            </section>

            <fieldset className="card design-state" id="proto-design-state" tabIndex={-1}>
              <legend>Xem trạng thái thiết kế</legend>
              <div className="card__body">
                <p className="fineprint">
                  Chỉ đổi giao diện mẫu. Không chạy AI, không có timer và không
                  ghi dữ liệu.
                </p>
                <div className="design-state__options">
                  {DESIGN_STATES.map((state) => (
                    <label className="design-state__option" key={state.id}>
                      <input
                        type="radio"
                        name="design-state"
                        value={state.id}
                        checked={designState === state.id}
                        onChange={() => chooseState(state.id)}
                      />
                      <span>{state.label}</span>
                    </label>
                  ))}
                </div>
                <p className="fineprint">
                  Mô phỏng: phân tích {DEMO_REVIEWS.length} review · dữ liệu tĩnh
                </p>
              </div>
            </fieldset>
          </aside>

          <div className="proto-content">
            {showToolbar ? (
              <section className="proto-toolbar card" aria-label="Bộ lọc và phạm vi">
                <div className="proto-toolbar__controls">
                  <div className="field">
                    <label className="field__label" htmlFor="proto-aspect">
                      Khía cạnh
                    </label>
                    <select
                      id="proto-aspect"
                      value={bar ? bar.aspect : aspectFilter}
                      disabled={bar !== null}
                      onChange={(event) => {
                        setBar(null)
                        setAspectFilter(event.target.value as Aspect | 'all')
                        setFocused(null)
                      }}
                    >
                      <option value="all">Tất cả khía cạnh</option>
                      {ASPECT_OPTIONS.map((aspect) => (
                        <option key={aspect} value={aspect}>
                          {ASPECT_LABELS[aspect]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="proto-sentiment">
                      Mức độ cảm xúc
                    </label>
                    <select
                      id="proto-sentiment"
                      value={sentimentFilter}
                      disabled={bar !== null}
                      onChange={(event) => {
                        setBar(null)
                        setSentimentFilter(
                          event.target.value as Sentiment | 'all',
                        )
                        setFocused(null)
                      }}
                    >
                      <option value="all">Tất cả cảm xúc</option>
                      <option value="Positive">
                        {SENTIMENT_LABELS.Positive}
                      </option>
                      <option value="Neutral">{SENTIMENT_LABELS.Neutral}</option>
                      <option value="Negative">
                        {SENTIMENT_LABELS.Negative}
                      </option>
                    </select>
                  </div>
                  {bar || aspectFilter !== 'all' || sentimentFilter !== 'all' ? (
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={resetScope}
                    >
                      {bar ? 'Bỏ chọn cột' : 'Bỏ bộ lọc'}
                    </button>
                  ) : null}
                </div>
                <p className="proto-toolbar__scope" aria-live="polite">
                  <strong>Phạm vi review:</strong> {scopeText}
                  {` · ${visible.length} review khớp`}
                  {selectedCell
                    ? ` · ${selectedCell.negatives}/${selectedCell.total} review tiêu cực`
                    : ''}
                </p>
                {bar && selectedCell ? (
                  <p className="fineprint">
                    Cột đang chọn dùng toàn bộ{' '}
                    {selectedCell.total === 0
                      ? 'review'
                      : `${selectedCell.total} review nhắc khía cạnh`}{' '}
                    làm mẫu số. Đổi bộ lọc cảm xúc không làm thay đổi mẫu số
                    của biểu đồ.
                  </p>
                ) : null}
                <a className="proto-jump" href="#proto-design-state">
                  Xem trạng thái thiết kế
                </a>
              </section>
            ) : null}

            <div className="proto-board">
              <div className="proto-results">
                {designState === 'completed' ? (
                  <section className="card chat" aria-labelledby="proto-chat-heading">
                    <div className="card__head">
                      <h2 id="proto-chat-heading">Hội thoại mẫu</h2>
                      <p className="card__meta">
                        Chỉ hỗ trợ câu hỏi mẫu; prototype không hiểu ngôn ngữ tự do.
                      </p>
                    </div>
                    <div className="card__body">
                      <div className="bubble bubble--user">
                        <p className="bubble__label">Câu hỏi mẫu</p>
                        <p>{scenario.question}</p>
                      </div>
                      <div className="bubble bubble--assistant">
                        <p className="bubble__label">
                          Trả lời mẫu · dữ liệu minh họa
                        </p>
                        <p>{answer}</p>
                        <p className="fineprint">{scenario.note}</p>
                        <p className="fineprint">
                          Đã đọc {scenarioSample.length}/{scenarioTotal} review
                          có nhãn trong phạm vi. Số liệu trên biểu đồ tính trên
                          toàn bộ review đã xử lý, không chỉ mẫu này.
                        </p>
                        <ul className="citations" aria-label="Citation của câu trả lời">
                          {scenarioSample.map((review) => (
                            <li key={review.id}>
                              <button
                                type="button"
                                className="citation"
                                onClick={() => openCitation(review.id)}
                                aria-label={`Mở review ${review.id} trong danh sách`}
                              >
                                #{review.recordNumber} · {review.id}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div
                        className="suggestions"
                        role="group"
                        aria-label="Câu hỏi mẫu"
                      >
                        {SCENARIO_ORDER.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className="suggestion"
                            aria-pressed={scenarioId === id}
                            onClick={() => activateScenario(id)}
                          >
                            {SCENARIOS[id].buttonLabel}
                          </button>
                        ))}
                      </div>
                      <p className="fineprint">
                        Đổi biểu đồ hoặc bộ lọc chỉ thay đổi danh sách review;
                        câu trả lời mẫu giữ nguyên. Không có ô nhập tự do trong
                        prototype; chat thật thuộc P5.
                      </p>
                    </div>
                  </section>
                ) : null}

                {designState === 'running' ? (
                  <section className="card state-panel" aria-live="polite">
                    <div className="card__body">
                      <h2>Đang xử lý (mô phỏng)</h2>
                      <p>
                        Prototype chỉ duyệt bố cục tiến trình. Không có AI chạy
                        thật, không có timer tự tăng và không ghi kết quả.
                      </p>
                      <ol className="stepper">
                        <li>Đã nhận {DEMO_REVIEWS.length} review</li>
                        <li aria-current="step">
                          Đang xử lý {RUNNING_PROCESSED_COUNT}/
                          {DEMO_REVIEWS.length} review (mẫu tĩnh)
                        </li>
                        <li>Chưa có kết quả để hiển thị</li>
                      </ol>
                      <p className="fineprint">
                        Chọn “Hoàn tất” trong Xem trạng thái thiết kế để xem kết
                        quả đầy đủ.
                      </p>
                    </div>
                  </section>
                ) : null}

                {designState === 'error' ? (
                  <section
                    className="card state-panel state-panel--error"
                    role="alert"
                  >
                    <div className="card__body">
                      <h2>Không phân tích được analysis</h2>
                      <p>
                        Mô phỏng: tác vụ phân tích dừng ở review{' '}
                        {ERROR_PROCESSED_COUNT}/{DEMO_REVIEWS.length} và trả lỗi.
                        Không có mention nào được ghi vào analysis.
                      </p>
                      <ul className="state-panel__list">
                        <li>Phạm vi mô phỏng: 22 review, hai brand DHC và Vaseline.</li>
                        <li>Không tự retry, không chạy nền trong prototype.</li>
                      </ul>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => chooseState('partial')}
                        >
                          Xem kết quả một phần
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={onExit}
                        >
                          Về màn nhập
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {designState === 'empty' ? (
                  <section className="card state-panel">
                    <div className="card__body">
                      <h2>Không có kết quả</h2>
                      <p>
                        Mô phỏng analysis không trả về mention nào. Mẫu số bằng 0,
                        nên biểu đồ hiển thị “Không đủ dữ liệu” thay cho 0%.
                      </p>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => chooseState('completed')}
                        >
                          Xem trạng thái hoàn tất
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {designState === 'partial' ? (
                  <p className="alert alert--warn" role="status">
                    <strong>Kết quả một phần.</strong>{' '}
                    {dataCoverage.processed}/{dataCoverage.total} review đã xử
                    lý; {dataCoverage.pending} review chưa xử lý nên không có
                    trong biểu đồ và danh sách review.
                    {insufficient.length > 0
                      ? ` Chưa đủ dữ liệu cho: ${insufficient
                          .map(
                            (cell) =>
                              `${cell.brand} · ${ASPECT_LABELS[cell.aspect]}`,
                          )
                          .join(', ')}.`
                      : ''}
                  </p>
                ) : null}

                {showChart ? (
                  <div className="card">
                    <div className="card__body">
                      <PrototypeChart
                        comparison={comparison}
                        selected={bar}
                        onSelect={selectBar}
                      />
                    </div>
                  </div>
                ) : null}

                {designState === 'partial' ? (
                  <p className="fineprint">
                    Tóm tắt và citation chỉ bật khi analysis hoàn tất; phần này
                    đang mô phỏng kết quả một phần.
                  </p>
                ) : null}
              </div>

              <section
                className="card proto-explorer"
                aria-labelledby="proto-explorer-heading"
              >
                <div className="card__head card__head--row">
                  <div>
                    <h2 id="proto-explorer-heading" tabIndex={-1}>
                      Review đã chọn
                    </h2>
                    <p className="card__meta">
                      {scopeText} · {visible.length} review
                      {selectedCell
                        ? ` · ${selectedCell.negatives}/${selectedCell.total} tiêu cực`
                        : ''}
                    </p>
                  </div>
                  {bar ? (
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={resetScope}
                    >
                      Về tất cả kết quả
                    </button>
                  ) : null}
                </div>

                {designState === 'running' ? (
                  <p className="state">
                    Review sẽ hiện khi phân tích xong. Không có dữ liệu nào được
                    chọn trong trạng thái này.
                  </p>
                ) : null}

                {designState === 'error' ? (
                  <div className="card__body">
                    <div className="alert alert--error" role="alert">
                      <p>
                        Không có review nào được mở trong trạng thái lỗi. Chuyển
                        sang “Một phần” hoặc “Hoàn tất” để xem tiếp.
                      </p>
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        onClick={() => chooseState('partial')}
                      >
                        Xem kết quả một phần
                      </button>
                    </div>
                  </div>
                ) : null}

                {designState !== 'running' && designState !== 'error' ? (
                  <>
                    {visible.length === 0 ? (
                      <div className="card__body">
                        <div className="empty">
                          <p className="empty__title">
                            {designState === 'empty'
                              ? 'Chưa có review nào đã xử lý'
                              : 'Không có review khớp bộ lọc'}
                          </p>
                          <p>
                            {designState === 'empty'
                              ? 'Khi analysis không trả về kết quả, danh sách để trống thay vì hiện review không có nhãn.'
                              : 'Thử bỏ bộ lọc hoặc chọn khía cạnh/cảm xúc khác. Mẫu số bằng 0 vẫn hiển thị “Không đủ dữ liệu”, không phải 0%.'}
                          </p>
                          {designState === 'empty' ? (
                            <button
                              type="button"
                              className="btn btn--secondary btn--small"
                              onClick={() => chooseState('completed')}
                            >
                              Xem trạng thái hoàn tất
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--secondary btn--small"
                              onClick={resetScope}
                            >
                              Bỏ bộ lọc
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="proto-reviews"
                        tabIndex={0}
                        role="region"
                        aria-label="Danh sách review đã chọn"
                      >
                        <ol className="proto-reviews__list">
                          {visible.map((item) => (
                            <DemoReviewCard
                              key={item.review.id}
                              item={item}
                              focused={focused?.id === item.review.id}
                            />
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                ) : null}
              </section>
            </div>

            <p className="fineprint proto-footnote">
              Dữ liệu: {DEMO_REVIEWS.length} review synthetic và mention khai báo
              riêng cho prototype. Không phải benchmark, không phải kết luận thị
              trường. UI-P không gọi API AI/chart thật và không ghi analysis.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
