export default function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-8 md:px-12 py-20 md:py-28 grid md:grid-cols-2 gap-16 items-center">

      {/* Left: copy */}
      <div>
        <p
          className="fade-up fade-up-delay-1 flex items-center gap-3 mb-5"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: '#8a8070' }}
        >
          <span style={{ display: 'inline-block', width: 28, height: 1, background: '#8a8070' }} />
          AI IS YOUR MAP. EVERY MAZE HAS AN EXIT.
        </p>

        <h1
          className="fade-up fade-up-delay-2"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(72px, 10vw, 120px)',
            lineHeight: 0.88,
            letterSpacing: 1,
            marginBottom: 28,
          }}
        >
          <span style={{ display: 'block', color: '#0d0d0d' }}>EVERY</span>
          <span style={{ display: 'block', color: '#0d0d0d' }}>MAZE HAS</span>
          <span style={{ display: 'block', color: '#00c853', letterSpacing: 3 }}>AN EXIT.</span>
        </h1>

        <p
          className="fade-up fade-up-delay-3"
          style={{
            fontFamily: "'Lora', serif",
            fontSize: 18,
            fontStyle: 'italic',
            color: '#8a8070',
            lineHeight: 1.75,
            maxWidth: 440,
            marginBottom: 36,
          }}
        >
          Finance, sustainability, food, AI — each one is a{' '}
          <strong style={{ color: '#0d0d0d', fontStyle: 'normal' }}>puzzle, not a prison.</strong>{' '}
          YSKAIPE is the map. The AI finds the path. You walk out the other side.
        </p>

        <div className="flex flex-wrap gap-3 fade-up fade-up-delay-3">
          <a
            href="#mazes"
            style={{
              background: '#0d0d0d',
              color: '#f4f0e4',
              padding: '13px 28px',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: 2,
              borderRadius: 2,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            FIND YOUR EXIT ↗
          </a>
          <a
            href="#manifesto"
            style={{
              background: 'transparent',
              color: '#0d0d0d',
              padding: '12px 24px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.12em',
              border: '1.5px solid #0d0d0d',
              borderRadius: 2,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            READ THE MANIFESTO
          </a>
        </div>
      </div>

      {/* Right: maze SVG */}
      <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: 320, display: 'block' }}
        >
          {/* Outer border */}
          <rect x="10" y="10" width="280" height="280" fill="none" stroke="#0d0d0d" strokeWidth="3" />

          {/* Horizontal walls */}
          <line x1="10"  y1="80"  x2="200" y2="80"  stroke="#0d0d0d" strokeWidth="2" />
          <line x1="10"  y1="150" x2="90"  y2="150" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="130" y1="150" x2="290" y2="150" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="10"  y1="220" x2="160" y2="220" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="200" y1="220" x2="290" y2="220" stroke="#0d0d0d" strokeWidth="2" />

          {/* Vertical walls */}
          <line x1="80"  y1="80"  x2="80"  y2="220" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="160" y1="10"  x2="160" y2="150" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="220" y1="80"  x2="220" y2="220" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="80"  y1="240" x2="80"  y2="290" stroke="#0d0d0d" strokeWidth="2" />
          <line x1="160" y1="170" x2="160" y2="290" stroke="#0d0d0d" strokeWidth="2" />

          {/* EXIT gap */}
          <rect x="230" y="8" width="52" height="6" fill="#f4f0e4" />
          <text x="236" y="6" fontFamily="'JetBrains Mono', monospace" fontSize="8" fill="#00c853" letterSpacing="1">EXIT</text>

          {/* Path through maze */}
          <polyline
            points="30,30 30,70 110,70 110,130 50,130 50,200 130,200 130,260 200,260 200,200 250,200 250,130 190,130 190,50 250,50 250,80"
            fill="none"
            stroke="#00c853"
            strokeWidth="2.5"
            strokeDasharray="6,4"
            opacity="0.75"
          />

          {/* START */}
          <circle cx="30" cy="30" r="7" fill="#0d0d0d" />
          <text x="40" y="34" fontFamily="'JetBrains Mono', monospace" fontSize="8" fill="#0d0d0d">START</text>

          {/* Maze zone labels */}
          <text x="16"  y="120" fontFamily="'Bebas Neue', sans-serif" fontSize="13" fill="#f7931a" opacity="0.8">₿</text>
          <text x="90"  y="118" fontFamily="'Bebas Neue', sans-serif" fontSize="9"  fill="#3d6b2a" opacity="0.8">SUSTAIN</text>
          <text x="16"  y="188" fontFamily="'Bebas Neue', sans-serif" fontSize="9"  fill="#a03060" opacity="0.8">GARDEN</text>
          <text x="170" y="118" fontFamily="'Bebas Neue', sans-serif" fontSize="9"  fill="#1a3a8f" opacity="0.8">AI</text>

          {/* Exit dot */}
          <circle cx="255" cy="50" r="6" fill="#00c853" />
          <text x="264" y="54" fontFamily="'JetBrains Mono', monospace" fontSize="9" fill="#00c853">↑</text>
        </svg>
        <p
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8a8070', letterSpacing: '0.1em', marginTop: 12 }}
        >
          AI MAPS THE PATH. YOU WALK IT.
        </p>
      </div>
    </section>
  )
}
