const items = [
  { maze: 'YSKAIPE BITCOIN',       path: 'navigate HODLing, DeFi & digital gold',          exit: 'generational wealth' },
  { maze: 'YSKAIPE SUSTAINABILITY', path: 'navigate land, farming & off-grid living',        exit: 'soil sovereignty' },
  { maze: 'YSKAIPE THE GARDEN',    path: 'navigate food, growing & harvest',                exit: 'the full table' },
  { maze: 'YSKAIPE AI',            path: 'navigate agents, automation & building',          exit: 'empire without employees' },
]

// doubled for seamless loop
const doubled = [...items, ...items]

export default function Ticker() {
  return (
    <div
      style={{ background: '#0d0d0d', borderTop: '2px solid #0d0d0d', overflow: 'hidden', padding: '13px 0' }}
    >
      <div className="flex whitespace-nowrap animate-ticker" style={{ width: 'max-content' }}>
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center">
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                padding: '0 36px',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{item.maze}</span>
              {' — '}
              <span style={{ fontFamily: "'Lora', serif", fontStyle: 'italic' }}>{item.path}</span>
              {' — '}
              <span style={{ color: '#00c853' }}>EXIT: {item.exit}</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
