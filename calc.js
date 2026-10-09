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
  // Returns { ok, errors[], warnings[] }. Never guesses: invalid input => ok:false.
  function validate(i) {
    const errors = [], warnings = [];
    const num = (v, name) => {
      if (v === '' || v === null || v === undefined || !Number.isFinite(Number(v))) {
        errors.push(name + ' must be a number.');
        return false;
      }
      return true;
    };

    const okLat = num(i.lat, 'Latitude');
    const okLon = num(i.lon, 'Longitude');
    const okT = num(i.minutes, 'Time since last contact');
    const okS = num(i.speedKmh, 'Speed');
    const okH = num(i.headingDeg, 'Heading');

    if (okLat && (i.lat < -90 || i.lat > 90)) errors.push('Latitude must be between -90 and 90.');
    if (okLon && (i.lon < -180 || i.lon > 180)) errors.push('Longitude must be between -180 and 180.');
    if (okT && i.minutes < 0) errors.push('Time since last contact cannot be negative.');
    if (okS && i.speedKmh < 0) errors.push('Speed cannot be negative.');
    if (okH && (i.headingDeg < 0 || i.headingDeg > 359)) errors.push('Heading must be between 0 and 359 degrees.');
    if (!MODELS[i.model]) errors.push('Choose Narrow, Moderate or Wide uncertainty.');

    if (errors.length) return { ok: false, errors, warnings };

    const dist = travelDistanceKm(i.speedKmh, i.minutes);

    if (i.minutes === 0) warnings.push('Zero elapsed time: the estimate is the last known position and the area is only the minimum model radius.');
    if (i.speedKmh === 0 && i.minutes > 0) warnings.push('Speed is 0 km/h, so the aircraft is assumed not to have moved. Check this is realistic.');
    if (i.speedKmh > 1100) warnings.push('Speed above 1,100 km/h is faster than most aircraft; the model may not apply.');
    if (i.speedKmh > 0 && i.speedKmh < 60) warnings.push('Speed below 60 km/h is unusually slow for fixed-wing aircraft.');
    if (i.minutes > 480) warnings.push('More than 8 hours since contact: a real aircraft may have run out of fuel or changed course. Treat this area as very rough.');
    if (dist > 3000) warnings.push('Very long distance (' + Math.round(dist) + ' km): the straight-line, constant-heading assumption becomes unreliable.');
    if (Math.abs(i.lat) > 80) warnings.push('Near the poles, headings and map distortion make this estimate less reliable.');

    const end = destinationPoint(i.lat, i.lon, i.headingDeg, dist);
    if (Math.abs(end.lon - i.lon) > 180 || Math.abs(Math.abs(i.lon) - 180) < 1 || (Math.abs(end.lon - i.lon) > 90 && dist > 8000)) {
      warnings.push('The path may cross the 180° longitude line; the map may draw it unexpectedly.');
    }

    warnings.push('The model assumes straight flight at a constant speed and heading. Wind, turns, descents and fuel are not known.');
    return { ok: true, errors, warnings };
  }
  // Main calculation. Returns { ok:false, errors } on failure - never invented numbers.
  function calculate(input) {
    const i = {
      lat: Number(input.lat),
      lon: Number(input.lon),
      minutes: Number(input.minutes),
      speedKmh: Number(input.speedKmh),
      headingDeg: Number(input.headingDeg),
      model: input.model || 'moderate'
    };

    for (const k of ['lat', 'lon', 'minutes', 'speedKmh', 'headingDeg']) {
      if (input[k] === '' || input[k] == null) i[k] = NaN;
    }

    const v = validate(i);
    if (!v.ok) return { ok: false, errors: v.errors, warnings: v.warnings };

    const m = MODELS[i.model];
    const distanceKm = travelDistanceKm(i.speedKmh, i.minutes);
    const center = destinationPoint(i.lat, i.lon, i.headingDeg, distanceKm);
    const outerKm = Math.max(m.floorKm, m.spread * distanceKm);
    const innerKm = outerKm * m.innerRatio;

    return {
      ok: true,
      errors: [],
      warnings: v.warnings,
      input: i,
      model: m,
      distanceKm,
      center,
      outerKm,
      innerKm,
      outerAreaKm2: Math.PI * outerKm ** 2,
      innerAreaKm2: Math.PI * innerKm ** 2
    };
  }