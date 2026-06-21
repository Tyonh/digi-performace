import { Svg, Polygon, Line, Circle, Text as SvgText } from 'react-native-svg'
import type { DimensionStats } from '@/lib/checkin/history'

interface Props {
  dimensions: DimensionStats[]
  size?: number
}

export function RadarChart({ dimensions, size = 240 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const labelR = size * 0.48
  const n = dimensions.length

  function polar(i: number, radius: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  }

  // Polígono de fundo (100%)
  const bgPoints = Array.from({ length: n }, (_, i) => polar(i, r).join(',')).join(' ')

  // Polígono dos dados
  const dataPoints = dimensions
    .map((d, i) => polar(i, (d.score / 10) * r).join(','))
    .join(' ')

  return (
    <Svg width={size} height={size}>
      {/* Grade — 3 anéis */}
      {[0.33, 0.66, 1].map((ratio) => (
        <Polygon
          key={ratio}
          points={Array.from({ length: n }, (_, i) => polar(i, r * ratio).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Eixos */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = polar(i, r)
        return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      })}

      {/* Área de dados */}
      <Polygon
        points={dataPoints}
        fill="rgba(233,69,96,0.18)"
        stroke="#e94560"
        strokeWidth={1.5}
      />

      {/* Pontos nos vértices */}
      {dimensions.map((d, i) => {
        const [x, y] = polar(i, (d.score / 10) * r)
        return <Circle key={i} cx={x} cy={y} r={3} fill={d.meta.color} />
      })}

      {/* Labels */}
      {dimensions.map((d, i) => {
        const [x, y] = polar(i, labelR)
        const textAnchor =
          x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        return (
          <SvgText
            key={i}
            x={x}
            y={y + 4}
            fontSize={9}
            fill="#94a3b8"
            textAnchor={textAnchor}
          >
            {d.meta.label}
          </SvgText>
        )
      })}
    </Svg>
  )
}
