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
          A SQL-first project prototype for exploring a single service center&apos;s booking and service workflow.
        </p>

        <div className="cards-grid">
          <div className="card">
            <h3>Customers & Fleet</h3>
            <p>Explore the planned customer vehicle and booking workflows. Persisted sign-in and vehicle management are still in progress.</p>
          </div>
          <div className="card">
            <h3>Service Providers</h3>
            <p>Review the implemented booking, mechanic assignment, service, and inventory workflows.</p>
          </div>
          <div className="card">
            <h3>Advanced DBMS</h3>
            <p>Built on PostgreSQL with 3NF normalization, triggers, stored functions, views, and CTE analytics.</p>
          </div>
        </div>

        <div>
          <div className="status-footer">
            <span className="dot"></span>
            Development project · not production-ready
          </div>
        </div>
      </div>
    </main>
  )
}
