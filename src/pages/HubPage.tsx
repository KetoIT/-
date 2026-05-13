import { Link } from 'react-router-dom';

export function HubPage() {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 36,
          background: 'var(--bg-elev)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            letterSpacing: 2,
            margin: '0 0 10px',
            lineHeight: 1,
            fontWeight: 400,
          }}
        >
          Слабое звено by @keto
        </h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 28px', fontSize: 14, lineHeight: 1.55 }}>
          сделано для актива ШРКТЭ ^_^
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            to="/admin"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '14px 18px',
              borderRadius: 10,
              background: 'var(--text)',
              color: 'var(--bg)',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Пульт ведущего 
          </Link>
          <Link
            to="/screen"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '14px 18px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              color: 'var(--text)',
              fontWeight: 500,
              fontSize: 15,
            }}
          >
            Сценический экран
          </Link>
        </div>
      </div>
    </div>
  );
}
