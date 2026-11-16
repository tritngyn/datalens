import { useEffect, useState } from 'react'

import {
  errorMessage,
  listReviews,
  type ReviewItem,
  type ReviewPage,
} from '../api'
import { pageRange, totalPages } from '../importLogic'

const PAGE_SIZE = 20

function ReviewRow({ review }: { review: ReviewItem }) {
  const [expanded, setExpanded] = useState(false)
  const clampable =
    review.text.length > 220 || review.text.split('\n').length > 3
  const textId = `review-text-${review.review_id}`

  return (
    <li className="review">
      <div className="review__meta">
        <span className="chip chip--brand">{review.source_brand}</span>
        <span className="review__number">Bản ghi #{review.record_number}</span>
        {review.source_id ? (
          <span className="review__source">ID nguồn {review.source_id}</span>
        ) : null}
      </div>
      <p
        id={textId}
        className={
          clampable && !expanded
            ? 'review__text review__text--clamp'
            : 'review__text'
        }
      >
        {review.text}
      </p>
      {clampable ? (
        <button
          type="button"
          className="link-button"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Thu gọn' : 'Xem đầy đủ'}
        </button>
      ) : null}
      {review.context ? (
        <div className="review__context">
          <p className="review__context-label">Ngữ cảnh</p>
          <p className="review__context-text">{review.context}</p>
        </div>
      ) : null}
    </li>
  )
}

export default function ReviewExplorer({ analysisId }: { analysisId: string }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReviewPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listReviews(analysisId, page, PAGE_SIZE, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setData(null)
        setError(errorMessage(caught, 'Không tải được danh sách review.'))
      })
    return () => controller.abort()
  }, [analysisId, page, reloadToken])

  const loading = error === null && (data === null || data.page !== page)
  const pages = data ? totalPages(data.total, data.page_size) : 1
  const range = data ? pageRange(data.page, data.page_size, data.total) : null

  function goToPage(next: number) {
    setError(null)
    setPage(next)
  }

  return (
    <section className="card" aria-labelledby="reviews-heading" aria-busy={loading}>
      <div className="card__head card__head--row">
        <h2 id="reviews-heading">Review đã lưu</h2>
        {data ? <span className="card__meta">{data.total} bản ghi</span> : null}
      </div>

      <p className="reviews__note">
        Mỗi mục hiển thị thương hiệu nguồn của file, không phải thương hiệu được
        nhắc trong nội dung review.
      </p>

      {loading ? (
        <p className="state--inline" role="status">
          {data ? `Đang tải trang ${page}…` : 'Đang tải review…'}
        </p>
      ) : null}

      {error ? (
        <div className="card__body">
          <div className="alert alert--error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => {
                setError(null)
                setReloadToken((value) => value + 1)
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : null}

      {data && data.items.length === 0 ? (
        <p className="state">Chưa có review nào được lưu cho phiên này.</p>
      ) : null}

      {data && data.items.length > 0 ? (
        <div
          className="reviews__scroll"
          tabIndex={0}
          role="region"
          aria-label="Danh sách review đã lưu"
        >
          <ol className="reviews">
            {data.items.map((review) => (
              <ReviewRow key={review.review_id} review={review} />
            ))}
          </ol>
        </div>
      ) : null}

      {data && data.total > 0 && range ? (
        <div className="pager">
          <p className="pager__info">
            Bản ghi {range.from}–{range.to} trên {data.total} · Trang {data.page}/
            {pages}
          </p>
          <div className="pager__actions">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={loading || data.page <= 1}
              onClick={() => goToPage(data.page - 1)}
            >
              Trang trước
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={loading || data.page >= pages}
              onClick={() => goToPage(data.page + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
