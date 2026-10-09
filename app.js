(function () {
  const S = window.SkyTrace, $ = id => document.getElementById(id);
  const map = L.map('map').setView([20.5, 78.9], 5);

  const osm = L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  ).addTo(map);

  const sat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics'
    }
  );

  L.control.layers(
    { 'Street map (OpenStreetMap)': osm, 'Satellite (Esri)': sat },
    null,
    { position: 'topright' }
  ).addTo(map);

  const layer = L.layerGroup().addTo(map);
  let startMarker = null, last = null, bounds = null;

  const fmt = (n, d) => n.toLocaleString(undefined, {
    maximumFractionDigits: d == null ? 1 : d
  });

  const mins = m => m >= 60
    ? Math.floor(m / 60) + ' h ' + fmt(m % 60, 0) + ' min'
    : fmt(m, 0) + ' min';

  const read = () => ({
    lat: $('lat').value,
    lon: $('lon').value,
    minutes: $('minutes').value,
    speedKmh: $('speed').value,
    headingDeg: $('heading').value,
    model: $('model').value
  });

  const write = v => {
    $('lat').value = v.lat;
    $('lon').value = v.lon;
    $('minutes').value = v.minutes;
    $('speed').value = v.speedKmh;
    $('heading').value = v.headingDeg;
    $('model').value = v.model;
  };

  const show = (errs, warns) => {
    $('messages').innerHTML =
      (errs.length
        ? '<ul class="err">' + errs.map(e => '<li>' + e + '</li>').join('') + '</ul>'
        : '') +
      (warns.length
        ? '<ul class="warn">' + warns.map(e => '<li>' + e + '</li>').join('') + '</ul>'
        : '');
  };

  const dot = (p, color, text) =>
    L.marker([p.lat, p.lon], {
      icon: L.divIcon({
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: '<div class="pin" style="--c:' + color + '"><span></span></div>'
      })
    }).bindTooltip(text, { permanent: false });

  function countUp(el, to, dec, suffix) {
    const t0 = performance.now(), dur = 900;
    (function f(t) {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e, dec) + suffix;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  const pop = el => {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  };
    function setStart(lat, lon) {
    $('lat').value = lat.toFixed(5);
    $('lon').value = lon.toFixed(5);

    if (startMarker) map.removeLayer(startMarker);

    startMarker = dot(
      { lat, lon },
      '#22c55e',
      'Last known position (selected)'
    ).addTo(map);
  }

  map.on('click', e => setStart(e.latlng.lat, e.latlng.wrap().lng));

  function render(res) {
    layer.clearLayers();

    if (startMarker) {
      map.removeLayer(startMarker);
      startMarker = null;
    }

    const s = res.input, c = res.center;
    const sp = [s.lat, s.lon], cp = [c.lat, c.lon];

    L.circle(cp, {
      radius: res.outerKm * 1000,
      color: '#f59e0b',
      weight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.15
    })
      .bindTooltip('Outer uncertainty zone: ' + fmt(res.outerKm) + ' km radius')
      .addTo(layer);

    L.circle(cp, {
      radius: res.innerKm * 1000,
      color: '#ef4444',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 0.25
    })
      .bindTooltip('Inner uncertainty zone: ' + fmt(res.innerKm) + ' km radius')
      .addTo(layer);

    L.polyline([sp, cp], {
      color: '#7cc4ff',
      weight: 3,
      dashArray: '8 6'
    }).addTo(layer);

    dot(s, '#22c55e', 'Last known position').addTo(layer);
    dot(c, '#3b82f6', 'Estimated central position').addTo(layer);

    if ($('gridToggle').checked) {
      const col = { High: '#ef4444', Medium: '#f59e0b', Low: '#84cc16' };

      S.buildGrid(res).cells.forEach(g =>
        L.rectangle(g.bounds, {
          color: col[g.priority],
          weight: 1,
          fillOpacity: 0.12
        })
          .bindTooltip(
            g.priority + ' (demo priority) · ' + fmt(g.distKm) + ' km from centre'
          )
          .addTo(layer)
      );
    }

    bounds = L.circle(cp, { radius: res.outerKm * 1000 })
      .getBounds()
      .extend(sp);
    map.fitBounds(bounds, { padding: [30, 30] });

    $('cTime').textContent = mins(s.minutes);
    countUp($('cDist'), res.distanceKm, 1, ' km');
    countUp($('cArea'), res.outerAreaKm2, 0, ' km²');

    document.querySelectorAll('.card').forEach(pop);
    const ex = $('explain');
    ex.classList.remove('reveal');
    void ex.offsetWidth;
    ex.classList.add('reveal');

    $('how').innerHTML = `1) Distance = speed × time = ${fmt(s.speedKmh)} km/h × ${fmt(s.minutes / 60, 2)} h = <b>${fmt(res.distanceKm)} km</b>.<br>
      2) Starting at (${s.lat}, ${s.lon}) and travelling ${fmt(res.distanceKm)} km on heading ${s.headingDeg}° along Earth's curved surface (great-circle formula) gives the central estimate <b>${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</b>.<br>
      3) The "${res.model.label}" setting assumes the outer radius is ${res.model.spread * 100}% of the distance travelled (minimum ${res.model.floorKm} km) = <b>${fmt(res.outerKm)} km</b>; the inner zone is half of that (${fmt(res.innerKm)} km). These are illustrative assumptions, not measured probabilities.`;

    $('grid-note').hidden = false;

    $('print').innerHTML = `<h1>SkyTrace incident summary</h1><p>Educational prototype – not a certified search-and-rescue system. Generated ${new Date().toLocaleString()}.</p>
      <table><tr><th>Last known position</th><td>${s.lat}, ${s.lon}</td></tr><tr><th>Time since contact</th><td>${mins(s.minutes)}</td></tr><tr><th>Speed / heading</th><td>${s.speedKmh} km/h / ${s.headingDeg}°</td></tr>
      <tr><th>Uncertainty setting</th><td>${res.model.label} (illustrative)</td></tr><tr><th>Travel distance</th><td>${fmt(res.distanceKm)} km</td></tr><tr><th>Central estimate</th><td>${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</td></tr>
      <tr><th>Inner zone</th><td>${fmt(res.innerKm)} km radius (${fmt(res.innerAreaKm2, 0)} km²)</td></tr><tr><th>Outer zone</th><td>${fmt(res.outerKm)} km radius (${fmt(res.outerAreaKm2, 0)} km²)</td></tr></table>
      <h3>Warnings and limits</h3><ul>${res.warnings.map(w => '<li>' + w + '</li>').join('')}</ul><p>Weather, fuel, aircraft type and course changes are not modelled. The area is not a guaranteed or probabilistic location.</p>`;
  }