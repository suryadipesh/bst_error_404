// Run: node test.js
const assert = require('assert');
const S = require('./calc.js');

let n = 0;

const t = (name, fn) => {
  fn();
  n++;
  console.log('PASS', name);
};

const base = {
  lat: 10,
  lon: 20,
  minutes: 60,
  speedKmh: 200,
  headingDeg: 0,
  model: 'moderate'
};

const near = (a, b, tol, m) =>
  assert.ok(
    Math.abs(a - b) <= tol,
    (m || '') + ' got ' + a + ' expected ' + b
  );

t('zero elapsed time -> centre equals start, minimum radius', () => {
  const r = S.calculate({ ...base, minutes: 0 });
  assert.ok(r.ok);
  near(r.center.lat, 10, 1e-9);
  near(r.center.lon, 20, 1e-9);
  assert.strictEqual(r.outerKm, S.MODELS.moderate.floorKm);
  assert.ok(r.warnings.some(w => /Zero elapsed/.test(w)));
});

t('north: latitude rises, longitude unchanged', () => {
  const r = S.calculate(base);
  near(r.distanceKm, 200, 1e-9);
  near(r.center.lat, 10 + 200 / 111.195, 0.01);
  near(r.center.lon, 20, 1e-9);
});

t('south: latitude falls', () => {
  const r = S.calculate({ ...base, headingDeg: 180 });
  assert.ok(r.center.lat < 10);
  near(r.center.lon, 20, 1e-9);
});

t('east: longitude rises, latitude ~same', () => {
  const r = S.calculate({ ...base, headingDeg: 90 });
  assert.ok(r.center.lon > 20);
  near(r.center.lat, 10, 0.1);
});

t('west: longitude falls', () => {
  const r = S.calculate({ ...base, headingDeg: 270 });
  assert.ok(r.center.lon < 20);
});