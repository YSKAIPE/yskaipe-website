export default function Manifesto() {
  return (
    <section
      id="manifesto"
      style={{ background: '#0d0d0d', padding: '100px 48px', textAlign: 'center' }}
    >
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.2em',
          color: '#8a8070',
          marginBottom: 32,
        }}
      >
        THE YSKAIPE PHILOSOPHY
      </p>

      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(48px, 8vw, 100px)',
          lineHeight: 0.9,
          letterSpacing: 2,
          marginBottom: 36,
          color: '#f4f0e4',
        }}
      >
        THE MAZE IS<br />
        A{' '}
        <span style={{ color: '#00c853' }}>PUZZLE,</span>
        <br />
        NOT A PRISON.
      </h2>

      <p
        style={{
          fontFamily: "'Lora', serif",
          fontSize: 19,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 640,
          margin: '0 auto 20px',
          lineHeight: 1.75,
        }}
      >
        Every wall that looks like a dead end is just a turn you haven't mapped yet.{' '}
        <strong style={{ color: '#f4f0e4', fontStyle: 'normal' }}>
          Finance isn't gatekeeping — it's a maze with a Bitcoin exit.
        </strong>{' '}
        Land isn't inaccessible — it's a maze with a harvest exit. The garden isn't random — it's a
        maze with a soil-literacy exit.
      </p>

      <p
        style={{
          fontFamily: "'Lora', serif",
          fontSize: 19,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 640,
          margin: '0 auto 48px',
          lineHeight: 1.75,
        }}
      >
        AI doesn't make the decisions.{' '}
        <strong style={{ color: '#f4f0e4', fontStyle: 'normal' }}>
          AI reads the full maze
        </strong>{' '}
        — all the walls at once — and hands you a map. You still walk it. But now you know where
        you're going.
      </p>

      {/* Four exits */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 2,
          maxWidth: 800,
          margin: '0 auto 56px',
        }}
      >
        {[
          { label: 'YSKAIPE BITCOIN',       exit: 'Generational wealth',        color: '#f7931a' },
          { label: 'YSKAIPE SUSTAINABILITY', exit: 'Soil sovereignty',           color: '#3d6b2a' },
          { label: 'YSKAIPE THE GARDEN',    exit: 'The full table',             color: '#a03060' },
          { label: 'YSKAIPE AI',            exit: 'Empire without employees',   color: '#1a3a8f' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px 16px',
            }}
          >
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', color: item.color, marginBottom: 8 }}>
              {item.label}
            </p>
            <p style={{ fontFamily: "'Lora', serif", fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
              Exit: {item.exit}
            </p>
          </div>
        ))}
      </div>

      <a
        href="#mazes"
        style={{
          background: '#f4f0e4',
          color: '#0d0d0d',
          padding: '16px 40px',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 20,
          letterSpacing: 3,
          borderRadius: 2,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        FIND YOUR MAZE ↗
      </a>
    </section>
  )
}
