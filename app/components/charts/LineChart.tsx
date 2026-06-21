import { Svg, Polyline, Line, Circle, Text as SvgText, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Dimensions } from 'react-native'

const SCREEN_W = Dimensions.get('window').width

interface Props {
  points: number[]       // valores 0–10
  dates: string[]        // YYYY-MM-DD, mesmo índice que points
  color: string
  height?: number
}

const PAD = { top: 10, right: 12, bottom: 28, left: 24 }

export function LineChart({ points, dates, color, height = 120 }: Props) {
  if (points.length === 0) return null

  const W = SCREEN_W - 40  // tela cheia menos margens do card
  const H = height
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const MIN = 0
  const MAX = 10

  function px(i: number) {
    if (points.length === 1) return PAD.left + iW / 2
    return PAD.left + (i / (points.length - 1)) * iW
  }
  function py(v: number) {
    return PAD.top + iH - ((v - MIN) / (MAX - MIN)) * iH
  }

  const polyCoords = points.map((v, i) => `${px(i)},${py(v)}`).join(' ')
  const avgVal = points.reduce((s, v) => s + v, 0) / points.length
  const avgY = py(avgVal)

  // Linhas horizontais de grade em 0, 5, 10
  const gridLines = [0, 5, 10]

  // Labels do eixo X: mostra no máximo 5, distribuídos
  const xStep = Math.max(1, Math.floor(points.length / 5))
  const xLabels: { i: number; label: string }[] = []
  for (let i = 0; i < points.length; i += xStep) {
    const d = dates[i]
    if (!d) continue
    const [, m, day] = d.split('-')
    xLabels.push({ i, label: `${day}/${m}` })
  }
  // Garante que o último ponto sempre aparece
  const last = points.length - 1
  if (xLabels.length === 0 || xLabels[xLabels.length - 1].i !== last) {
    const d = dates[last]
    if (d) {
      const [, m, day] = d.split('-')
      xLabels.push({ i: last, label: `${day}/${m}` })
    }
  }

  // Ponto atual (último)
  const lastX = px(last)
  const lastY = py(points[last])
  const lastVal = points[last]
  const lastColor = lastVal >= 7 ? '#4ade80' : lastVal >= 4 ? '#facc15' : '#e94560'

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.18" />
          <Stop offset="1" stopColor={color} stopOpacity="0.01" />
        </LinearGradient>
      </Defs>

      {/* Grade horizontal */}
      {gridLines.map((v) => (
        <Line
          key={v}
          x1={PAD.left}
          y1={py(v)}
          x2={PAD.left + iW}
          y2={py(v)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* Labels eixo Y */}
      {gridLines.map((v) => (
        <SvgText
          key={`yl-${v}`}
          x={PAD.left - 4}
          y={py(v) + 4}
          fontSize={8}
          fill="#334155"
          textAnchor="end"
        >
          {v}
        </SvgText>
      ))}

      {/* Linha de média */}
      <Line
        x1={PAD.left}
        y1={avgY}
        x2={PAD.left + iW}
        y2={avgY}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <SvgText x={PAD.left + iW + 2} y={avgY + 4} fontSize={8} fill="#475569">
        ø{avgVal.toFixed(1)}
      </SvgText>

      {/* Área sob a linha */}
      {points.length > 1 && (
        <Polyline
          points={[
            `${PAD.left},${py(MIN)}`,
            ...points.map((v, i) => `${px(i)},${py(v)}`),
            `${px(last)},${py(MIN)}`,
          ].join(' ')}
          fill={`url(#grad-${color})`}
          stroke="none"
        />
      )}

      {/* Linha principal */}
      {points.length > 1 && (
        <Polyline
          points={polyCoords}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Pontos individuais (quando poucos dados) */}
      {points.length <= 14 && points.map((v, i) => (
        <Circle
          key={i}
          cx={px(i)}
          cy={py(v)}
          r={i === last ? 0 : 2.5}
          fill={color}
          opacity={0.5}
        />
      ))}

      {/* Ponto atual destacado */}
      <Circle cx={lastX} cy={lastY} r={5} fill="#0d0d1a" />
      <Circle cx={lastX} cy={lastY} r={3.5} fill={lastColor} />

      {/* Tooltip do ponto atual */}
      <Rect
        x={lastX - 14}
        y={lastY - 22}
        width={28}
        height={16}
        rx={4}
        fill="#1e293b"
      />
      <SvgText
        x={lastX}
        y={lastY - 11}
        fontSize={9}
        fill={lastColor}
        textAnchor="middle"
        fontWeight="bold"
      >
        {lastVal}
      </SvgText>

      {/* Labels eixo X */}
      {xLabels.map(({ i, label }) => (
        <SvgText
          key={`xl-${i}`}
          x={px(i)}
          y={H - 6}
          fontSize={8}
          fill="#334155"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}
    </Svg>
  )
}
