# CivicLens Spatial Intelligence

Spatial Intelligence is a lazy-loaded MapLibre GL JS map. It uses OpenStreetMap raster tiles for real roads, intersections, blocks, and labels. It does not create synthetic streets or buildings. The map is pitched and darkened for the CivicLens visual style while retaining map labels and road geometry.

Each report marker is placed directly at `[longitude, latitude]` from `GET /issues`; close reports stay geographically close. The initial view frames all valid report coordinates, while selecting a report eases to that exact location. When reports are empty, the map opens around CivicLens's default Ottawa area. Marker color represents priority, height represents priority plus urgency, and confirmations increase marker emphasis.

OpenStreetMap attribution is shown on the map. The public OSM tile server is best-effort and intended for modest interactive use: this client only requests visible map tiles and does not prefetch or bulk-download. A larger public deployment should use a tile provider or hosting arrangement with an explicit availability commitment.

## Explore

- Drag to pan and scroll/pinch to zoom.
- Hover or keyboard-focus a beacon for its title and priority.
- Select a beacon to focus the map and open complete report details.
- Choose “Return to city overview” to frame all reports again.

The normal CivicLens dashboard and its Leaflet map are separate and unchanged. The spatial view uses MapLibre while retaining the `tw:` Tailwind prefix without Preflight.

## Browser state bridge

While Spatial Intelligence is open, `window.civicScene` is attached:

```js
window.civicScene.focusOnIssue(3);
window.civicScene.focusOnNode("overview");
window.civicScene.changeTheme("#36d9bd");
window.civicScene.spawnWidget("metric", [-75.7, 45.42, 0]);
window.civicScene.getState();
```

`spawnWidget` coordinates are `[longitude, latitude, altitude]`. Commands can also be sent with a `civiclens:agent-command` CustomEvent. The bridge and its event listener are removed when the view unmounts.
