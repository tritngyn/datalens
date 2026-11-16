import { useEffect, useState } from 'react'

import './App.css'
import { ApiError, errorMessage, getAnalysis, type Analysis } from './api'
import ImportPanel from './components/ImportPanel'
import ReviewExplorer from './components/ReviewExplorer'
import PrototypeWorkspace from './PrototypeWorkspace'
import { formatDateTime } from './importLogic'

const ANALYSIS_PARAM = 'analysis'
const PREVIEW_PARAM = 'preview'

function readPreviewMode(): boolean {
  return (
    new URLSearchParams(window.location.search).get(PREVIEW_PARAM) === 'design'
  )
}

function readAnalysisId(): string | null {
  const value = new URLSearchParams(window.location.search).get(ANALYSIS_PARAM)
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function writeAnalysisId(analysisId: string | null) {
  const url = new URL(window.location.href)
  if (analysisId) {
    url.searchParams.set(ANALYSIS_PARAM, analysisId)
  } else {
    url.searchParams.delete(ANALYSIS_PARAM)
  }
  window.history.replaceState(null, '', url)
}

function focusById(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.focus()
  })
}

function analysisStatusLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Chưa phân tích'
    case 'queued':
      return 'Đang chờ phân tích'
    case 'running':
      return 'Đang phân tích'
    case 'completed':
      return 'Đã phân tích'
    case 'failed':
      return 'Phân tích lỗi'
    default:
      return status
  }
}

export default function App() {
  const [analysisId, setAnalysisId] = useState<string | null>(readAnalysisId)
  const [previewOpen, setPreviewOpen] = useState<boolean>(readPreviewMode)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [routeError, setRouteError] = useState<{
    message: string
    notFound: boolean
  } | null>(null)

  useEffect(() => {
    // Chế độ xem trước không gọi API: không đọc analysis, không upload.
    if (previewOpen || !analysisId || analysis) return
    let active = true
    getAnalysis(analysisId)
      .then((loaded) => {
        if (!active) return
        setAnalysis(loaded)
        setRouteError(null)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setRouteError({
          message: errorMessage(
            caught,
            'Không mở được phiên phân tích. Kiểm tra API rồi tải lại trang.',
          ),
          notFound: caught instanceof ApiError && caught.status === 404,
        })
      })
    return () => {
      active = false
    }
  }, [analysisId, analysis, previewOpen])

  function handleImported(created: Analysis) {
    writeAnalysisId(created.analysis_id)
    setAnalysisId(created.analysis_id)
    setAnalysis(created)
    setRouteError(null)
    focusById('results-heading')
  }

  function openPreview() {
    const url = new URL(window.location.href)
    url.searchParams.set(PREVIEW_PARAM, 'design')
    window.history.replaceState(null, '', url)
    setPreviewOpen(true)
  }

  function exitPreview() {
    const url = new URL(window.location.href)
    url.searchParams.delete(PREVIEW_PARAM)
    url.searchParams.delete(ANALYSIS_PARAM)
    window.history.replaceState(null, '', url)
    setPreviewOpen(false)
    setAnalysisId(null)
    setAnalysis(null)
    setRouteError(null)
    focusById('import-heading')
  }

  function startNewImport() {
    writeAnalysisId(null)
    setAnalysisId(null)
    setAnalysis(null)
    setRouteError(null)
    focusById('import-heading')
  }

  const showLoading = analysisId !== null && !analysis && !routeError

  if (previewOpen) {
    return (
      <PrototypeWorkspace
        onExit={exitPreview}
        ignoredAnalysis={analysisId !== null}
      />
    )
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Bỏ qua tới nội dung
      </a>

      <header className="topbar">
        <div className="topbar__inner">
          <div className="topbar__brand">
            <span className="topbar__name">Review Intelligence</span>
            <span className="topbar__sub">So sánh review son dưỡng</span>
          </div>

          {analysis ? (
            <>
              <p className="topbar__scope">
                {analysis.brands.join(' và ')}
                <span className="dot" aria-hidden="true">
                  ·
                </span>
                {analysis.imported_records} review đã lưu
              </p>
              <div className="topbar__status">
                <span className="chip chip--ok">Đã nhập dữ liệu</span>
                <span className="chip chip--pending">
                  {analysisStatusLabel(analysis.analysis_status)}
                </span>
              </div>
            </>
          ) : (
            <div className="topbar__status">
              <span className="chip chip--quiet">Chưa có dữ liệu</span>
            </div>
          )}
        </div>
      </header>

      <main className="page" id="main">
        {routeError ? (
          <div className="entrance">
            <div className="card">
              <div className="card__body">
                <h1 tabIndex={-1}>
                  {routeError.notFound
                    ? 'Không tìm thấy phiên phân tích'
                    : 'Không mở được phiên phân tích'}
                </h1>
                <p className="lead">{routeError.message}</p>
                {routeError.notFound ? (
                  <p className="fineprint">
                    Phiên có thể chưa được lưu hoặc mã trên đường dẫn không đúng.
                    Mở lại đường dẫn đã lưu, hoặc nhập dữ liệu mới.
                  </p>
                ) : null}
                <div className="actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={startNewImport}
                  >
                    Nhập file mới
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : showLoading ? (
          <p className="state" role="status">
            Đang mở phiên phân tích…
          </p>
        ) : analysis ? (
          <div className="workspace">
            <aside className="side" aria-labelledby="data-heading">
              <details className="card data-card" open>
                <summary className="data-card__summary">
                  <h2 id="data-heading">Dữ liệu</h2>
                </summary>
                <div className="data-card__body">
                  <p className="data-card__file" title={analysis.filename}>
                    {analysis.filename}
                  </p>

                  <dl className="facts">
                    <div className="fact">
                      <dt>Thương hiệu</dt>
                      <dd className="brand-pair">
                        <span className="chip chip--a">{analysis.brands[0]}</span>
                        <span className="chip chip--b">{analysis.brands[1]}</span>
                      </dd>
                    </div>
                    <div className="fact">
                      <dt>Review đã lưu</dt>
                      <dd>
                        {analysis.imported_records}
                        {analysis.imported_records !== analysis.total_records
                          ? ` / ${analysis.total_records} bản ghi`
                          : ''}
                      </dd>
                    </div>
                    <div className="fact">
                      <dt>ID nguồn trùng</dt>
                      <dd>
                        {analysis.duplicate_source_id_count > 0
                          ? `${analysis.duplicate_source_id_count} cảnh báo`
                          : 'Không có'}
                      </dd>
                    </div>
                    <div className="fact">
                      <dt>Nhập lúc</dt>
                      <dd>{formatDateTime(analysis.created_at)}</dd>
                    </div>
                    <div className="fact">
                      <dt>Mã phiên</dt>
                      <dd>
                        <code>{analysis.analysis_id}</code>
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="btn btn--secondary btn--block"
                    onClick={startNewImport}
                  >
                    Nhập file khác
                  </button>
                  <p className="fineprint">
                    Dữ liệu đã lưu vẫn giữ trên server; đổi dữ liệu chỉ mở phiên
                    mới.
                  </p>
                </div>
              </details>
            </aside>

            <div className="board">
              <section className="card" aria-labelledby="results-heading">
                <div className="card__head">
                  <h1 id="results-heading" tabIndex={-1}>
                    Kết quả phân tích
                  </h1>
                  <p className="card__meta">
                    {analysis.brands.join(' và ')} ·{' '}
                    {analysis.imported_records} review trong phạm vi
                  </p>
                </div>
                <div className="card__body">
                  <p className="scope">
                    <span className="scope__label">Phạm vi đang mở</span>
                    {analysis.filename} · {analysis.imported_records} review ·{' '}
                    {analysis.brands.join(' và ')}
                  </p>

                  <div className="empty">
                    <p className="empty__title">Chưa có kết quả phân tích</p>
                    <p>
                      Phiên này mới được lưu review. Phân tích AI, biểu đồ so sánh
                      và bằng chứng có nhãn chưa được nối vào giao diện, nên màn
                      hình không hiển thị số liệu ước lượng.
                    </p>
                    <p className="fineprint">
                      Khi backend có kết quả, bấm một nhóm trong biểu đồ sẽ mở đúng
                      tập review đã dùng để tính, kèm tử số và mẫu số.
                    </p>
                  </div>

                  <dl className="facts facts--grid">
                    <div className="fact">
                      <dt>Trạng thái</dt>
                      <dd>{analysisStatusLabel(analysis.analysis_status)}</dd>
                    </div>
                    <div className="fact">
                      <dt>Metric</dt>
                      <dd>Chưa có</dd>
                    </div>
                    <div className="fact">
                      <dt>Bằng chứng</dt>
                      <dd>Cột review bên cạnh</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <ReviewExplorer
                key={analysis.analysis_id}
                analysisId={analysis.analysis_id}
              />
            </div>
          </div>
        ) : (
          <ImportPanel onImported={handleImported} onOpenPreview={openPreview} />
        )}
      </main>
    </div>
  )
}
