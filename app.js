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