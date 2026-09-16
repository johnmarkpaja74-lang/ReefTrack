(function () {
  "use strict";

  const root = document.querySelector("#deployment-map");
  if (!root || !globalThis.L) return;

  const DEFAULT_CENTER = [6.821, 126.215];
  let records = [];
  let map;
  let markerLayer;
  let summary;

  function validDeployments(items) {
    return (Array.isArray(items) ? items : []).filter((item) =>
      Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    );
  }

  function distanceKm(first, second) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const latitudeDelta = radians(Number(second.latitude) - Number(first.latitude));
    const longitudeDelta = radians(Number(second.longitude) - Number(first.longitude));
    const latitudeOne = radians(Number(first.latitude));
    const latitudeTwo = radians(Number(second.latitude));
    const value = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function nearestDistance(selected) {
    const distances = records
      .filter((item) => item !== selected)
      .map((item) => distanceKm(selected, item));
    return distances.length ? Math.min(...distances) : null;
  }

  function spatialSpread(items) {
    let spread = 0;
    items.forEach((first, index) => {
      items.slice(index + 1).forEach((second) => {
        spread = Math.max(spread, distanceKm(first, second));
      });
    });
    return spread;
  }

  function buildMap() {
    root.classList.add("map-shell");
    const mapNode = document.createElement("div");
    mapNode.className = "reef-leaflet-map";
    mapNode.setAttribute("aria-label", "Artificial reef deployment map");

    summary = document.createElement("div");
    summary.className = "map-data-strip";
    root.replaceChildren(mapNode, summary);

    map = globalThis.L.map(mapNode, {
      center: DEFAULT_CENTER,
      zoom: 11,
      minZoom: 7,
      maxZoom: 18,
      scrollWheelZoom: true
    });
    globalThis.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    markerLayer = globalThis.L.layerGroup().addTo(map);

    if (typeof ResizeObserver === "function") {
      new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(root);
    }
  }

  function updateSummary() {
    const sites = new Set(records.map((item) => item.site).filter(Boolean)).size;
    const spread = spatialSpread(records).toFixed(1);
    summary.innerHTML = `
      <span><b>${records.length}</b> deployment${records.length === 1 ? "" : "s"}</span>
      <span><b>${sites}</b> mapped site${sites === 1 ? "" : "s"}</span>
      <span><b>${spread} km</b> spatial spread</span>`;
  }

  function render(items) {
    records = validDeployments(items);
    markerLayer.clearLayers();
    root.querySelector(".map-empty-overlay")?.remove();

    const bounds = [];
    records.forEach((record) => {
      const point = [Number(record.latitude), Number(record.longitude)];
      bounds.push(point);
      const marker = globalThis.L.marker(point)
        .bindTooltip(`${record.site || "Deployment site"} · ${record.batch || "Unassigned batch"}`, {
          direction: "top"
        })
        .on("click", () => globalThis.dispatchEvent(new CustomEvent("reeftrack:deployment-selected", {
          detail: { ...record, nearest: nearestDistance(record) }
        })));
      markerLayer.addLayer(marker);
    });

    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    else {
      map.setView(DEFAULT_CENTER, 11);
      const empty = document.createElement("div");
      empty.className = "map-empty-overlay";
      empty.innerHTML = "<b>No deployments mapped yet</b><small>Approved deployment coordinates will appear here automatically.</small>";
      root.append(empty);
    }

    updateSummary();
    window.setTimeout(() => map.invalidateSize(), 80);
  }

  buildMap();
  render(globalThis.reefTrackDeployments);
  globalThis.addEventListener("reeftrack:deployments-updated", (event) => {
    render(event.detail || globalThis.reefTrackDeployments);
  });
})();
