'use client'

const mazes = [
  {
    id: 'bitcoin',
    tag: 'YSKAIPE BITCOIN',
    icon: '₿',
    title: ['THE', 'BITCOIN', 'MAZE'],
    accentWord: 'BITCOIN',
    color: '#f7931a',
    bg: '#fffaf2',
    bgHover: '#fff3e0',
    premise: '"The financial system is a maze built to keep you inside. Bitcoin is the exit door. DeFi is the path through."',
    paths: [
      'HODL strategy — cold storage, multisig, never selling wrong',
      'DeFi yield on your stack without custodial risk',
      'Lightning Network for daily sovereign spending',
      'Bitcoin-backed borrowing — liquidity without selling',
      'Navigating volatility without panic exits',
    ],
    exit: 'Generational digital wealth',
  },
  {
    id: 'sustain',
    tag: 'YSKAIPE SUSTAINABILITY',
    icon: '🌲',
    title: ['THE', 'LAND', 'MAZE'],
    accentWord: 'LAND',
    color: '#3d6b2a',
    bg: '#f2f5ee',
    bgHover: '#e8f0e3',
    premise: '"Raw acres look like a blank wall. AI maps the seasons, the soil, the cash flows — and finds the exit to a living land."',
    paths: [
      'Christmas tree + berry farm from 2–10 mountain acres',
      'Solar + water + soil system design for full off-grid',
      'Regenerative grazing, food forests, permaculture',
      'Land-to-income: agritourism, u-pick, direct sales',
      'NC mountain climate planning for year-round production',
    ],
    exit: 'Soil sovereignty + cash-flowing land',
  },
  {
    id: 'garden',
    tag: 'YSKAIPE THE GARDEN',
    icon: '🌿',
    title: ['THE', 'GARDEN', 'MAZE'],
    accentWord: 'GARDEN',
    color: '#a03060',
    bg: '#fdf0f5',
    bgHover: '#fce4ec',
    premise: '"Soil, seeds, seasons — three variables that feel random until AI reads them together and shows you exactly what to plant, when."',
    paths: [
      'Planting calendars tuned to your zip + microclimate',
      'Soil health diagnostics — amendments, cover crops, compost',
      'Blackberry, blueberry + perennial fruit navigation',
      'Succession planting for uninterrupted harvest windows',
      'Pest + disease identification and organic intervention',
    ],
    exit: 'Year-round abundance from your own land',
  },
  {
    id: 'ai',
    tag: 'YSKAIPE AI',
    icon: '⚡',
    title: ['THE', 'AI', 'MAZE'],
    accentWord: 'AI',
    color: '#1a3a8f',
    bg: '#eff3fa',
    bgHover: '#e3f2fd',
    premise: '"The AI maze has a thousand tools and no clear path. YSKAIPE maps which agents, which stacks, which prompts — for your exact situation."',
    paths: [
      'Multi-agent pipelines for real business operations',
      'Agentic content + monetization systems running solo',
      'AI pods — orchestrated human + AI execution teams',
      'Prompt engineering for leverage, not just answers',
      'Niche SaaS with AI co-founders, no team needed',
    ],
    exit: 'Empire without employees',
  },
]

export default function MazeGrid() {
  return (
    <section id="mazes">
      {/* Section header */}
      <div className="max-w-6xl mx-auto px-8 md:px-12 pt-16 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: '#8a8070', marginBottom: 8 }}>
            THE FOUR MAZES
          </p>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: 2, color: '#0d0d0d', lineHeight: 1 }}>
            PICK YOUR PUZZLE
          </h2>
        </div>
        <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontStyle: 'italic', color: '#8a8070', maxWidth: 280, lineHeight: 1.6, textAlign: 'right' }}>
          Every wall that looks like a dead end is just a turn you haven't mapped yet.
        </p>
      </div>

      {/* Grid */}
      <div
        className="max-w-6xl mx-auto px-8 md:px-12 pb-20"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3 }}
      >
        {mazes.map((maze) => (
          <MazeCard key={maze.id} maze={maze} />
        ))}
      </div>
    </section>
  )
}

function MazeCard({ maze }: { maze: typeof mazes[0] }) {
  return (
    <article
      id={maze.id}
      className="maze-card relative overflow-hidden p-10 cursor-pointer"
      style={{
        background: maze.bg,
        border: '1.5px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = maze.color
        e.currentTarget.style.background = maze.bgHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.background = maze.bg
      }}
    >
      {/* Large ghost number */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -12,
          right: -8,
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 120,
          color: maze.color,
          opacity: 0.06,
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: -2,
        }}
      >
        {maze.icon}
      </span>

      {/* Tag */}
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.18em', color: maze.color, marginBottom: 16 }}>
        [ {maze.tag} ]
      </p>

      {/* Title */}
      <h3
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(34px, 4vw, 44px)',
          letterSpacing: 1,
          lineHeight: 0.95,
          marginBottom: 14,
          color: '#0d0d0d',
        }}
      >
        {maze.title.map((word) =>
          word === maze.accentWord
            ? <span key={word} style={{ color: maze.color }}>{word}<br /></span>
            : <span key={word}>{word}<br /></span>
        )}
      </h3>

      {/* Premise quote */}
      <p
        style={{
          fontFamily: "'Lora', serif",
          fontSize: 14,
          fontStyle: 'italic',
          color: '#8a8070',
          lineHeight: 1.6,
          marginBottom: 18,
          borderLeft: `2px solid ${maze.color}`,
          paddingLeft: 14,
        }}
      >
        {maze.premise}
      </p>

      {/* Paths */}
      <ul style={{ listStyle: 'none', marginBottom: 24 }}>
        {maze.paths.map((path, i) => (
          <li
            key={i}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: '#8a8070',
              padding: '7px 0',
              borderBottom: i < maze.paths.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: maze.color, flexShrink: 0, marginTop: 1 }}>→</span>
            {path}
          </li>
        ))}
      </ul>

      {/* Exit label */}
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', color: '#8a8070', marginBottom: 16 }}>
        EXIT:{' '}
        <span style={{ color: maze.color }}>{maze.exit}</span>
      </p>

      {/* CTA */}
      <span
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: 2,
          color: maze.color,
          borderBottom: `1.5px solid ${maze.color}`,
          paddingBottom: 3,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        NAVIGATE THIS MAZE →
      </span>
    </article>
  )
}
