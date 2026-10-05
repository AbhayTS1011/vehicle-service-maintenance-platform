// =====================================================================
// Homepage - Vehicle Service & Maintenance Platform
// =====================================================================

export default function Home() {
  return (
    <main className="main-hero">
      <div className="hero-container">
        <span className="badge">
          Apex Auto Care Platform
        </span>
        <h1>
          Vehicle Service & Maintenance
        </h1>
        <p className="subtitle">
          A production-quality, SQL-first database-driven platform for vehicle service booking, fleet management, mechanic assignment, and automated lifecycle tracking.
        </p>

        <div className="cards-grid">
          <div className="card">
            <h3>Customers & Fleet</h3>
            <p>Manage multiple vehicles, book appointments, and track complete service history.</p>
          </div>
          <div className="card">
            <h3>Service Providers</h3>
            <p>Assign mechanics with concurrency controls, update service status, and manage parts inventory.</p>
          </div>
          <div className="card">
            <h3>Advanced DBMS</h3>
            <p>Built on PostgreSQL with 3NF normalization, triggers, stored functions, views, and CTE analytics.</p>
          </div>
        </div>

        <div>
          <div className="status-footer">
            <span className="dot"></span>
            Phase 1: Foundation & Infrastructure Initialized Successfully
          </div>
        </div>
      </div>
    </main>
  )
}
