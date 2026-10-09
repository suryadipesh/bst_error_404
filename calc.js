/* SkyTrace calculation engine - plain JS, no dependencies. Works in browser (window.SkyTrace) and Node (require). */
(function (root) {
  const R = 6371.0088; // mean Earth radius, km
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const norm180 = lon => ((lon + 540) % 360) - 180;

  // Illustrative uncertainty models (assumptions, NOT measured confidence levels).
  // outer radius = max(floorKm, spread * distance); inner radius = innerRatio * outer radius.
  const MODELS = {
    narrow:   { label: 'Narrow',   spread: 0.10, floorKm: 2, innerRatio: 0.5 },
    moderate: { label: 'Moderate', spread: 0.20, floorKm: 3, innerRatio: 0.5 },
    wide:     { label: 'Wide',     spread: 0.35, floorKm: 5, innerRatio: 0.5 }
  };

  // Distance travelled in km = speed (km/h) x time (hours)
  const travelDistanceKm = (speedKmh, minutes) => speedKmh * (minutes / 60);

  // Great-circle destination: start point, initial bearing, distance -> end point (spherical Earth).
  function destinationPoint(lat, lon, headingDeg, distKm) {
    const d = distKm / R, b = rad(headingDeg), p1 = rad(lat), l1 = rad(lon);
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
    const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: deg(p2), lon: norm180(deg(l2)) };
  }

  // Haversine great-circle distance in km.
  function haversineKm(a, b) {
    const dp = rad(b.lat - a.lat), dl = rad(b.lon - a.lon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }