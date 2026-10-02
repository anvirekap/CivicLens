import { create } from "zustand";

export type CivicIssue = {
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

export type Vec3 = [number, number, number];
export type SpatialWidgetType = "metric" | "note" | "chart";
export type SpatialWidget = { id: string; type: SpatialWidgetType; coordinates: Vec3; title: string; detail: string };
export type AgentCommand =
  | { type: "focusOnIssue"; id: number }
  | { type: "focusOnNode"; id: string }
  | { type: "changeTheme"; color: string }
  | { type: "spawnWidget"; widgetType: SpatialWidgetType; coordinates: Vec3; title?: string; detail?: string };

export type AgentCommandBridge = {
  focusOnIssue: (id: number) => boolean;
  focusOnNode: (id: string) => boolean;
  changeTheme: (color: string) => boolean;
  spawnWidget: (type: SpatialWidgetType, coordinates: Vec3) => string;
  dispatch: (command: AgentCommand) => void;
  getState: () => { selectedIssueId: number | null; themeColor: string; widgets: SpatialWidget[] };
};

declare global {
  interface Window { civicScene?: AgentCommandBridge }
}

type SpatialState = {
  selectedIssueId: number | null;
  themeColor: string;
  issues: CivicIssue[];
  widgets: SpatialWidget[];
  focusIssue: (id: number) => boolean;
  clearFocus: () => void;
  setIssues: (issues: CivicIssue[]) => void;
  spawnWidget: (type: SpatialWidgetType, coordinates: Vec3, copy?: { title?: string; detail?: string }) => string;
  focusOnNode: (id: string) => boolean;
  changeTheme: (color: string) => boolean;
};

export const useSpatialStore = create<SpatialState>((set, get) => ({
  selectedIssueId: null,
  themeColor: "#7488ff",
  issues: [],
  widgets: [],
  focusIssue(id) {
    if (!get().issues.some((issue) => issue.id === id)) return false;
    set({ selectedIssueId: id });
    return true;
  },
  clearFocus() { set({ selectedIssueId: null }); },
  setIssues(issues) {
    const selectedIssueId = get().selectedIssueId;
    set({ issues, selectedIssueId: issues.some((issue) => issue.id === selectedIssueId) ? selectedIssueId : null });
  },
  spawnWidget(type, coordinates, copy) {
    if (!["metric", "note", "chart"].includes(type) || coordinates.length !== 3
      || !coordinates.every(Number.isFinite) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 85) {
      throw new TypeError("Use a metric, note, or chart widget with [longitude, latitude, altitude] coordinates.");
    }
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const labels = { metric: ["Community metric", "Civic data point"], note: ["City note", "Community context"], chart: ["Activity signal", "Civic activity"] };
    const [title, detail] = labels[type];
    set((state) => ({ widgets: [...state.widgets, { id, type, coordinates: [...coordinates] as Vec3, title: copy?.title ?? title, detail: copy?.detail ?? detail }] }));
    return id;
  },
  focusOnNode(id) {
    if (id === "city" || id === "overview" || id === "map") { set({ selectedIssueId: null }); return true; }
    const issueId = Number(id.replace(/^issue-/, ""));
    return Number.isInteger(issueId) && get().focusIssue(issueId);
  },
  changeTheme(color) {
    if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) return false;
    set({ themeColor: color });
    return true;
  },
}));

export const AGENT_COMMAND_EVENT = "civiclens:agent-command";

function isAgentCommand(value: unknown): value is AgentCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Record<string, unknown>;
  if (command.type === "focusOnIssue") return Number.isInteger(command.id);
  if (command.type === "focusOnNode") return typeof command.id === "string";
  if (command.type === "changeTheme") return typeof command.color === "string";
  return command.type === "spawnWidget" && Array.isArray(command.coordinates)
    && command.coordinates.length === 3
    && command.coordinates.every((n) => typeof n === "number" && Number.isFinite(n))
    && Math.abs(Number(command.coordinates[0])) <= 180
    && Math.abs(Number(command.coordinates[1])) <= 85
    && ["metric", "note", "chart"].includes(String(command.widgetType));
}

export function attachAgentCommandBridge(): () => void {
  const bridge: AgentCommandBridge = {
    focusOnIssue: (id) => useSpatialStore.getState().focusIssue(id),
    focusOnNode: (id) => useSpatialStore.getState().focusOnNode(id),
    changeTheme: (color) => useSpatialStore.getState().changeTheme(color),
    spawnWidget: (type, coordinates) => useSpatialStore.getState().spawnWidget(type, coordinates),
    dispatch(command) {
      if (!isAgentCommand(command)) return;
      if (command.type === "focusOnIssue") bridge.focusOnIssue(command.id);
      if (command.type === "focusOnNode") bridge.focusOnNode(command.id);
      if (command.type === "changeTheme") bridge.changeTheme(command.color);
      if (command.type === "spawnWidget") useSpatialStore.getState().spawnWidget(command.widgetType, command.coordinates, { title: command.title, detail: command.detail });
    },
    getState: () => {
      const { selectedIssueId, themeColor, widgets } = useSpatialStore.getState();
      return { selectedIssueId, themeColor, widgets };
    },
  };
  const onCommand = (event: Event) => {
    const command: unknown = (event as CustomEvent<unknown>).detail;
    if (isAgentCommand(command)) bridge.dispatch(command);
  };
  window.civicScene = bridge;
  window.addEventListener(AGENT_COMMAND_EVENT, onCommand);
  return () => {
    window.removeEventListener(AGENT_COMMAND_EVENT, onCommand);
    if (window.civicScene === bridge) delete window.civicScene;
  };
}
