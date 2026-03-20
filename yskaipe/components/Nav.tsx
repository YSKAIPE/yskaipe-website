'use client'
import { useState } from 'react'

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-12 py-4"
      style={{
        borderBottom: '2px solid #0d0d0d',
        background: 'rgba(244,240,228,0.96)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Logo */}
      <a href="/" className="flex items-baseline gap-2 no-underline">
        <span
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 4 }}
          className="text-ink"
        >
          YSKAIPE
        </span>
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.15em' }}
          className="text-fog hidden md:inline"
        >
          / pronounced "escape"
        </span>
      </a>

      {/* Desktop maze pills */}
      <div className="hidden md:flex items-center gap-2">
        {[
          { label: '₿ BITCOIN',   color: '#f7931a', href: '#bitcoin'    },
          { label: '🌲 SUSTAIN',  color: '#3d6b2a', href: '#sustain'    },
          { label: '🌿 GARDEN',   color: '#a03060', href: '#garden'     },
          { label: '⚡ AI',       color: '#1a3a8f', href: '#ai'         },
        ].map((pill) => (
          <a
            key={pill.label}
            href={pill.href}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              color: pill.color,
              border: `1px solid transparent`,
              padding: '5px 12px',
              borderRadius: 2,
              transition: 'border-color 0.15s',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = pill.color)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
          >
            {pill.label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <a
        href="#mazes"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 15,
          letterSpacing: 2,
          background: '#0d0d0d',
          color: '#f4f0e4',
          padding: '8px 20px',
          borderRadius: 2,
          textDecoration: 'none',
          display: 'inline-block',
        }}
        className="hidden md:inline-block hover:bg-gray-800 transition-colors"
      >
        FIND MY EXIT ↗
      </a>

      {/* Mobile hamburger */}
      <button
        className="md:hidden text-ink text-2xl"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 flex flex-col gap-3 p-6 md:hidden"
          style={{ background: '#f4f0e4', borderBottom: '2px solid #0d0d0d' }}
        >
          {[
            { label: '₿ YSKAIPE Bitcoin',      color: '#f7931a', href: '#bitcoin' },
            { label: '🌲 YSKAIPE Sustainability', color: '#3d6b2a', href: '#sustain' },
            { label: '🌿 YSKAIPE the Garden',   color: '#a03060', href: '#garden'  },
            { label: '⚡ YSKAIPE AI',           color: '#1a3a8f', href: '#ai'      },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: item.color,
                textDecoration: 'none',
                letterSpacing: '0.08em',
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#mazes"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 16,
              letterSpacing: 2,
              background: '#0d0d0d',
              color: '#f4f0e4',
              padding: '10px 20px',
              borderRadius: 2,
              textDecoration: 'none',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            FIND MY EXIT ↗
          </a>
        </div>
      )}
    </nav>
  )
}
