const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/onboarding/model.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { exports: {} }; vm.runInNewContext(compiled, sandbox);
const m = sandbox.exports;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
check('Accepts NetID, legacy alias, case and surrounding whitespace', () => {
  for (const value of ['abc12345@uconn.edu', 'alex.morgan@uconn.edu', ' ABC12345@UCONN.EDU ']) assert.equal(m.isUConnEmail(value), true, value);
});
check('Rejects external and spoofed domains and malformed addresses', () => {
  for (const value of ['', 'x@gmail.com', 'x@uconn.edu.evil.com', 'x@fakeuconn.edu', 'x@y@uconn.edu', 'x y@uconn.edu', 'x..y@uconn.edu', '@uconn.edu']) assert.equal(m.isUConnEmail(value), false, value);
});
check('Name preference accepts international and punctuated names, including no preference', () => {
  for (const value of ['', 'Max', 'Élodie', '李', 'Jean-Luc', 'D’Arcy', 'Mary Ann', 'José']) assert.equal(m.isNamePreference(value), true, value);
});
check('Name preference rejects handles, numbers, markup and excessive length', () => {
  for (const value of ['max123', '@max', '<script>', '💪', 'A'.repeat(41)]) assert.equal(m.isNamePreference(value), false, value);
});
const valid = { version: 1, email: 'preview.student@uconn.edu', identity: m.DEMO_IDENTITY, preferredFirstName: 'Lex', year: 'Junior', interests: ['yoga', 'strength'], completedAt: '2026-09-17T12:00:00Z' };
check('Completed profile requires valid and distinct interests', () => {
  assert.equal(m.isStudentProfile(valid), true);
  for (const change of [{ interests: [] }, { interests: ['fake'] }, { interests: ['yoga', 'yoga'] }, { year: 'unknown' }, { completedAt: '' }, { identity: { ...m.DEMO_IDENTITY, source: 'verified' } }, { preferredFirstName: 123 }, { version: 0 }]) assert.equal(m.isStudentProfile({ ...valid, ...change }), false);
  for (const corrupt of [null, [], {}, 'bad JSON']) assert.equal(m.isStudentProfile(corrupt), false);
});
check('Preferred name never replaces the stored student-record surname', () => {
  assert.equal(m.fullName(valid), 'Lex Morgan'); assert.equal(m.initials(valid), 'LM');
  assert.equal(m.fullName({ ...valid, preferredFirstName: '' }), 'Alex Morgan');
});
check('Interests map to class categories without claiming unavailable classes', () => {
  const categories = m.suggestedCategories(valid);
  assert.equal(categories.has('Strength'), true); assert.equal(categories.has('Mind & body'), true); assert.equal(categories.has('Cardio'), false);
  assert.equal(m.suggestedCategories({ ...valid, interests: ['basketball'] }).size, 0);
});
console.log(`${checks} onboarding checks passed.`);
