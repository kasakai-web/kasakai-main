export function CTASection() {
  return (
    <section style={{backgroundColor: 'var(--amber)', padding: '80px 24px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px'}}>
      <div style={{position: 'absolute', right: '-80px', top: '50%', transform: 'translateY(-50%)', width: '320px', height: '320px', borderRadius: '9999px', pointerEvents: 'none', background: 'rgba(0,0,0,0.06)'}}/>
      <div style={{position: 'relative', zIndex: 10}}>
        <p className="reveal" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,.45)', marginBottom: '8px'}}>Start today</p>
        <h2 className="reveal" style={{fontFamily: 'var(--cond)', fontWeight: 900, fontSize: 'clamp(48px, 6vw, 72px)', letterSpacing: '.01em', lineHeight: .9, color: 'black'}}>Your next game<br/>is waiting.</h2>
      </div>
      <div className="reveal d2" style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
        <a href="/signup?role=player" className="btn-primary" style={{backgroundColor: 'black', color: 'var(--amber)', padding: '14px 32px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px', position: 'relative', overflow: 'hidden', textDecoration: 'none'}}>
          <span style={{position: 'relative', zIndex: 10}}>Join as Player</span>
        </a>
        <a href="/signup?role=organiser" className="btn-secondary" style={{backgroundColor: 'transparent', color: 'black', border: '1px solid black', padding: '14px 28px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px', position: 'relative', overflow: 'hidden', textDecoration: 'none'}}>
          <span style={{position: 'relative', zIndex: 10}}>Become Organiser</span>
        </a>
      </div>
    </section>
  );
}
