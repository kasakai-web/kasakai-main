export function PricingSection() {
  return (
    <section id="pricing" style={{position: 'relative', background: 'var(--coral)', padding: '96px 24px', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: '-40px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--cond)', fontSize: '320px', fontWeight: 900, color: 'rgba(0,0,0,.05)', pointerEvents: 'none'}}>₹</div>
      <div className="container" style={{position: 'relative', zIndex: 10}}>
        <p className="reveal" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,.4)', marginBottom: '14px'}}>Simple pricing</p>
        <h2 className="reveal d1" style={{fontFamily: 'var(--cond)', fontWeight: 900, fontSize: 'clamp(48px, 7vw, 72px)', letterSpacing: '.01em', lineHeight: .92, color: 'black', marginBottom: '48px'}}>Transparent.<br/>No surprises.</h2>
        <div className="pricing-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'black', border: '1px solid black'}}>
          <div className="reveal d1" style={{padding: '36px', display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--coral)', color: 'black'}}>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '16px', position: 'relative', zIndex: 10, color: 'rgba(0,0,0,.4)'}}>Base</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '60px', fontWeight: 900, lineHeight: 'tight', marginBottom: '4px', position: 'relative', zIndex: 10, color: 'black'}}>Free</div>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', marginBottom: '24px', position: 'relative', zIndex: 10, color: 'rgba(0,0,0,.4)'}}>Forever</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '36px', fontWeight: 800, letterSpacing: '.04em', marginBottom: '20px', position: 'relative', zIndex: 10, color: 'black'}}>Player</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative', zIndex: 10, marginBottom: '28px'}}>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>Join unlimited games</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>In-app wallet</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>Game & profile ratings</div>
            </div>
            <a href="/login?role=player" style={{textAlign: 'center', padding: '12px 20px', border: '2px solid black', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px', position: 'relative', zIndex: 10, color: 'black', textDecoration: 'none'}}>Get Started</a>
          </div>
          <div className="reveal d2" style={{padding: '36px', display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', overflow: 'hidden', backgroundColor: 'black', color: 'var(--coral)'}}>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '16px', position: 'relative', zIndex: 10, color: 'rgba(200,255,62,.6)'}}>Pro</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '60px', fontWeight: 900, lineHeight: 'tight', marginBottom: '4px', position: 'relative', zIndex: 10, color: 'var(--coral)'}}>₹999</div>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', marginBottom: '24px', position: 'relative', zIndex: 10, color: 'rgba(200,255,62,.5)'}}>Per month</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '36px', fontWeight: 800, letterSpacing: '.04em', marginBottom: '20px', position: 'relative', zIndex: 10, color: 'var(--coral)'}}>Organiser</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative', zIndex: 10, marginBottom: '28px'}}>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(200,255,62,.7)'}}><span style={{color: 'rgba(200,255,62,.35)'}}>— </span>Unlimited games</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(200,255,62,.7)'}}><span style={{color: 'rgba(200,255,62,.35)'}}>— </span>Automated payments</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(200,255,62,.7)'}}><span style={{color: 'rgba(200,255,62,.35)'}}>— </span>Team distribution</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(200,255,62,.7)'}}><span style={{color: 'rgba(200,255,62,.35)'}}>— </span>Waitlist management</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(200,255,62,.7)'}}><span style={{color: 'rgba(200,255,62,.35)'}}>— </span>Earnings dashboard</div>
            </div>
            <a href="/login?role=player" style={{textAlign: 'center', padding: '12px 20px', border: '2px solid var(--coral)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px', position: 'relative', zIndex: 10, color: 'var(--coral)', textDecoration: 'none'}}>Join as Player</a>
          </div>
          <div className="reveal d3" style={{padding: '36px', display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--coral)', color: 'black'}}>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '16px', position: 'relative', zIndex: 10, color: 'rgba(0,0,0,.4)'}}>Custom</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '60px', fontWeight: 900, lineHeight: 'tight', marginBottom: '4px', position: 'relative', zIndex: 10, color: 'black'}}>Call</div>
            <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', marginBottom: '24px', position: 'relative', zIndex: 10, color: 'rgba(0,0,0,.4)'}}>For a quote</p>
            <div style={{fontFamily: 'var(--cond)', fontSize: '36px', fontWeight: 800, letterSpacing: '.04em', marginBottom: '20px', position: 'relative', zIndex: 10, color: 'black'}}>League</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, position: 'relative', zIndex: 10, marginBottom: '28px'}}>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>All Organiser features</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>League & tournament management</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>Custom branding</div>
              <div style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(0,0,0,.65)'}}><span style={{color: 'rgba(0,0,0,.35)'}}>— </span>Venue partnerships</div>
            </div>
            <a href="/contact" style={{textAlign: 'center', padding: '12px 20px', border: '2px solid black', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: '12px', position: 'relative', zIndex: 10, color: 'black', textDecoration: 'none'}}>Contact Sales</a>
          </div>
        </div>
      </div>
    </section>
  );
}
