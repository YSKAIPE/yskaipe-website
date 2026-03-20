'use client'

import PromptBar from '@/components/PromptBar'

interface Section {
  heading: string
  body: string
  paths: string[]
}

interface MazePageProps {
  tag: string
  color: string
  bg: string
  icon: string
  title: string
  premise: string
  exit: string
  sections: Section[]
}

export default function MazePage({ tag, color, bg, icon, title, premise, exit, sections }: MazePageProps) {
  return (
    <>
      {/* Hero band */}
      <section style={{ background: bg, borderBottom: '2px solid #0d0d0d', padding: '80px 48px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color, marginBottom: 20 }}>
            [ {tag} ]
          </p>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(56px, 9vw, 110px)',
              lineHeight: 0.88,
              letterSpacing: 2,
              color: '#0d0d0d',
              marginBottom: 28,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: "'Lora', serif",
              fontSize: 19,
              fontStyle: 'italic',
              color: '#8a8070',
              lineHeight: 1.75,
              maxWidth: 620,
              marginBottom: 24,
              borderLeft: `3px solid ${color}`,
              paddingLeft: 20,
            }}
          >
            {premise}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', color: '#8a8070' }}>
              EXIT:
            </span>
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: 2,
                color,
                borderBottom: `1.5px solid ${color}`,
                paddingBottom: 2,
              }}
            >
              {exit}
            </span>
          </div>
        </div>
      </section>

      {/* Sections */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '72px 48px' }}>
        {sections.map((section, i) => (
          <div
            key={i}
            style={{
              marginBottom: i < sections.length - 1 ? 72 : 0,
              paddingBottom: i < sections.length - 1 ? 72 : 0,
              borderBottom: i < sections.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
              display: 'grid',
              gridTemplateColumns: '1fr 1.4fr',
              gap: 48,
              alignItems: 'start',
            }}
            className="flex-col md:grid"
          >
            {/* Left: heading + body */}
            <div>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  color,
                  marginBottom: 10,
                }}
              >
                0{i + 1} /
              </p>
              <h2
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  letterSpacing: 1,
                  color: '#0d0d0d',
                  lineHeight: 1,
                  marginBottom: 16,
                }}
              >
                {section.heading}
              </h2>
              <p
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: 15,
                  fontStyle: 'italic',
                  color: '#8a8070',
                  lineHeight: 1.7,
                }}
              >
                {section.body}
              </p>
            </div>

            {/* Right: paths */}
            <ul style={{ listStyle: 'none' }}>
              {section.paths.map((path, j) => (
                <li
                  key={j}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: '#8a8070',
                    padding: '10px 0',
                    borderBottom: j < section.paths.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color, flexShrink: 0, marginTop: 1 }}>→</span>
                  {path}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Back to all mazes */}
      <div style={{ background: '#0d0d0d', padding: '48px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 20,
          }}
        >
          EXPLORE OTHER MAZES
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '₿ BITCOIN',      color: '#f7931a', href: '/bitcoin' },
            { label: '🌲 SUSTAIN',     color: '#3d6b2a', href: '/sustain' },
            { label: '🌿 GARDEN',      color: '#a03060', href: '/garden'  },
            { label: '⚡ AI',          color: '#1a3a8f', href: '/ai'      },
          ].map((m) => (
            <a
              key={m.label}
              href={m.href}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.08em',
                color: m.color,
                border: `1px solid ${m.color}`,
                padding: '8px 18px',
                borderRadius: 2,
                textDecoration: 'none',
              }}
            >
              {m.label}
            </a>
          ))}
        </div>
      </div>

      <PromptBar />
    </>
  )
}
