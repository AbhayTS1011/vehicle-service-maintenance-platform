const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (name) => readFileSync(path.join(__dirname, name), 'utf8');
const baseline = read('baseline.sql');
const schema = read('schema.sql');
const reset = read('reset.sql');

test('create-only schema has no destructive reset statements or sample inserts', () => {
  assert.doesNotMatch(schema, /^\s*(DROP\s|TRUNCATE\s|DELETE\s)/im);
  assert.doesNotMatch(schema, /^\s*INSERT\s+INTO\s/im);
});

test('baseline runs a strict fresh-target guard and installs the current SQL object set transactionally', () => {
  assert.match(baseline, /^\\set ON_ERROR_STOP on/m);
  assert.match(baseline, /^BEGIN;/m);
  assert.match(baseline, /Refusing baseline: target is not empty/);
  for (const file of ['schema.sql', 'functions.sql', 'triggers.sql', 'views.sql', 'indexes.sql']) {
    assert.ok(baseline.includes(`\\ir ${file}`), `baseline must include ${file}`);
  }
  assert.doesNotMatch(baseline, /\\ir\s+seed\.sql/i);
  assert.match(baseline, /INSERT INTO public\.schema_migrations[\s\S]*VALUES \('20261020_001'/);
  assert.match(baseline, /COMMIT;\s*$/);
});

test('destructive developer reset is separate, prominently labeled, and reuses SQL sources', () => {
  assert.match(reset, /DESTRUCTIVE DEVELOPER RESET ONLY/);
  assert.match(reset, /^\s*DROP TABLE/m);
  for (const file of ['schema.sql', 'functions.sql', 'triggers.sql', 'views.sql', 'indexes.sql']) {
    assert.ok(reset.includes(`\\ir ${file}`), `reset should reuse ${file}`);
  }
  assert.doesNotMatch(reset, /\\ir\s+seed\.sql/i);
});
