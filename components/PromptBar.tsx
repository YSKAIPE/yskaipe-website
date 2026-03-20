'use client'
import { useState } from 'react'

const examples = [
  {
    text: 'How do I HODL through volatility and use DeFi to build without selling my stack?',
    tag: 'BITCOIN MAZE',
    tagColor: '#f7931a',
    tagBg: '#fff3e0',
  },
  {
    text: 'How do I turn 2 mountain acres in NC into a christmas tree and blackberry farm?',
    tag: 'SUSTAIN MAZE',
    tagColor: '#3d6b2a',
    tagBg: '#e8f5e9',
  },
  {
    text: 'Help me plan a year-round garden in Davidson NC with perennial fruit.',
    tag: 'GARDEN MAZE',
    tagColor: '#a03060',
    tagBg: '#fce4ec',
  },
  {
    text: 'How do I build a solo AI business with multi-agent leverage and no employees?',
    tag: 'AI MAZE',
    tagColor: '#1a3a8f',
    tagBg: '#e3f2fd',
  },
]

export default function PromptBar() {
  const [value, setValue] = useState('')

  return (
    <section
      style={{ background: '#e8e0c8', borderTop: '2px solid #0d0d0d', padding: '72px 48px' }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(32px, 5vw, 48px)',
            letterSpacing: 2,
            marginBottom: 8,
            color: '#0d0d0d',
          }}
        >
          WHICH MAZE ARE YOU IN?
        </h2>
        <p
          style={{
            fontFamily: "'Lora', serif",
            fontSize: 15,
            fontStyle: 'italic',
            color: '#8a8070',
            marginBottom: 36,
          }}
        >
          Describe your situation. AI maps your path and finds your exit.
        </p>

        {/* Example prompts */}
        <div style={{ marginBottom: 28 }}>
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setValue(ex.text)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: i === 0 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                borderTop: '1px solid rgba(0,0,0,0.12)',
                padding: '14px 4px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <span
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: 16,
                  fontStyle: 'italic',
                  color: '#8a8070',
                  flex: 1,
                }}
              >
                {ex.text}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  padding: '4px 10px',
                  borderRadius: 2,
                  background: ex.tagBg,
                  color: ex.tagColor,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {ex.tag}
              </span>
            </button>
          ))}
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="prompt-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Describe your maze…"
            style={{
              flex: 1,
              background: 'white',
              border: '1.5px solid #0d0d0d',
              borderRadius: 2,
              padding: '14px 18px',
              fontFamily: "'Lora', serif",
              fontSize: 16,
              fontStyle: 'italic',
              color: '#0d0d0d',
            }}
          />
          <button
            style={{
              background: '#0d0d0d',
              color: '#f4f0e4',
              border: 'none',
              padding: '14px 28px',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: 2,
              cursor: 'pointer',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            FIND EXIT ↗
          </button>
        </div>
      </div>
    </section>
  )
}
