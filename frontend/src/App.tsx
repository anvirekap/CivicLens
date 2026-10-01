import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./App.css";
import "./report.css";
import "./confirm.css";

import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Crosshair,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

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

type ReportStep = "details" | "map" | "review";

type SelectedLocation = {
  latitude: number;
  longitude: number;
};

type Classification = {
  category: string;
  priority: string;
};

const API_URL = "http://127.0.0.1:8002";

const issueIcon = L.divIcon({
  className: "civic-marker",
  html: `<div class="civic-marker-inner"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const selectedIcon = L.divIcon({
  className: "selected-civic-marker",
  html: `<div class="selected-marker-inner"></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function LocationPicker({
  selectedLocation,
  onSelect,
}: {
  selectedLocation: SelectedLocation | null;
  onSelect: (location: SelectedLocation) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  if (!selectedLocation) {
    return null;
  }

  return (
    <Marker
      position={[
        selectedLocation.latitude,
        selectedLocation.longitude,
      ]}
      icon={selectedIcon}
    >
      <Popup>New report location</Popup>
    </Marker>
  );
}

function MapInstance({ onReady }: { onReady: (map: L.Map | null) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
    return () => onReady(null);
  }, [map, onReady]);

  return null;
}

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<
    "Overview" | "Map" | "Community"
  >("Overview");
  const [selectedPriorities, setSelectedPriorities] = useState<
    Array<"High" | "Medium" | "Low">
  >([]);
  const [confirmedIssueIds, setConfirmedIssueIds] = useState<number[]>(() => {
    try {
      const stored = sessionStorage.getItem("civiclens-confirmed-issues");
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.filter((issueId): issueId is number => Number.isInteger(issueId))
        : [];
    } catch {
      return [];
    }
  });
  const [confirmingIssueId, setConfirmingIssueId] = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const mapRef = useRef<L.Map | null>(null);
  const [mapExploreMessage, setMapExploreMessage] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportStep, setReportStep] =
    useState<ReportStep>("details");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  const [classification, setClassification] =
    useState<Classification | null>(null);

  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      const response = await fetch(`${API_URL}/issues`);

      if (!response.ok) {
        throw new Error("Could not load issues.");
      }

      const data = await response.json();

      setIssues(data);
    } catch (error) {
      console.error("Failed to load issues:", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmIssue(issueId: number) {
    if (confirmedIssueIds.includes(issueId) || confirmingIssueId !== null) {
      return;
    }

    setConfirmingIssueId(issueId);
    setConfirmError("");

    try {
      const response = await fetch(`${API_URL}/issues/${issueId}/confirm`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Could not confirm this issue.");
      }

      const nextConfirmedIds = [...confirmedIssueIds, issueId];
      setConfirmedIssueIds(nextConfirmedIds);
      try {
        sessionStorage.setItem(
          "civiclens-confirmed-issues",
          JSON.stringify(nextConfirmedIds),
        );
      } catch (storageError) {
        console.warn("Could not save this confirmation for the session:", storageError);
      }

      await loadIssues();
    } catch (error) {
      console.error("Failed to confirm issue:", error);
      setConfirmError("Confirmation failed. Please try again.");
    } finally {
      setConfirmingIssueId(null);
    }
  }

  function navigateTo(section: "Overview" | "Map" | "Community") {
    setActiveNav(section);
    if (section === "Overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    document
      .getElementById(section === "Map" ? "community-map" : "community-feed")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const setMapInstance = useCallback((map: L.Map | null) => {
    mapRef.current = map;
  }, []);

  function exploreIssues() {
    if (issues.length === 0) {
      setMapExploreMessage("No reports to explore yet.");
      return;
    }

    const map = mapRef.current;
    if (!map) {
      setMapExploreMessage("The map is still loading. Try again in a moment.");
      return;
    }

    const bounds = L.latLngBounds(
      issues.map((issue) => [issue.latitude, issue.longitude] as [number, number]),
    );
    map.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 15,
      animate: true,
      duration: 0.8,
    });
    setMapExploreMessage(`Showing all ${issues.length} ${issues.length === 1 ? "report" : "reports"}.`);
  }

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

  const visibleIssues = useMemo(
    () => selectedPriorities.length === 0
      ? issues
      : issues.filter((issue) => selectedPriorities.includes(issue.priority as "High" | "Medium" | "Low")),
    [issues, selectedPriorities],
  );

  function togglePriority(priority: "High" | "Medium" | "Low") {
    setSelectedPriorities((current) => current.includes(priority)
      ? current.filter((selected) => selected !== priority)
      : [...current, priority]);
  }

  const mapCenter: [number, number] =
    issues.length > 0
      ? [issues[0].latitude, issues[0].longitude]
      : [0, 0];

  function resetReport() {
    setReportStep("details");
    setTitle("");
    setDescription("");
    setLocation("");
    setSelectedLocation(null);
    setClassification(null);
    setClassifying(false);
    setSubmitting(false);
    setFormError("");
  }

  function openReport() {
    resetReport();
    setReportOpen(true);
  }

  function closeReport() {
    setReportOpen(false);

    setTimeout(() => {
      resetReport();
    }, 200);
  }

  function continueToMap() {
    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim()
    ) {
      setFormError(
        "Please complete the title, description, and location."
      );
      return;
    }

    setFormError("");
    setReportStep("map");
  }

  async function reviewReport() {
    if (!selectedLocation) {
      return;
    }

    setClassifying(true);
    setFormError("");

    try {
      const response = await fetch(`${API_URL}/classify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Classification failed.");
      }

      const data: Classification = await response.json();

      setClassification(data);
      setReportStep("review");
    } catch (error) {
      console.error("Classification failed:", error);

      setFormError(
        "CivicLens could not classify this report. Please try again."
      );
    } finally {
      setClassifying(false);
    }
  }

  async function submitReport() {
    if (!selectedLocation) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(`${API_URL}/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error("Report submission failed.");
      }

      await loadIssues();

      closeReport();
    } catch (error) {
      console.error("Report submission failed:", error);

      setFormError(
        "Your report could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
          <button
            className={`nav-link ${activeNav === "Overview" ? "active" : ""}`}
            onClick={() => navigateTo("Overview")}
            aria-current={activeNav === "Overview" ? "page" : undefined}
          >
            Overview
          </button>

          <button
            className={`nav-link ${activeNav === "Map" ? "active" : ""}`}
            onClick={() => navigateTo("Map")}
            aria-current={activeNav === "Map" ? "page" : undefined}
          >
            Map
          </button>

          <button
            className={`nav-link ${activeNav === "Community" ? "active" : ""}`}
            onClick={() => navigateTo("Community")}
            aria-current={activeNav === "Community" ? "page" : undefined}
          >
            Community
          </button>
        </div>

        <button
          className="report-button"
          onClick={openReport}
        >
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
            CivicLens turns local reports into a clear,
            prioritized view of the issues that matter most.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.55,
            delay: 0.1,
          }}
          className="hero-action-card"
        >
          <div className="hero-city-scene" aria-hidden="true">
            <div className="city-scene-heading">
              <span><i /> LIVE CITY SIGNAL</span>
              <strong>01 <small>/ 04</small></strong>
            </div>
            <div className="city-world">
              <div className="city-base">
                <div className="city-road city-road-one" />
                <div className="city-road city-road-two" />
                <div className="city-road city-road-three" />
                <div className="city-building building-one" />
                <div className="city-building building-two" />
                <div className="city-building building-three" />
                <div className="city-building building-four" />
                <div className="city-park" />
                <div className="city-pin city-pin-high"><b>!</b><i /></div>
                <div className="city-pin city-pin-community"><b>3</b><i /></div>
              </div>
            </div>
            <div className="city-scene-caption">
              <span>COMMUNITY OVERVIEW</span>
              <strong><i /> LIVE</strong>
            </div>
          </div>

          <div className="action-icon">
            <CircleAlert size={22} />
          </div>

          <div>
            <span className="small-label">
              NOTICE SOMETHING?
            </span>

            <h3>Make your community visible.</h3>

            <p>
              Report a local problem and CivicLens will
              automatically categorize and prioritize it.
            </p>
          </div>

          <button onClick={openReport}>
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
        <div className="map-panel" id="community-map">
          <div className="panel-header">
            <div>
              <span className="section-label">
                LIVE MAP
              </span>

              <h2>Community overview</h2>
            </div>

            <button className="filter-button" onClick={exploreIssues}>
              <Search size={16} />
              Explore
            </button>
          </div>

          <div className="real-map">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom
              className="leaflet-map"
            >
              <MapInstance onReady={setMapInstance} />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {issues.map((issue) => (
                <Marker
                  key={issue.id}
                  position={[
                    issue.latitude,
                    issue.longitude,
                  ]}
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
            {mapExploreMessage && (
              <div className="map-explore-message" role="status" aria-live="polite">
                {mapExploreMessage}
              </div>
            )}
          </div>
        </div>

        <div className="issues-panel" id="community-feed">
          <div className="panel-header">
            <div>
              <span className="section-label">
                PRIORITY FEED
              </span>

              <h2>Needs attention</h2>
            </div>

            <span className="issue-count">
              {visibleIssues.length}
            </span>
          </div>

          <div className="priority-filter-bar" role="group" aria-label="Filter issue feed by priority">
            <span className="priority-filter-label">PRIORITY</span>
            {(["High", "Medium", "Low"] as const).map((priority) => (
              <button
                key={priority}
                type="button"
                className={`priority-filter-chip priority-filter-${priority.toLowerCase()} ${selectedPriorities.includes(priority) ? "selected" : ""}`}
                aria-pressed={selectedPriorities.includes(priority)}
                onClick={() => togglePriority(priority)}
              >
                {priority}
              </button>
            ))}
            <button
              type="button"
              className="clear-priority-filters"
              onClick={() => setSelectedPriorities([])}
              disabled={selectedPriorities.length === 0}
            >
              <X size={13} />
              Clear filters
            </button>
          </div>

          <div className="issue-list">
            {loading && (
              <p className="empty-message">
                Loading reports...
              </p>
            )}

            {!loading && issues.length === 0 && (
              <p className="empty-message">
                No reports yet.
              </p>
            )}

            {!loading && issues.length > 0 && visibleIssues.length === 0 && (
              <p className="empty-message">
                No reports match these priorities.
              </p>
            )}

            {confirmError && (
              <div className="confirm-error" role="alert">
                <CircleAlert size={15} />
                {confirmError}
              </div>
            )}

            {visibleIssues.slice(0, 4).map((issue, index) => (
              <motion.article
                key={issue.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.15 + index * 0.08,
                }}
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
                  <div className="issue-footer-labels">
                    <span>{issue.category}</span>
                    <span>{issue.status}</span>
                  </div>
                  <button
                    type="button"
                    className={`confirm-issue-button ${confirmedIssueIds.includes(issue.id) ? "confirmed" : ""}`}
                    onClick={() => confirmIssue(issue.id)}
                    disabled={confirmedIssueIds.includes(issue.id) || confirmingIssueId !== null}
                  >
                    {confirmingIssueId === issue.id ? (
                      <><LoaderCircle size={14} className="spin" />Confirming...</>
                    ) : confirmedIssueIds.includes(issue.id) ? (
                      <><CheckCircle2 size={14} />Confirmed ✓</>
                    ) : (
                      <><Users size={14} />Confirm issue</>
                    )}
                  </button>
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

      {reportOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={closeReport}
        >
          <motion.div
            className={`report-modal ${
              reportStep !== "details"
                ? "report-modal-map"
                : ""
            }`}
            initial={{
              opacity: 0,
              y: 30,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{ duration: 0.25 }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {reportStep === "details" && (
              <>
                <div className="report-modal-header">
                  <div>
                    <span className="section-label">
                      NEW COMMUNITY REPORT
                    </span>

                    <h2>What needs attention?</h2>
                  </div>

                  <button
                    className="close-button"
                    onClick={closeReport}
                  >
                    ×
                  </button>
                </div>

                <p className="report-intro">
                  Describe the issue you noticed.
                  CivicLens will categorize and prioritize
                  the report automatically.
                </p>

                <div className="report-field">
                  <label>Issue title</label>

                  <input
                    type="text"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="e.g. Broken streetlight near park"
                  />
                </div>

                <div className="report-field">
                  <label>Description</label>

                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Tell us what is happening and why it matters..."
                  />
                </div>

                <div className="report-field">
                  <label>Location</label>

                  <input
                    type="text"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                    placeholder="e.g. Main Street & King Avenue"
                  />
                </div>

                {formError && (
                  <div className="form-error">
                    <CircleAlert size={16} />
                    {formError}
                  </div>
                )}

                <div className="location-preview">
                  <MapPin size={18} />

                  <div>
                    <strong>Map location</strong>

                    <span>
                      You'll select the exact location next.
                    </span>
                  </div>
                </div>

                <button
                  className="continue-report-button"
                  onClick={continueToMap}
                >
                  Continue to map
                  <ArrowUpRight size={17} />
                </button>
              </>
            )}

            {reportStep === "map" && (
              <>
                <div className="report-modal-header">
                  <div>
                    <span className="section-label">
                      STEP 2
                    </span>

                    <h2>Pin the exact location</h2>
                  </div>

                  <button
                    className="close-button"
                    onClick={closeReport}
                  >
                    ×
                  </button>
                </div>

                <p className="report-intro">
                  Click anywhere on the map to place the
                  report marker.
                </p>

                <div className="picker-status">
                  <Crosshair size={17} />

                  {selectedLocation
                    ? "Location selected"
                    : "Waiting for a map location"}
                </div>

                <div className="report-picker-map">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    scrollWheelZoom
                    className="leaflet-map"
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {issues.map((issue) => (
                      <Marker
                        key={issue.id}
                        position={[
                          issue.latitude,
                          issue.longitude,
                        ]}
                        icon={issueIcon}
                      />
                    ))}

                    <LocationPicker
                      selectedLocation={selectedLocation}
                      onSelect={setSelectedLocation}
                    />
                  </MapContainer>
                </div>

                {selectedLocation && (
                  <div className="coordinate-preview">
                    <span>
                      Latitude
                      <strong>
                        {selectedLocation.latitude.toFixed(5)}
                      </strong>
                    </span>

                    <span>
                      Longitude
                      <strong>
                        {selectedLocation.longitude.toFixed(5)}
                      </strong>
                    </span>
                  </div>
                )}

                {formError && (
                  <div className="form-error">
                    <CircleAlert size={16} />
                    {formError}
                  </div>
                )}

                <div className="report-map-actions">
                  <button
                    className="back-button"
                    onClick={() =>
                      setReportStep("details")
                    }
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    className="continue-report-button"
                    disabled={
                      !selectedLocation || classifying
                    }
                    onClick={reviewReport}
                  >
                    {classifying ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="spin"
                        />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Review report
                        <ArrowUpRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {reportStep === "review" && classification && (
              <>
                <div className="report-modal-header">
                  <div>
                    <span className="section-label">
                      FINAL REVIEW
                    </span>

                    <h2>Ready to report</h2>
                  </div>

                  <button
                    className="close-button"
                    onClick={closeReport}
                  >
                    ×
                  </button>
                </div>

                <p className="report-intro">
                  CivicLens analyzed your report and
                  prepared it for the community feed.
                </p>

                <div className="analysis-banner">
                  <div className="analysis-icon">
                    <Sparkles size={20} />
                  </div>

                  <div>
                    <span>
                      AUTOMATIC CLASSIFICATION
                    </span>

                    <strong>
                      Report analyzed successfully
                    </strong>
                  </div>

                  <Check size={19} />
                </div>

                <div className="review-report-card">
                  <span className="section-label">
                    REPORT
                  </span>

                  <h3>{title}</h3>

                  <p>{description}</p>

                  <div className="review-location">
                    <MapPin size={15} />
                    {location}
                  </div>
                </div>

                <div className="classification-grid">
                  <div className="classification-card">
                    <span>Category</span>

                    <strong>
                      {classification.category}
                    </strong>
                  </div>

                  <div className="classification-card">
                    <span>Priority</span>

                    <strong
                      className={`review-priority review-priority-${classification.priority.toLowerCase()}`}
                    >
                      {classification.priority}
                    </strong>
                  </div>
                </div>

                <div className="coordinate-preview">
                  <span>
                    Latitude
                    <strong>
                      {selectedLocation?.latitude.toFixed(5)}
                    </strong>
                  </span>

                  <span>
                    Longitude
                    <strong>
                      {selectedLocation?.longitude.toFixed(5)}
                    </strong>
                  </span>
                </div>

                {formError && (
                  <div className="form-error">
                    <CircleAlert size={16} />
                    {formError}
                  </div>
                )}

                <div className="report-map-actions">
                  <button
                    className="back-button"
                    onClick={() =>
                      setReportStep("map")
                    }
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>

                  <button
                    className="continue-report-button"
                    onClick={submitReport}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="spin"
                        />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        Publish report
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
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
