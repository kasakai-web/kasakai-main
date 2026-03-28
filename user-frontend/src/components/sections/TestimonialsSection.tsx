export function TestimonialsSection() {
  return (
    <section id="support" style={{position: 'relative', backgroundColor: '#0c0c14', padding: '96px 24px', overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) translateY(-50%)', width: '384px', height: '384px', borderRadius: '9999px', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(139,92,246,.12) 0%, transparent 70%)'}}/>
      <div className="container" style={{position: 'relative', zIndex: 10}}>
        <p className="reveal" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.24em', textTransform: 'uppercase', marginBottom: '14px', color: 'rgba(139,92,246,.6)'}}>From the community</p>
        <h2 className="reveal d1" style={{fontFamily: 'var(--cond)', fontWeight: 900, fontSize: 'clamp(48px, 7vw, 72px)', letterSpacing: '.01em', lineHeight: .92, color: 'white', marginBottom: '48px'}}>Real people.<br/>Real games.</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.06)'}}>
          <div className="reveal" style={{backgroundColor: '#0c0c14', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden'}}>
            <blockquote style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(255,255,255,.75)', flex: 1}}><span style={{fontSize: '36px', color: 'rgba(128,0,128,.3)', display: 'block', marginBottom: '-8px'}}>“</span>The app is a lifesaver. I used to spend hours on WhatsApp coordinating games. Now it’s just a few taps and I’m done.</blockquote>
            <div style={{borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px'}}>
              <p style={{fontFamily: 'var(--cond)', fontSize: '18px', fontWeight: 700, letterSpacing: '.04em', color: 'white'}}>Rohan Desai</p>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(139,92,246,.7)'}}>Organiser · Mumbai</p>
            </div>
          </div>
          <div className="reveal" style={{backgroundColor: '#0c0c14', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden'}}>
            <blockquote style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(255,255,255,.75)', flex: 1}}><span style={{fontSize: '36px', color: 'rgba(128,0,128,.3)', display: 'block', marginBottom: '-8px'}}>“</span>Finally, an easy way to find pickup football games. The quality of games is consistently high, and I’ve met some great people.</blockquote>
            <div style={{borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px'}}>
              <p style={{fontFamily: 'var(--cond)', fontSize: '18px', fontWeight: 700, letterSpacing: '.04em', color: 'white'}}>Aisha Khan</p>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(139,92,246,.7)'}}>Player · Bangalore</p>
            </div>
          </div>
          <div className="reveal" style={{backgroundColor: '#0c0c14', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden'}}>
            <blockquote style={{fontSize: '14px', lineHeight: 'relaxed', color: 'rgba(255,255,255,.75)', flex: 1}}><span style={{fontSize: '36px', color: 'rgba(128,0,128,.3)', display: 'block', marginBottom: '-8px'}}>“</span>As a college student, finding affordable and regular games was tough. KasaKai changed that. The student discounts are a huge plus.</blockquote>
            <div style={{borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px'}}>
              <p style={{fontFamily: 'var(--cond)', fontSize: '18px', fontWeight: 700, letterSpacing: '.04em', color: 'white'}}>Vikram Singh</p>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(139,92,246,.7)'}}>Player · Delhi</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
