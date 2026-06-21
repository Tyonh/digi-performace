import { Svg, Polyline, Line } from 'react-native-svg'

interface Props {
  points: number[]
  color: string
  width?: number
  height?: number
  min?: number
  max?: number
}

export function SparkLine({ points, color, width = 200, height = 40, min = 0, max = 10 }: Props) {
  if (points.length < 2) return null

  const range = max - min || 1
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * (width - 4) + 2
      const y = height - 4 - ((v - min) / range) * (height - 8)
      return `${x},${y}`
    })
    .join(' ')

  // Linha de média
  const avgVal = points.reduce((s, v) => s + v, 0) / points.length
  const avgY = height - 4 - ((avgVal - min) / range) * (height - 8)

  return (
    <Svg width={width} height={height}>
      <Line
        x1={2}
        y1={avgY}
        x2={width - 2}
        y2={avgY}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <Polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  )
}
