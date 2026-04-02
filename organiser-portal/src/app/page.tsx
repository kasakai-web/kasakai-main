import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <div className="organiser-home">
      <nav className="nav-bar">
        <div className="nav-brand">Kasa Kai Organizer</div>
        <div className="nav-links">
          <Link href="/" className="nav-link active">Home</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
        </div>
      </nav>

      <main className="home-content">
        <div className="hero-section">
          <h1 className="hero-title">Welcome to Organizer Portal</h1>
          <p className="hero-subtitle">Manage your football events and track player registrations</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚽</div>
            <h3 className="feature-title">Create Games</h3>
            <p className="feature-description">
              Set up your football matches with custom parameters like venue, time, format, and fees
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3 className="feature-title">Track Players</h3>
            <p className="feature-description">
              See who registered for your games and manage player information in real-time
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3 className="feature-title">Payment Management</h3>
            <p className="feature-description">
              Monitor payment status and collect fees from registered players
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Analytics</h3>
            <p className="feature-description">
              View stats on games, players, and revenue to optimize your events
            </p>
          </div>
        </div>

        <div className="cta-section">
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard →
          </Link>
        </div>
      </main>
    </div>
  );
}

