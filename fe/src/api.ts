export type ColumnMapping = {
  text: string
  brand: string
  context?: string
  source_id?: string
}

export type RecordIssue = {
  record_number: number
  physical_line: number
  field: string | null
  code: string
  message: string
}

export type SourceIdWarning = {
  code: string
  source_id: string
  record_numbers: number[]
  message: string
}

export type PreviewLimits = {
  max_bytes: number
  max_records: number
  max_text_chars: number
  max_context_chars: number
}

export type PreviewRecord = {
  record_number: number
  physical_line: number
  source_id: string | null
  source_brand: string
  text: string
  context: string
  errors: RecordIssue[]
}

export type PreviewResponse = {
  filename: string
  input_hash: string
  header: string[]
  mapping: Record<string, string | null>
  total_records: number
  valid_records: number
  error_records: number
  preview: PreviewRecord[]
  errors: RecordIssue[]
  warnings: SourceIdWarning[]
  source_brands: string[]
  limits: PreviewLimits
}

export type Analysis = {
  analysis_id: string
  filename: string
  input_hash: string
  mapping: Record<string, string | null>
  brands: string[]
  import_status: string
  analysis_status: string
  total_records: number
  imported_records: number
  duplicate_source_id_count: number
  created_at: string
}

export type AnalysisCreated = Analysis & {
  warnings: SourceIdWarning[]
}

export type ReviewItem = {
  review_id: string
  source_id: string | null
  record_number: number
  source_brand: string
  text: string
  context: string
  created_at: string
}

export type ReviewPage = {
  analysis_id: string
  page: number
  page_size: number
  total: number
  items: ReviewItem[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get recordIssues(): RecordIssue[] {
    const value = this.details.errors
    return Array.isArray(value) ? (value as RecordIssue[]) : []
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function networkError(): ApiError {
  return new ApiError(
    0,
    'network_error',
    'Không kết nối được API. Kiểm tra backend đang chạy ở 127.0.0.1:8000 rồi thử lại.',
  )
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw networkError()
  }

  const raw = await response.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    const detail = asRecord(asRecord(body)?.detail)
    if (detail) {
      throw new ApiError(
        response.status,
        typeof detail.code === 'string' ? detail.code : 'http_error',
        typeof detail.message === 'string'
          ? detail.message
          : `Yêu cầu thất bại (HTTP ${response.status}).`,
        detail,
      )
    }
    const textDetail = asRecord(body)?.detail
    if (typeof textDetail === 'string') {
      throw new ApiError(response.status, 'http_error', textDetail)
    }
    throw new ApiError(
      response.status,
      'http_error',
      `Yêu cầu thất bại (HTTP ${response.status}).`,
    )
  }

  return body as T
}

function buildFormData(
  file: File,
  mapping: ColumnMapping,
  brands: [string, string] | null,
): FormData {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('mapping', JSON.stringify(mapping))
  if (brands) form.append('brands', JSON.stringify(brands))
  return form
}

export function previewImport(
  file: File,
  mapping: ColumnMapping,
  brands: [string, string] | null,
): Promise<PreviewResponse> {
  return request<PreviewResponse>('/api/imports/preview', {
    method: 'POST',
    body: buildFormData(file, mapping, brands),
  })
}

export function createAnalysis(
  file: File,
  mapping: ColumnMapping,
  brands: [string, string],
): Promise<AnalysisCreated> {
  return request<AnalysisCreated>('/api/analyses', {
    method: 'POST',
    body: buildFormData(file, mapping, brands),
  })
}

export function getAnalysis(
  analysisId: string,
  signal?: AbortSignal,
): Promise<Analysis> {
  return request<Analysis>(`/api/analyses/${encodeURIComponent(analysisId)}`, {
    signal,
  })
}

export function listReviews(
  analysisId: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<ReviewPage> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return request<ReviewPage>(
    `/api/analyses/${encodeURIComponent(analysisId)}/reviews?${query}`,
    { signal },
  )
}
