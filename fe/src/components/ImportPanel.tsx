import { useRef, useState, type ChangeEvent } from 'react'

import {
  ApiError,
  createAnalysis,
  errorMessage,
  previewImport,
  type AnalysisCreated,
  type ColumnMapping,
  type PreviewLimits,
  type PreviewResponse,
  type RecordIssue,
  type SourceIdWarning,
} from '../api'
import {
  DEFAULT_LIMITS,
  DEFAULT_MAPPING,
  brandScopeMessage,
  formatBytes,
  mappingIsReady,
  previewKey,
  saveReady,
  toMapping,
  type BrandPair,
  type MappingDraft,
  type PreviewCheck,
} from '../importLogic'

const MAX_ISSUES_SHOWN = 20

type Props = {
  onImported: (analysis: AnalysisCreated) => void
  onOpenPreview: () => void
}

function IssueList({
  title,
  issues,
  emptyHint,
}: {
  title: string
  issues: RecordIssue[]
  emptyHint?: string
}) {
  if (issues.length === 0) {
    return emptyHint ? <p className="fineprint">{emptyHint}</p> : null
  }
  return (
    <div className="issues">
      <h3 className="issues__title">{title}</h3>
      <ul className="issues__list">
        {issues.slice(0, MAX_ISSUES_SHOWN).map((issue, index) => (
          <li key={`${issue.record_number}-${issue.code}-${index}`}>
            <span className="issues__where">Bản ghi #{issue.record_number}</span>
            {issue.field ? <span className="issues__field">cột {issue.field}</span> : null}
            <span className="issues__message">{issue.message}</span>
          </li>
        ))}
      </ul>
      {issues.length > MAX_ISSUES_SHOWN ? (
        <p className="fineprint">
          Còn {issues.length - MAX_ISSUES_SHOWN} lỗi khác chưa hiển thị.
        </p>
      ) : null}
    </div>
  )
}

function WarningList({ warnings }: { warnings: SourceIdWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="issues issues--warn">
      <h3 className="issues__title">Cảnh báo ID nguồn trùng</h3>
      <ul className="issues__list">
        {warnings.slice(0, MAX_ISSUES_SHOWN).map((warning) => (
          <li key={warning.source_id}>
            <span className="issues__where">ID {warning.source_id}</span>
            <span className="issues__message">{warning.message}</span>
          </li>
        ))}
      </ul>
      <p className="fineprint">
        Các bản ghi vẫn được giữ riêng; cảnh báo này không có nghĩa là review bị trùng.
      </p>
    </div>
  )
}

export default function ImportPanel({ onImported, onOpenPreview }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [mapping, setMapping] = useState<MappingDraft>(DEFAULT_MAPPING)
  const [brands, setBrands] = useState<BrandPair>(['', ''])
  const [check, setCheck] = useState<PreviewCheck | null>(null)
  const [shownPreview, setShownPreview] = useState<PreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<ApiError | string | null>(null)
  const [saveError, setSaveError] = useState<ApiError | string | null>(null)
  const [limits, setLimits] = useState<PreviewLimits>(DEFAULT_LIMITS)
  const [knownColumns, setKnownColumns] = useState<string[]>([])
  const [sourceBrands, setSourceBrands] = useState<string[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sizeProblem, setSizeProblem] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewToken = useRef(0)

  const mapped = toMapping(mapping)
  const currentKey = file ? previewKey(file, mapped, brands) : ''
  const preview = shownPreview
  const canSave =
    !isSaving && !isPreviewing && saveReady(check, currentKey) && file !== null
  const scopeMessage = preview ? brandScopeMessage(preview.source_brands) : null

  /**
   * Preview cũ mất hiệu lực ngay. Đổi brand thì giữ khung kiểm tra để còn chọn
   * nốt thương hiệu thứ hai; đổi file/mapping thì bỏ luôn số liệu cũ.
   */
  function invalidatePreview(keepPreview = false) {
    previewToken.current += 1
    setIsPreviewing(false)
    setCheck(null)
    setPreviewError(null)
    setSaveError(null)
    if (!keepPreview) setShownPreview(null)
  }

  function resetFileState(nextFile: File | null) {
    setFile(nextFile)
    setBrands(['', ''])
    setSourceBrands([])
    setKnownColumns([])
    setLimits(DEFAULT_LIMITS)
    setSizeProblem(null)
    invalidatePreview()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    event.target.value = ''
    resetFileState(nextFile)
    if (nextFile && nextFile.size > limits.max_bytes) {
      setSizeProblem(
        `File ${formatBytes(nextFile.size)} vượt giới hạn ${formatBytes(limits.max_bytes)}. Hãy chia nhỏ file trước khi kiểm tra.`,
      )
    }
  }

  function updateMapping(field: keyof MappingDraft, value: string) {
    invalidatePreview()
    setMapping((previous) => ({ ...previous, [field]: value }))
  }

  async function runPreview(
    targetFile: File,
    targetMapping: ColumnMapping,
    targetBrands: BrandPair | null,
  ) {
    const token = previewToken.current + 1
    previewToken.current = token
    setIsPreviewing(true)
    setPreviewError(null)
    setSaveError(null)

    try {
      let result: PreviewResponse = await previewImport(
        targetFile,
        targetMapping,
        targetBrands,
      )
      if (token !== previewToken.current) return

      let confirmed: BrandPair | null = targetBrands
      if (!confirmed && result.source_brands.length === 2) {
        confirmed = [result.source_brands[0], result.source_brands[1]]
        setBrands(confirmed)
        const withScope = await previewImport(targetFile, targetMapping, confirmed)
        if (token !== previewToken.current) return
        result = withScope
      }

      setKnownColumns(result.header)
      setSourceBrands(result.source_brands)
      setLimits(result.limits)
      setShownPreview(result)
      setCheck({
        key: previewKey(targetFile, targetMapping, confirmed ?? ['', '']),
        preview: result,
        brands: confirmed,
      })
      setIsPreviewing(false)
    } catch (error) {
      if (token !== previewToken.current) return
      setIsPreviewing(false)
      setCheck(null)
      setShownPreview(null)
      setPreviewError(
        error instanceof ApiError
          ? error
          : errorMessage(error, 'Không kiểm tra được file. Thử lại.'),
      )
    }
  }

  function handleBrandChange(slot: 0 | 1, value: string) {
    if (!file) return
    const next: BrandPair = slot === 0 ? [value, brands[1]] : [brands[0], value]
    setBrands(next)
    invalidatePreview(true)
    if (next[0] && next[1] && next[0] !== next[1]) {
      void runPreview(file, mapped, next)
    }
  }

  async function handleSave() {
    if (!file || !check || !check.brands || !canSave) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const created = await createAnalysis(file, mapped, check.brands)
      setIsSaving(false)
      onImported(created)
    } catch (error) {
      setIsSaving(false)
      setSaveError(
        error instanceof ApiError
          ? error
          : errorMessage(error, 'Không lưu được dữ liệu. Thử lại.'),
      )
    }
  }

  const fileLabel = file ? `${file.name} · ${formatBytes(file.size)}` : ''
  const canPreview = Boolean(file) && mappingIsReady(mapping) && !sizeProblem

  return (
    <div className="entrance">
      <div className="entrance__head">
        <p className="eyebrow">Bước 1 · Nhập dữ liệu</p>
        <h1 id="import-heading" tabIndex={-1}>
          Dữ liệu review
        </h1>
        <p className="lead">
          Tải một file CSV review son dưỡng của đúng hai thương hiệu. Hệ thống kiểm
          tra cột, số bản ghi và lỗi trước khi lưu; bước phân tích AI chưa chạy.
        </p>
        <div className="preview-entry">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onOpenPreview}
          >
            Xem trước giao diện
          </button>
          <p className="fineprint">
            Workspace mẫu với review minh họa; không cần API và không ghi dữ liệu.
          </p>
        </div>
      </div>

      <section className="card" aria-labelledby="file-heading">
        <div className="card__head">
          <h2 id="file-heading">1. Chọn file CSV</h2>
        </div>
        <div className="card__body">
          <p className="limits">
            1 file · tối đa {formatBytes(limits.max_bytes)} ·{' '}
            {limits.max_records} bản ghi · UTF-8, dấu phẩy
          </p>

          <div className="file-row">
            <input
              ref={fileInputRef}
              className="visually-hidden"
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className={file ? 'btn btn--secondary' : 'btn btn--primary'}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? 'Đổi file' : 'Chọn file CSV'}
            </button>
            <p className="file-row__name" aria-live="polite">
              {fileLabel || 'Chưa chọn file nào.'}
            </p>
          </div>

          {sizeProblem ? (
            <p className="alert alert--error" role="alert">
              {sizeProblem}
            </p>
          ) : (
            <p className="fineprint">
              Cần cột nội dung review và cột thương hiệu nguồn. File chỉ có một
              hoặc nhiều hơn hai thương hiệu sẽ bị từ chối.
            </p>
          )}

          <div className="sample">
            <p className="sample__label">Định dạng tối thiểu</p>
            <pre>
              <code>review_id,brand,text,context</code>
            </pre>
            <p className="fineprint">
              ID và ngữ cảnh không bắt buộc. Không có số liệu phân tích mẫu.
            </p>
          </div>
        </div>
      </section>

      {file ? (
      <section className="card" aria-labelledby="mapping-heading">
        <div className="card__head">
          <h2 id="mapping-heading">2. Ghép cột</h2>
        </div>
        <div className="card__body">
          <p className="fineprint">
            Nhập tên cột đúng như hàng tiêu đề CSV. Sau lần kiểm tra đầu tiên, ô
            nhập sẽ gợi ý các cột có trong file.
          </p>

          <datalist id="csv-columns">
            {knownColumns.map((column) => (
              <option key={column} value={column} />
            ))}
          </datalist>

          <div className="fields">
            <div className="field">
              <label className="field__label" htmlFor="map-text">
                Nội dung review
              </label>
              <input
                id="map-text"
                type="text"
                value={mapping.text}
                list="csv-columns"
                autoComplete="off"
                disabled={!file}
                placeholder="text"
                aria-describedby="map-text-hint"
                onChange={(event) => updateMapping('text', event.target.value)}
              />
              <p className="field__hint" id="map-text-hint">
                Bắt buộc
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="map-brand">
                Thương hiệu nguồn
              </label>
              <input
                id="map-brand"
                type="text"
                value={mapping.brand}
                list="csv-columns"
                autoComplete="off"
                disabled={!file}
                placeholder="brand"
                aria-describedby="map-brand-hint"
                onChange={(event) => updateMapping('brand', event.target.value)}
              />
              <p className="field__hint" id="map-brand-hint">
                Bắt buộc
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="map-context">
                Ngữ cảnh
              </label>
              <input
                id="map-context"
                type="text"
                value={mapping.context}
                list="csv-columns"
                autoComplete="off"
                disabled={!file}
                placeholder="context"
                aria-describedby="map-context-hint"
                onChange={(event) => updateMapping('context', event.target.value)}
              />
              <p className="field__hint" id="map-context-hint">
                Tùy chọn
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="map-source-id">
                ID nguồn
              </label>
              <input
                id="map-source-id"
                type="text"
                value={mapping.sourceId}
                list="csv-columns"
                autoComplete="off"
                disabled={!file}
                placeholder="review_id"
                aria-describedby="map-source-id-hint"
                onChange={(event) => updateMapping('sourceId', event.target.value)}
              />
              <p className="field__hint" id="map-source-id-hint">
                Tùy chọn, dùng để truy lại nguồn
              </p>
            </div>
          </div>

          {knownColumns.length > 0 ? (
            <p className="fineprint">Cột có trong file: {knownColumns.join(', ')}.</p>
          ) : null}

          <div className="actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canPreview || isPreviewing || isSaving}
              onClick={() => {
                if (!file) return
                const pair: BrandPair | null =
                  brands[0] && brands[1] ? [brands[0], brands[1]] : null
                void runPreview(file, mapped, pair)
              }}
            >
              {isPreviewing ? 'Đang kiểm tra…' : 'Kiểm tra dữ liệu'}
            </button>
            <p className="fineprint">
              Kiểm tra chỉ đọc file, chưa ghi vào cơ sở dữ liệu.
            </p>
          </div>
        </div>
      </section>
      ) : null}

      {isPreviewing ? (
        <p className="state" role="status">
          Đang kiểm tra dữ liệu…
        </p>
      ) : null}

      {previewError ? (
        <div className="alert alert--error" role="alert">
          <p>
            {previewError instanceof ApiError
              ? previewError.message
              : previewError}
          </p>
          <IssueList
            title="Bản ghi lỗi"
            issues={previewError instanceof ApiError ? previewError.recordIssues : []}
          />
        </div>
      ) : null}

      {preview ? (
        <section className="card" aria-labelledby="check-heading">
          <div className="card__head">
            <h2 id="check-heading">3. Kiểm tra và xác nhận</h2>
            <p className="card__meta">{preview.filename}</p>
          </div>
          <div className="card__body">
            {isPreviewing ? (
              <p className="state--inline" role="status">
                Đang kiểm tra lại với hai thương hiệu đã chọn…
              </p>
            ) : null}

            <div className="stats">
              <div className="stat">
                <p className="stat__value">{preview.total_records}</p>
                <p className="stat__label">Bản ghi trong file</p>
              </div>
              <div className="stat">
                <p className="stat__value">{preview.valid_records}</p>
                <p className="stat__label">Bản ghi hợp lệ</p>
              </div>
              <div className="stat">
                <p className="stat__value">{preview.error_records}</p>
                <p className="stat__label">Bản ghi lỗi</p>
              </div>
              <div className="stat">
                <p className="stat__value">{preview.warnings.length}</p>
                <p className="stat__label">Cảnh báo ID trùng</p>
              </div>
            </div>

            {preview.error_records > 0 ? (
              <p className="alert alert--error" role="alert">
                Còn {preview.error_records} bản ghi lỗi nên chưa thể lưu. P1 nhập
                toàn bộ file hoặc không nhập gì; sửa CSV rồi kiểm tra lại, không
                tự bỏ các dòng lỗi.
              </p>
            ) : (
              <p className="alert alert--ok" role="status">
                File không còn bản ghi lỗi. Chọn đúng hai thương hiệu rồi lưu.
              </p>
            )}

            <IssueList
              title="Chi tiết lỗi"
              issues={preview.errors}
              emptyHint="Không có lỗi bản ghi."
            />
            <WarningList warnings={preview.warnings} />

            <fieldset className="brands">
              <legend>Hai thương hiệu để so sánh</legend>
              <p className="fineprint">
                Giá trị giữ nguyên như trong file, kể cả chữ hoa và thường. Đổi
                lựa chọn sẽ kiểm tra lại toàn bộ dữ liệu.
              </p>
              <div className="brands__grid">
                <div className="field">
                  <label className="field__label" htmlFor="brand-a">
                    Thương hiệu A
                  </label>
                  <select
                    id="brand-a"
                    value={brands[0]}
                    disabled={isPreviewing || isSaving}
                    onChange={(event) => handleBrandChange(0, event.target.value)}
                  >
                    <option value="">Chọn thương hiệu</option>
                    {sourceBrands.map((brand) => (
                      <option key={brand} value={brand} disabled={brand === brands[1]}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="brand-b">
                    Thương hiệu B
                  </label>
                  <select
                    id="brand-b"
                    value={brands[1]}
                    disabled={isPreviewing || isSaving}
                    onChange={(event) => handleBrandChange(1, event.target.value)}
                  >
                    <option value="">Chọn thương hiệu</option>
                    {sourceBrands.map((brand) => (
                      <option key={brand} value={brand} disabled={brand === brands[0]}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {scopeMessage ? (
                <p className="alert alert--warn">{scopeMessage}</p>
              ) : null}
            </fieldset>

            <div className="table-wrap" tabIndex={0} role="region" aria-label="Bản ghi xem trước">
              <table className="preview-table">
                <caption className="visually-hidden">
                  Tối đa 10 bản ghi đầu tiên do backend trả về
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Bản ghi</th>
                    <th scope="col">Thương hiệu nguồn</th>
                    <th scope="col">Nội dung</th>
                    <th scope="col">Ngữ cảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((record) => (
                    <tr key={record.record_number}>
                      <td>#{record.record_number}</td>
                      <td>{record.source_brand}</td>
                      <td className="preview-table__text">{record.text}</td>
                      <td className="preview-table__text">
                        {record.context || <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fineprint table-hint">
              Bảng rộng hơn màn hình: cuộn ngang trong khung hoặc focus vào bảng
              rồi dùng phím mũi tên.
            </p>
            <p className="fineprint">
              Xem trước {preview.preview.length}/{preview.total_records} bản ghi.
              Số bản ghi nguồn là số dòng dữ liệu, không phải số khách hàng.
            </p>

            {saveError ? (
              <div className="alert alert--error" role="alert">
                <p>
                  {saveError instanceof ApiError ? saveError.message : saveError}
                </p>
                {saveError instanceof ApiError &&
                saveError.code === 'network_error' ? (
                  <p className="fineprint">
                    Chưa xác nhận được kết quả lưu và hệ thống không tự gửi lại.
                    Kiểm tra API rồi bấm lưu lần nữa nếu cần.
                  </p>
                ) : null}
                <IssueList
                  title="Bản ghi lỗi"
                  issues={
                    saveError instanceof ApiError ? saveError.recordIssues : []
                  }
                />
              </div>
            ) : null}

            <div className="actions actions--split">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canSave}
                onClick={() => void handleSave()}
              >
                {isSaving ? 'Đang lưu…' : 'Lưu dữ liệu'}
              </button>
              {!canSave ? (
                <p className="fineprint">
                  {isPreviewing
                    ? 'Đang kiểm tra lại dữ liệu.'
                    : 'Lưu chỉ mở sau khi kiểm tra xong, không còn bản ghi lỗi và đã chọn đủ hai thương hiệu.'}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
