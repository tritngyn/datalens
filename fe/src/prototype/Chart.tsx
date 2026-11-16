import type { CSSProperties } from 'react'

import {
  ASPECT_LABELS,
  CHART_ASPECTS,
  PROTOTYPE_BRANDS,
  type Aspect,
  type BrandKey,
} from './data'
import {
  cellFor,
  formatRate,
  type ComparisonCell,
} from './logic'

export type ChartSelection = { aspect: Aspect; brand: BrandKey }

type Props = {
  comparison: ComparisonCell[]
  selected: ChartSelection | null
  onSelect: (aspect: Aspect, brand: BrandKey) => void
}

export default function PrototypeChart({
  comparison,
  selected,
  onSelect,
}: Props) {
  return (
    <section className="proto-chart" aria-labelledby="proto-chart-heading">
      <div className="proto-chart__head">
        <h2 id="proto-chart-heading">Tỷ lệ review tiêu cực theo khía cạnh</h2>
        <p className="fineprint">
          Tử số: review có nhận xét tiêu cực về brand và khía cạnh. Mẫu số:
          toàn bộ review nhắc brand và khía cạnh đó. Một review có thể vào nhiều
          khía cạnh; đây là số review, không phải số khách hàng.
        </p>
        <ul className="chart-legend">
          <li>
            <span className="chart-legend__swatch chart-legend__swatch--a" />
            DHC
          </li>
          <li>
            <span className="chart-legend__swatch chart-legend__swatch--b" />
            Vaseline
          </li>
          <li className="chart-legend__scale">Thang 0–100%</li>
        </ul>
      </div>

      <div
        className={
          selected ? 'chart chart--has-selection' : 'chart'
        }
        role="group"
        aria-label="Biểu đồ cột nhóm: tỷ lệ review tiêu cực theo Giá và Hiệu quả dưỡng"
      >
        {CHART_ASPECTS.map((aspect) => (
          <div className="chart__group" key={aspect}>
            <div className="chart__bars">
              {PROTOTYPE_BRANDS.map((brand) => {
                const cell = cellFor(comparison, brand, aspect)
                if (!cell) return null
                const isSelected =
                  selected?.aspect === aspect && selected?.brand === brand
                const tone = brand === 'DHC' ? 'a' : 'b'
                return (
                  <div className={`bar-cell bar-cell--${tone}`} key={brand}>
                    <p className="bar-cell__value">
                      {cell.total === 0 ? '—' : formatRate(cell.rate)}
                    </p>
                    {cell.total === 0 ? (
                      <div className="bar bar--empty">
                        <span>Không đủ dữ liệu</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={
                          isSelected ? 'bar is-selected' : 'bar'
                        }
                        style={
                          {
                            '--bar-height': `${cell.rate ?? 0}%`,
                          } as CSSProperties
                        }
                        aria-pressed={isSelected}
                        aria-label={
                          `${brand}, ${ASPECT_LABELS[aspect]}: ` +
                          `${formatRate(cell.rate)}, ${cell.negatives} trên ` +
                          `${cell.total} review tiêu cực. Xem review.`
                        }
                        onClick={() => onSelect(aspect, brand)}
                      >
                        <span className="bar__fill" aria-hidden="true" />
                      </button>
                    )}
                    <p className="bar-cell__brand">{brand}</p>
                    <p className="bar-cell__den">
                      {cell.total === 0
                        ? '0 review nhắc'
                        : `${cell.negatives}/${cell.total} review tiêu cực`}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="chart__group-label">{ASPECT_LABELS[aspect]}</p>
          </div>
        ))}
      </div>

      <details className="chart-table">
        <summary>Bảng số liệu (cùng dữ liệu với biểu đồ)</summary>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Bảng số liệu tỷ lệ review tiêu cực"
        >
          <table>
            <caption>
              Tỷ lệ review tiêu cực theo thương hiệu và khía cạnh. Tử số là
              review tiêu cực, mẫu số là review nhắc khía cạnh.
            </caption>
            <thead>
              <tr>
                <th scope="col">Khía cạnh</th>
                <th scope="col">Thương hiệu</th>
                <th scope="col">Tỷ lệ</th>
                <th scope="col">Tử số</th>
                <th scope="col">Mẫu số</th>
                <th scope="col">Review</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((cell) => (
                <tr key={`${cell.aspect}-${cell.brand}`}>
                  <td>{ASPECT_LABELS[cell.aspect]}</td>
                  <td>
                    <span
                      className={
                        cell.brand === 'DHC' ? 'chip chip--a' : 'chip chip--b'
                      }
                    >
                      {cell.brand}
                    </span>
                  </td>
                  <td>{formatRate(cell.rate)}</td>
                  <td>{cell.negatives}</td>
                  <td>{cell.total}</td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      disabled={cell.total === 0}
                      onClick={() => onSelect(cell.aspect, cell.brand)}
                    >
                      Xem review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
