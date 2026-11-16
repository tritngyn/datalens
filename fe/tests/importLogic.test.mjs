import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  brandScopeMessage,
  formatBytes,
  pageRange,
  previewKey,
  saveReady,
  toMapping,
  totalPages,
} from '../src/importLogic.ts'

const file = (name, size, lastModified = 1) => ({
  name,
  size,
  lastModified,
})

const preview = (errorRecords) => ({
  error_records: errorRecords,
  source_brands: ['DHC', 'Vaseline'],
})

test('toMapping trims values and drops empty optional columns', () => {
  assert.deepEqual(
    toMapping({ text: ' text ', brand: ' brand ', context: '  ', sourceId: '' }),
    { text: 'text', brand: 'brand' },
  )
  assert.deepEqual(
    toMapping({ text: 'body', brand: 'hãng', context: 'ctx', sourceId: 'id' }),
    { text: 'body', brand: 'hãng', context: 'ctx', source_id: 'id' },
  )
})

test('previewKey changes with file, mapping and brand scope', () => {
  const csv = file('a.csv', 10)
  const mapping = { text: 'text', brand: 'brand' }
  const base = previewKey(csv, mapping, ['DHC', 'Vaseline'])

  assert.equal(previewKey(csv, mapping, ['DHC', 'Vaseline']), base)
  assert.notEqual(previewKey(file('b.csv', 10), mapping, ['DHC', 'Vaseline']), base)
  assert.notEqual(previewKey(file('a.csv', 11), mapping, ['DHC', 'Vaseline']), base)
  assert.notEqual(previewKey(csv, { text: 'body', brand: 'brand' }, ['DHC', 'Vaseline']), base)
  assert.notEqual(previewKey(csv, mapping, ['Vaseline', 'DHC']), base)
})

test('saveReady rejects stale previews, missing scope and invalid records', () => {
  const key = 'current'
  const fresh = { key, brands: ['DHC', 'Vaseline'], preview: preview(0) }

  assert.equal(saveReady(fresh, key), true)
  assert.equal(saveReady(fresh, 'other'), false)
  assert.equal(saveReady(null, key), false)
  assert.equal(saveReady({ ...fresh, brands: null }, key), false)
  assert.equal(saveReady({ ...fresh, brands: ['DHC', 'DHC'] }, key), false)
  assert.equal(
    saveReady({ ...fresh, preview: preview(2) }, key),
    false,
  )
})

test('brandScopeMessage explains files without exactly two brands', () => {
  assert.equal(brandScopeMessage(['DHC', 'Vaseline']), null)
  assert.match(brandScopeMessage(['DHC']), /một thương hiệu \(DHC\)/)
  assert.match(brandScopeMessage([]), /Chưa đọc được thương hiệu/)
  assert.match(brandScopeMessage(['A', 'B', 'C']), /3 thương hiệu/)
})

test('pagination helpers keep the last page inside the total', () => {
  assert.equal(totalPages(22, 20), 2)
  assert.equal(totalPages(0, 20), 1)
  assert.deepEqual(pageRange(1, 20, 22), { from: 1, to: 20 })
  assert.deepEqual(pageRange(2, 20, 22), { from: 21, to: 22 })
  assert.deepEqual(pageRange(1, 20, 0), { from: 0, to: 0 })
})

test('formatBytes switches units at the kilobyte and megabyte', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(2048), '2.0 KB')
  assert.equal(formatBytes(2 * 1024 * 1024), '2.0 MB')
})
