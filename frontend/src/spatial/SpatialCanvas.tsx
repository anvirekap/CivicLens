import * as maplibregl from "maplibre-gl";
import type { Map, Marker } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useSpatialStore, type CivicIssue, type SpatialWidget } from "./spatialStore";

const DEFAULT_CENTER: [number, number] = [-75.6972, 45.4215];
const PRIORITY_COLORS: Record<string, string> = { High: "#ff777c", Medium: "#f6bd70", Low: "#58d7c0" };

function validIssues(issues: CivicIssue[]) {
  return issues.filter((issue) => Number.isFinite(issue.latitude) && Math.abs(issue.latitude) <= 85
    && Number.isFinite(issue.longitude) && Math.abs(issue.longitude) <= 180);
}

function frameIssues(map: Map, issues: CivicIssue[]) {
  const reports = validIssues(issues);
  if (!reports.length) {
    map.easeTo({ center: DEFAULT_CENTER, zoom: 12, pitch: 54, bearing: -18, duration: 900 });
    return;
  }
  const minLng = Math.min(...reports.map((issue) => issue.longitude));
  const maxLng = Math.max(...reports.map((issue) => issue.longitude));
  const minLat = Math.min(...reports.map((issue) => issue.latitude));
  const maxLat = Math.max(...reports.map((issue) => issue.latitude));
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  if (maxLng - minLng < 0.002 && maxLat - minLat < 0.002) {
    map.easeTo({ center, zoom: 16.5, pitch: 54, bearing: -18, duration: 1000 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);
  const compact = window.innerWidth < 700;
  map.fitBounds(bounds, {
    padding: compact ? { top: 185, right: 26, bottom: 138, left: 26 } : { top: 142, right: 115, bottom: 118, left: 290 },
    maxZoom: 16.5,
    pitch: 54,
    bearing: -18,
    duration: 1000,
  });
}

function createIssueMarker(issue: CivicIssue, onSelect: (id: number) => void) {
  const element = document.createElement("button");
  const priority = PRIORITY_COLORS[issue.priority] ? issue.priority : "Low";
  const urgency = Math.max(0, Math.min(issue.urgency_score || 0, 80));
  const height = 24 + (priority === "High" ? 18 : priority === "Medium" ? 9 : 0) + Math.round(urgency / 8);
  element.type = "button";
  element.className = `geo-issue-marker priority-${priority.toLowerCase()}`;
  element.style.setProperty("--beacon-height", `${height}px`);
  element.setAttribute("aria-label", `${issue.title}, ${priority} priority, ${issue.confirmations} confirmations`);

  const tooltip = document.createElement("span");
  tooltip.className = "geo-issue-tooltip";
  const label = document.createElement("span");
  label.textContent = `${priority} priority`;
  const title = document.createElement("strong");
  title.textContent = issue.title;
  const community = document.createElement("small");
  community.textContent = `${issue.confirmations} community confirmations`;
  tooltip.append(label, title, community);

  const pole = document.createElement("span");
  pole.className = "geo-beacon-pole";
  const head = document.createElement("span");
  head.className = "geo-beacon-head";
  const pulse = document.createElement("span");
  pulse.className = "geo-beacon-pulse";
  element.append(pole, head, pulse, tooltip);
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(issue.id);
  });

  return new maplibregl.Marker({ element, anchor: "bottom", pitchAlignment: "viewport", rotationAlignment: "viewport" })
    .setLngLat([issue.longitude, issue.latitude]);
}

function createWidgetMarker(widget: SpatialWidget) {
  const element = document.createElement("div");
  element.className = `geo-agent-widget widget-${widget.type}`;
  const label = document.createElement("span");
  label.textContent = `${widget.type} · civic insight`;
  const title = document.createElement("strong");
  title.textContent = widget.title;
  const detail = document.createElement("small");
  detail.textContent = widget.detail;
  element.append(label, title, detail);
  return new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([widget.coordinates[0], widget.coordinates[1]]);
}

export default function SpatialCanvas({ issues }: { issues: CivicIssue[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const selectedIssueId = useSpatialStore((state) => state.selectedIssueId);
  const widgets = useSpatialStore((state) => state.widgets);
  const focusIssue = useSpatialStore((state) => state.focusIssue);
  const themeColor = useSpatialStore((state) => state.themeColor);
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);

  useEffect(() => {
    containerRef.current?.style.setProperty("--spatial-theme", themeColor);
  }, [themeColor]);

  const goToIssue = useCallback((id: number) => {
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;
    focusIssue(id);
    mapRef.current?.easeTo({
      center: [issue.longitude, issue.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 16.7),
      pitch: 59,
      duration: 1100,
      essential: true,
    });
  }, [focusIssue, issues]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          openstreetmap: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
          },
        },
        layers: [{
          id: "openstreetmap-raster",
          type: "raster",
          source: "openstreetmap",
          paint: {
            "raster-opacity": 0.94,
            "raster-saturation": -0.62,
            "raster-contrast": 0.12,
            "raster-brightness-min": 0.035,
            "raster-brightness-max": 0.58,
          },
        }],
      },
      center: DEFAULT_CENTER,
      zoom: 12,
      pitch: 54,
      bearing: -18,
      maxPitch: 62,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: { compact: false },
      cooperativeGestures: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: true }), "top-right");
    mapRef.current = map;
    map.once("load", () => {
      setMapReady(true);
      frameIssues(map, issues);
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // The map instance is intentionally created once; subsequent data changes update markers and framing below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [
      ...validIssues(issues).map((issue) => createIssueMarker(issue, goToIssue).addTo(map)),
      ...widgets.filter((widget) => Math.abs(widget.coordinates[0]) <= 180 && Math.abs(widget.coordinates[1]) <= 85)
        .map((widget) => createWidgetMarker(widget).addTo(map)),
    ];
    if (!selectedIssueId) frameIssues(map, issues);
  }, [goToIssue, issues, mapReady, selectedIssueId, widgets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (selectedIssue) {
      map.easeTo({ center: [selectedIssue.longitude, selectedIssue.latitude], zoom: Math.max(map.getZoom(), 16.7), pitch: 59, duration: 950, essential: true });
    } else {
      frameIssues(map, issues);
    }
  }, [issues, mapReady, selectedIssue]);

  return <div ref={containerRef} className="spatial-canvas" aria-label="Interactive OpenStreetMap showing CivicLens community reports" role="application" />;
}
