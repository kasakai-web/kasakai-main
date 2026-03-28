export function FAQSection() {
  return (
    <section id="support" style={{backgroundColor: 'black', padding: '96px 24px'}}>
      <div className="container">
        <p className="reveal" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px'}}>Got questions?</p>
        <h2 className="reveal d1" style={{fontFamily: 'var(--cond)', fontWeight: 900, fontSize: 'clamp(48px, 7vw, 72px)', letterSpacing: '.01em', lineHeight: .92, color: 'white', marginBottom: '48px'}}>FAQ</h2>
        <div className="reveal d2" style={{display: 'flex', flexDirection: 'column', border: '1px solid #1e1e1e'}}>
          <div className="faq-item">
            <button className="faq-question" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px', textAlign: 'left', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer'}}>
              <h3 style={{fontFamily: 'var(--cond)', fontSize: '20px', fontWeight: 700, letterSpacing: '.03em'}}>How do I join a game?</h3>
              <div className="faq-icon" style={{width: '28px', height: '28px', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', fontFamily: 'var(--body)', fontSize: '16px', color: 'var(--muted)'}}>+</div>
            </button>
            <div className="faq-answer" style={{maxHeight: 0, overflow: 'hidden', transition: 'max-height .3s ease-out'}}>
              <div style={{padding: '0 24px 24px', fontSize: '14px', color: 'var(--muted)', lineHeight: 'relaxed'}}>Simply browse for games in your area on the app, select one that fits your schedule, and pay the entry fee through our secure wallet. Your spot is confirmed instantly.</div>
            </div>
          </div>
          <div className="faq-item">
            <button className="faq-question" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px', textAlign: 'left', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer'}}>
              <h3 style={{fontFamily: 'var(--cond)', fontSize: '20px', fontWeight: 700, letterSpacing: '.03em'}}>What if I need to cancel?</h3>
              <div className="faq-icon" style={{width: '28px', height: '28px', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', fontFamily: 'var(--body)', fontSize: '16px', color: 'var(--muted)'}}>+</div>
            </button>
            <div className="faq-answer" style={{maxHeight: 0, overflow: 'hidden', transition: 'max-height .3s ease-out'}}>
              <div style={{padding: '0 24px 24px', fontSize: '14px', color: 'var(--muted)', lineHeight: 'relaxed'}}>Our cancellation policy is flexible. You can cancel up to 24 hours before the game for a full refund to your in-app wallet. Cancellations within 24 hours are non-refundable unless your spot is filled by someone from the waitlist.</div>
            </div>
          </div>
          <div className="faq-item">
            <button className="faq-question" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px', textAlign: 'left', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer'}}>
              <h3 style={{fontFamily: 'var(--cond)', fontSize: '20px', fontWeight: 700, letterSpacing: '.03em'}}>How does team balancing work?</h3>
              <div className="faq-icon" style={{width: '28px', height: '28px', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', fontFamily: 'var(--body)', fontSize: '16px', color: 'var(--muted)'}}>+</div>
            </button>
            <div className="faq-answer" style={{maxHeight: 0, overflow: 'hidden', transition: 'max-height .3s ease-out'}}>
              <div style={{padding: '0 24px 24px', fontSize: '14px', color: 'var(--muted)', lineHeight: 'relaxed'}}>Organisers can use our auto-balance feature which distributes players based on their self-assessed skill level and preferred positions to create fair and competitive teams. They can also manually adjust teams before the game starts.</div>
            </div>
          </div>
          <div className="faq-item">
            <button className="faq-question" style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '24px', textAlign: 'left', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer'}}>
              <h3 style={{fontFamily: 'var(--cond)', fontSize: '20px', fontWeight: 700, letterSpacing: '.03em'}}>Is KasaKai available in my city?</h3>
              <div className="faq-icon" style={{width: '28px', height: '28px', border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', fontFamily: 'var(--body)', fontSize: '16px', color: 'var(--muted)'}}>+</div>
            </button>
            <div className="faq-answer" style={{maxHeight: 0, overflow: 'hidden', transition: 'max-height .3s ease-out'}}>
              <div style={{padding: '0 24px 24px', fontSize: '14px', color: 'var(--muted)', lineHeight: 'relaxed'}}>We are rapidly expanding! Currently, we are live in Mumbai, Delhi, Bangalore, and Pune. Download the app and enter your location to see games near you or to be notified when we launch in your city.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
