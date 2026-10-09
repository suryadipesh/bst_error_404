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
t('great-circle distance matches travel distance', () => {
  for (const h of [0, 45, 90, 135, 200, 315]) {
    const r = S.calculate({
      ...base,
      headingDeg: h,
      speedKmh: 800,
      minutes: 120
    });
    near(
      S.haversineKm({ lat: 10, lon: 20 }, r.center),
      1600,
      0.01,
      'heading ' + h
    );
  }
});

t('more speed or time -> farther', () => {
  const a = S.calculate(base);
  const b = S.calculate({ ...base, speedKmh: 400 });
  const c = S.calculate({ ...base, minutes: 120 });
  assert.ok(b.distanceKm > a.distanceKm && c.distanceKm > a.distanceKm);
});

t('uncertainty ordering narrow < moderate < wide', () => {
  const [a, b, c] = ['narrow', 'moderate', 'wide'].map(m =>
    S.calculate({ ...base, minutes: 120, model: m }).outerKm
  );
  assert.ok(a < b && b < c);
});

t('inner zone smaller than outer', () => {
  const r = S.calculate(base);
  assert.ok(r.innerKm < r.outerKm && r.innerAreaKm2 < r.outerAreaKm2);
});

t('invalid coordinates rejected', () => {
  for (const bad of [
    { lat: 91 },
    { lat: -91 },
    { lon: 181 },
    { lon: -181 },
    { lat: 'abc' },
    { lat: '' }
  ]) {
    const r = S.calculate({ ...base, ...bad });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.center, undefined);
  }
});

t('negative speed/time rejected', () => {
  assert.strictEqual(S.calculate({ ...base, speedKmh: -5 }).ok, false);
  assert.strictEqual(S.calculate({ ...base, minutes: -1 }).ok, false);
});

t('heading out of range rejected', () => {
  assert.strictEqual(S.calculate({ ...base, headingDeg: 360 }).ok, false);
  assert.strictEqual(S.calculate({ ...base, headingDeg: -1 }).ok, false);
});

t('very long distance works and warns', () => {
  const r = S.calculate({ ...base, speedKmh: 900, minutes: 600 });
  assert.ok(r.ok);
  assert.ok(r.warnings.some(w => /Very long distance/.test(w)));
  assert.ok(Math.abs(r.center.lon) <= 180 && Math.abs(r.center.lat) <= 90);
});
t('grid cells lie inside outer radius and have priorities', () => {
  const r = S.calculate(base);
  const g = S.buildGrid(r);
  assert.ok(g.cells.length > 10);
  assert.ok(
    g.cells.every(c =>
      c.distKm <= r.outerKm &&
      ['High', 'Medium', 'Low'].includes(c.priority)
    )
  );
  assert.ok(g.cells.some(c => c.priority === 'High'));
});

t('demo scenario is reproducible', () => {
  const a = S.calculate(S.DEMO);
  const b = S.calculate(S.DEMO);
  assert.deepStrictEqual(a, b);
  console.log('   demo centre', a.center, 'dist', a.distanceKm, 'outer', a.outerKm);
});

console.log('\n' + n + ' tests passed');