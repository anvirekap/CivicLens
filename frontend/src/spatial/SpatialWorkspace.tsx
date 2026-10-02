import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, LocateFixed, MapPin, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import SpatialCanvas from "./SpatialCanvas";
import { attachAgentCommandBridge, useSpatialStore, type CivicIssue } from "./spatialStore";
import "./spatial.css";

const priorityTone: Record<string, string> = { High: "high", Medium: "medium", Low: "low" };

export default function SpatialWorkspace({ issues, onExit }: { issues: CivicIssue[]; onExit: () => void }) {
  const selectedIssueId = useSpatialStore((state) => state.selectedIssueId);
  const clearFocus = useSpatialStore((state) => state.clearFocus);
  const setIssues = useSpatialStore((state) => state.setIssues);
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);

  useEffect(() => { setIssues(issues); }, [issues, setIssues]);
  useEffect(() => attachAgentCommandBridge(), []);

  return (
    <main className="spatial-shell tw:fixed tw:inset-0 tw:z-[10000] tw:overflow-hidden tw:bg-slate-950 tw:text-slate-100">
      <SpatialCanvas issues={issues} />

      <header className="city-topbar">
        <div className="city-brand-mark" aria-hidden="true"><MapPin size={17} /></div>
        <div className="city-brand-copy"><strong>CivicLens <span>/</span> Spatial Intelligence</strong><small>Community Digital Twin</small></div>
        <div className="city-live"><i /> LIVE COMMUNITY DATA</div>
        <button className="city-back-button" onClick={onExit}><ArrowLeft size={15} /> Back to CivicLens</button>
      </header>

      <section className="city-context" aria-label="About this visualization">
        <span>COMMUNITY DIGITAL TWIN</span>
        <h1>Live reports mapped by urgency</h1>
        <p>Explore real locations across the community</p>
        <div className="city-context-count"><strong>{issues.length.toString().padStart(2, "0")}</strong><span>community reports</span></div>
      </section>

      <div className="city-instruction"><LocateFixed size={14} /><span>Select a beacon to explore a report</span></div>

      <div className="city-legend" aria-label="Priority legend">
        <span className="city-legend-title">PRIORITY</span>
        {["High", "Medium", "Low"].map((priority) => <span className="city-legend-item" key={priority}><i className={`priority-${priorityTone[priority]}`} />{priority}</span>)}
      </div>

      <AnimatePresence>
        {selectedIssue && <motion.aside
          className="city-issue-panel"
          initial={{ opacity: 0, x: 28, y: 8, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: 22, filter: "blur(6px)" }}
          transition={{ duration: 0.38, ease: [0.2, 0.75, 0.25, 1] }}
          aria-label="Selected issue details"
        >
          <div className="city-panel-heading">
            <span className={`city-priority-badge priority-${priorityTone[selectedIssue.priority] ?? "low"}`}><i />{selectedIssue.priority} priority</span>
            <button aria-label="Close report details" onClick={clearFocus}><X size={16} /></button>
          </div>
          <h2>{selectedIssue.title}</h2>
          <p className="city-panel-category">{selectedIssue.category}</p>
          <p className="city-panel-description">{selectedIssue.description || "No additional description was provided."}</p>
          <div className="city-panel-location"><MapPin size={14} /><span>{selectedIssue.location}</span></div>
          <div className="city-panel-metrics">
            <div><span>URGENCY SCORE</span><strong>{selectedIssue.urgency_score}</strong></div>
            <div><span>CONFIRMATIONS</span><strong>{selectedIssue.confirmations}</strong></div>
          </div>
          <div className="city-panel-footer"><span>Status</span><strong>{selectedIssue.status}</strong></div>
          <button className="city-overview-button" onClick={clearFocus}><RotateCcw size={14} /> Return to city overview</button>
        </motion.aside>}
      </AnimatePresence>

      {issues.length === 0 && <div className="city-empty-state"><strong>No reports to map yet</strong><span>Community reports will appear here as soon as they are submitted.</span></div>}

      <div className="city-camera-hint">DRAG TO ORBIT <i /> SCROLL TO ZOOM</div>
    </main>
  );
}
