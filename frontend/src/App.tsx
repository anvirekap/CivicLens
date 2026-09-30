import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import "./App.css";

import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Map,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type Issue = {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  priority: string;
  confirmations: number;
  status: string;
  urgency_score: number;
};

const issueIcon = L.divIcon({
  className: "civic-marker",
  html: `<div class="civic-marker-inner"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8002/issues")
      .then((response) => response.json())
      .then((data) => {
        setIssues(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load issues:", error);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    const highPriority = issues.filter(
      (issue) => issue.priority === "High"
    ).length;

    const resolved = issues.filter(
      (issue) => issue.status === "Resolved"
    ).length;

    const confirmations = issues.reduce(
      (total, issue) => total + issue.confirmations,
      0
    );

    return {
      total: issues.length,
      highPriority,
      resolved,
      confirmations,
    };
  }, [issues]);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <MapPin size={19} strokeWidth={2.4} />
          </div>

          <span>CivicLens</span>
        </div>

        <div className="nav-links">
          <button className="nav-link active">Overview</button>
          <button className="nav-link">Map</button>
          <button className="nav-link">Community</button>
        </div>

        <button className="report-button">
          <Plus size={17} />
          Report an issue
        </button>
      </nav>

      <section className="hero-section">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="hero-copy"
        >
          <div className="eyebrow">
            <span className="live-dot" />
            Community intelligence, live
          </div>

          <h1>
            See what your
            <br />
            community <span>needs.</span>
          </h1>

          <p>
            CivicLens turns local reports into a clear, prioritized view of
            the issues that matter most.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="hero-action-card"
        >
          <div className="action-icon">
            <CircleAlert size={22} />
          </div>

          <div>
            <span className="small-label">NOTICE SOMETHING?</span>
            <h3>Make your community visible.</h3>
            <p>
              Report a local problem and CivicLens will automatically
              categorize and prioritize it.
            </p>
          </div>

          <button>
            Create report
            <ArrowUpRight size={17} />
          </button>
        </motion.div>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={<MapPin size={19} />}
          label="Active reports"
          value={stats.total}
        />

        <StatCard
          icon={<CircleAlert size={19} />}
          label="High priority"
          value={stats.highPriority}
        />

        <StatCard
          icon={<Users size={19} />}
          label="Confirmations"
          value={stats.confirmations}
        />

        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Resolved"
          value={stats.resolved}
        />
      </section>

      <section className="workspace">
        <div className="map-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">LIVE MAP</span>
              <h2>Community overview</h2>
            </div>

            <button className="filter-button">
              <Search size={16} />
              Explore
            </button>
          </div>

          <div className="real-map">
  <MapContainer
    center={[45.4215, -75.6972]}
    zoom={13}
    scrollWheelZoom={true}
    className="leaflet-map"
  >
    <TileLayer
  attribution='&copy; OpenStreetMap contributors'
  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

    {issues.map((issue) => (
      <Marker
        key={issue.id}
        position={[issue.latitude, issue.longitude]}
        icon={issueIcon}
      >
        <Popup>
          <div className="map-popup">
            <strong>{issue.title}</strong>
            <span>{issue.category}</span>
            <p>{issue.description}</p>
            <b>{issue.priority} priority</b>
          </div>
        </Popup>
      </Marker>
    ))}
  </MapContainer>
</div>
        </div>

        <div className="issues-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">PRIORITY FEED</span>
              <h2>Needs attention</h2>
            </div>

            <span className="issue-count">{issues.length}</span>
          </div>

          <div className="issue-list">
            {loading && <p className="empty-message">Loading reports...</p>}

            {!loading && issues.length === 0 && (
              <p className="empty-message">No reports yet.</p>
            )}

            {issues.slice(0, 4).map((issue, index) => (
              <motion.article
                key={issue.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.08 }}
                className="issue-card"
              >
                <div className="issue-top">
                  <span
                    className={`priority priority-${issue.priority.toLowerCase()}`}
                  >
                    {issue.priority}
                  </span>

                  <span className="urgency">
                    Score {issue.urgency_score}
                  </span>
                </div>

                <h3>{issue.title}</h3>
                <p>{issue.description}</p>

                <div className="issue-meta">
                  <span>
                    <MapPin size={14} />
                    {issue.location}
                  </span>

                  <span>
                    <Users size={14} />
                    {issue.confirmations}
                  </span>
                </div>

                <div className="issue-footer">
                  <span>{issue.category}</span>
                  <span>{issue.status}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <ShieldCheck size={17} />
          CivicLens
        </div>

        <span>Built for stronger communities.</span>
      </footer>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="stat-card"
    >
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </motion.div>
  );
}

export default App;