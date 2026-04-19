export function Footer() {
  return (
    <footer style={{backgroundColor: 'black', borderTop: '1px solid #1e1e1e', padding: '48px 24px'}}>
      <div className="container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '40px', flexWrap: 'wrap', marginBottom: '48px'}}>
          <div>
            <h3 style={{fontFamily: 'var(--cond)', fontSize: '36px', fontWeight: 900, letterSpacing: '.1em', color: 'white', lineHeight: 'tight'}}>KASA<span style={{color: 'var(--muted)'}}>KAI</span></h3>
            <p style={{fontFamily: 'var(--mono)', fontSize: '10.5px', letterSpacing: '.14em', color: 'var(--muted)', marginTop: '8px'}}>Organised football. Every time.</p>
          </div>
          <div style={{display: 'flex', gap: '64px'}}>
            <div>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px'}}>Platform</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <a href="#features" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Features</a>
                <a href="#pricing" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Pricing</a>
                <a href="#roles" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>For Players</a>
                <a href="#roles" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>For Organisers</a>
              </div>
            </div>
            <div>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px'}}>Company</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <a href="/about" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>About Us</a>
                <a href="#" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Blog</a>
                <a href="#" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Careers</a>
                <a href="#" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Contact</a>
              </div>
            </div>
            <div>
              <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px'}}>Support</p>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <a href="#support" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>FAQ</a>
                <a href="#" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>Help Centre</a>
                <a href="#" style={{fontSize: '14px', color: 'rgba(255,255,255,.55)', textDecoration: 'none'}}>WhatsApp Us</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e1e1e', paddingTop: '24px', flexWrap: 'wrap', gap: '16px'}}>
          <p style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.12em', color: '#2a2a2a'}}>© 2025 Kasa Kai. All rights reserved.</p>
          <div style={{display: 'flex', gap: '20px'}}>
            <a href="#" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', color: '#333', textDecoration: 'none'}}>Privacy Policy</a>
            <a href="#" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', color: '#333', textDecoration: 'none'}}>Terms of Service</a>
            <a href="#" style={{fontFamily: 'var(--mono)', fontSize: '12px', letterSpacing: '.1em', color: '#333', textDecoration: 'none'}}>Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
