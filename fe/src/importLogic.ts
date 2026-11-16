import type { ColumnMapping, PreviewLimits, PreviewResponse } from './api'

export const DEFAULT_LIMITS: PreviewLimits = {
  max_bytes: 2 * 1024 * 1024,
  max_records: 500,
  max_text_chars: 2000,
  max_context_chars: 1000,
}

export type MappingDraft = {
  text: string
  brand: string
  context: string
  sourceId: string
}

export const DEFAULT_MAPPING: MappingDraft = {
  text: 'text',
  brand: 'brand',
  context: '',
  sourceId: '',
}

export type BrandPair = [string, string]

/** Bỏ khoảng trắng và không gửi khóa mapping rỗng cho backend. */
export function toMapping(draft: MappingDraft): ColumnMapping {
  const mapping: ColumnMapping = {
    text: draft.text.trim(),
    brand: draft.brand.trim(),
  }
  const context = draft.context.trim()
  const sourceId = draft.sourceId.trim()
  if (context) mapping.context = context
  if (sourceId) mapping.source_id = sourceId
  return mapping
}

export function mappingIsReady(draft: MappingDraft): boolean {
  return Boolean(draft.text.trim() && draft.brand.trim())
}

/**
 * Khóa của một lượt kiểm tra. Preview chỉ còn hiệu lực khi file, mapping và
 * cặp brand chưa đổi — đổi bất kỳ phần nào cũng phải kiểm tra lại trước khi lưu.
 */
export function previewKey(
  file: File,
  mapping: ColumnMapping,
  brands: BrandPair,
): string {
  return JSON.stringify([
    file.name,
    file.size,
    file.lastModified,
    mapping.text,
    mapping.brand,
    mapping.context ?? '',
    mapping.source_id ?? '',
    brands[0],
    brands[1],
  ])
}

export type PreviewCheck = {
  key: string
  brands: BrandPair | null
  preview: PreviewResponse
}

/** Chỉ cho lưu khi lượt kiểm tra mới nhất khớp đúng phạm vi hiện tại và không có lỗi. */
export function saveReady(
  check: PreviewCheck | null,
  currentKey: string,
): boolean {
  if (!check) return false
  if (check.key !== currentKey) return false
  if (!check.brands) return false
  const [a, b] = check.brands
  if (!a || !b || a === b) return false
  return check.preview.error_records === 0
}

/** Hướng dẫn khi file không có đúng hai thương hiệu; null nghĩa là đã đủ. */
export function brandScopeMessage(brands: string[]): string | null {
  if (brands.length === 2) return null
  if (brands.length === 0) {
    return 'Chưa đọc được thương hiệu nào từ file. Kiểm tra lại cột thương hiệu nguồn.'
  }
  if (brands.length === 1) {
    return `File chỉ có một thương hiệu (${brands[0]}). Cần đúng hai thương hiệu trong một file; hãy bổ sung hoặc tách dữ liệu.`
  }
  return `File có ${brands.length} thương hiệu. P1 chỉ nhận đúng hai thương hiệu mỗi file; hãy tách file rồi kiểm tra lại.`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1
  return Math.ceil(total / pageSize)
}

export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return { from: Math.min(from, total), to }
}
