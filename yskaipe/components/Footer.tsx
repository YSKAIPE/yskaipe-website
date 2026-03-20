'use client'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ borderTop: '2px solid #0d0d0d', background: '#f4f0e4' }}>
      <div
        className="max-w-6xl mx-auto px-8 md:px-12 py-12"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}
      >
        {/* Brand */}
        <div style={{ gridColumn: 'span 1' }}>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, color: '#0d0d0d', lineHeight: 1 }}>
            YSKAIPE
          </p>
          <p style={{ fontFamily: "'Lora', serif", fontSize: 13, fontStyle: 'italic', color: '#8a8070', marginTop: 8, lineHeight: 1.6 }}>
            Every maze has an exit.<br />
            AI is your map.<br />
            <em>pronounced "escape"</em>
          </p>
        </div>

        {/* The Mazes */}
        <div>
          <h5 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: '#8a8070', marginBottom: 16 }}>
            THE MAZES
          </h5>
          {[
            { label: 'YSKAIPE Bitcoin',        color: '#f7931a', href: '#bitcoin' },
            { label: 'YSKAIPE Sustainability',  color: '#3d6b2a', href: '#sustain' },
            { label: 'YSKAIPE the Garden',      color: '#a03060', href: '#garden'  },
            { label: 'YSKAIPE AI',              color: '#1a3a8f', href: '#ai'      },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Lora', serif",
                fontSize: 14,
                fontStyle: 'italic',
                color: '#8a8070',
                textDecoration: 'none',
                marginBottom: 9,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0d0d0d' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8070' }}
            >
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: link.color, flexShrink: 0 }} />
              {link.label}
            </a>
          ))}
        </div>

        {/* Community */}
        <div>
          <h5 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: '#8a8070', marginBottom: 16 }}>
            COMMUNITY
          </h5>
          {['Stories', 'Pods', 'Newsletter', 'Manifesto'].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                display: 'block',
                fontFamily: "'Lora', serif",
                fontSize: 14,
                fontStyle: 'italic',
                color: '#8a8070',
                textDecoration: 'none',
                marginBottom: 9,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0d0d0d' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8070' }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Build */}
        <div>
          <h5 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: '#8a8070', marginBottom: 16 }}>
            BUILD WITH US
          </h5>
          {['API access', 'Partner mazes', 'For builders', 'GitHub'].map((item) => (
            <a
              key={item}
              href={item === 'GitHub' ? 'https://github.com/YSKAIPE/yskaipe-website' : '#'}
              style={{
                display: 'block',
                fontFamily: "'Lora', serif",
                fontSize: 14,
                fontStyle: 'italic',
                color: '#8a8070',
                textDecoration: 'none',
                marginBottom: 9,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0d0d0d' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8070' }}
            >
              {item}
            </a>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="max-w-6xl mx-auto px-8 md:px-12 py-5 flex justify-between items-center flex-wrap gap-3"
        style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}
      >
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#8a8070', letterSpacing: '0.1em' }}>
          © {year} YSKAIPE.COM — PRONOUNCED "ESCAPE"
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#8a8070', letterSpacing: '0.1em' }}>
          THE MAZE IS A PUZZLE, NOT A PRISON.
        </p>
      </div>
    </footer>
  )
}
