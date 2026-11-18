// Run: node tools/custom-team-upload-probes.cjs
// Exercise production upload callbacks with controlled read/decode completion order.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const readers = [], images = [], elements = {};
const el = id => elements[id] ||= { value: '', textContent: '', style: {}, classList: { toggle() {} } };
const context = {
  st: { customTeams: [] }, _customTeamCounter: 0,
  document: { getElementById: el, addEventListener() {}, createElement() {
    return { getContext() { return { drawImage() {}, getImageData() { return { data: [0,0,0,0] }; } }; } };
  } },
  FileReader: class { constructor() { readers.push(this); } readAsDataURL(f) { if (f.throwRead) throw Error('read failed'); } },
  Image: class { constructor() { images.push(this); } }, render() {}, console
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../ui.js'), 'utf8'), context);
vm.runInContext("rebuildTeamDropdown = id => document.getElementById('s-team').value=id; setTeam = () => {};", context);
let checks = 0;
function check(value, expected) { assert.deepEqual(value, expected); checks++; }
function load(name, extra = {}) {
  const input = { files: [{ name, ...extra }], value: name };
  context.loadTeamIcon({ target: input }); check(input.value, ''); return readers.at(-1);
}
function decode(reader, src) { reader.onload({ target: { result: src } }); return images.at(-1); }
const first = load('first.png'), second = load('second.png');
const latest = decode(second, 'data:second'); latest.onload();
first.onload({ target: { result: 'data:first' } });
check(context.st.pendingTeamSrc, 'data:second');
check(el('team-icon-status').textContent.includes('Add to List'), true);
const oldDecode = decode(load('old.png'), 'data:old');
const newer = load('new.png'); oldDecode.onload(); oldDecode.onerror();
check(context.st.pendingTeamImg, null); check(el('team-add-btn').disabled, true);
const addedImage = decode(newer, 'data:new'); addedImage.onload(); check(context.st.pendingTeamSrc, 'data:new');
context.addCustomTeam(); context.addCustomTeam();
check(context.st.customTeams.length, 1); check(context.st.customTeams[0].src, 'data:new');
check(el('s-team').value, 'custom_0'); check(context.st.pendingTeamImg, null);
addedImage.onload(); check(context.st.pendingTeamImg, null);
latest.onload(); check(context.st.pendingTeamImg, null);
const aborted = load('retry.png'); aborted.onabort();
check(el('team-icon-status').textContent.includes('interrupted'), true);
check(el('team-add-btn').disabled, true);
decode(load('retry.png'), 'data:retry').onload(); check(el('team-add-btn').disabled, false);
load('read-error.png').onerror(); check(context.st.pendingTeamSrc, null);
check(el('team-icon-status').textContent.includes('Could not read'), true);
decode(load('bad-image.png'), 'invalid').onerror();
check(el('team-icon-status').textContent.includes('Could not load'), true);
load('throws.png', { throwRead: true }); check(el('team-icon-status').textContent.includes('Could not read'), true);
const pending = decode(load('project-a.png'), 'data:project-a');
context.resetPendingTeamIcon(); pending.onload();
check(context.st.pendingTeamImg, null); check(el('team-add-btn').disabled, true);
const valid = decode(load('cancel.png'), 'data:cancel'); valid.onload();
context.loadTeamIcon({ target: { files: [] } }); check(context.st.pendingTeamSrc, 'data:cancel');
console.log(`${checks} custom-team upload checks passed`);
