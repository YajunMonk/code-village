#!/usr/bin/env node
// Validate the original resident cast, dialogue rotation, portraits and bundled font coverage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, 'source/src', file), 'utf8');
const noop = () => {};
const context = vm.createContext({
  makeCanvas: () => [{}, { measureText: () => ({ width: 12 }) }],
  G: { done: 0 }, save: noop, calls: [],
  mockTalk: async lines => context.calls.push(lines),
});
for (const file of ['20_art.js', '22_art3.js', '37_reactions.js', '40_ui.js']) vm.runInContext(read(file).replace(/^const talk = .*$/m, 'const talk = mockTalk;'), context, { filename: file });
vm.runInContext(read('57_residents.js'), context, { filename: '57_residents.js' });
vm.runInContext('globalThis.api = { RESIDENTS, WHO, CHAR, residentProfile, residentConversation, talkResident, registerResidentVoices };', context);
const a = context.api, entries = Object.entries(a.RESIDENTS);
assert.equal(entries.length, 12, 'There must be twelve original residents');
assert.equal(new Set(entries.map(([, r]) => r.name)).size, 12);
assert.equal(new Set(entries.map(([, r]) => r.avatar)).size, 12);
assert.deepEqual(entries.map(([, r]) => r.zoneHint).sort((x, y) => x - y), [1, 2, 5, 6, 7, 10, 11, 13, 14, 17, 19, 22]);

const seen = new Set(), words = new Set();
const emotions = new Set(['surprise', 'anger', 'idea', 'sweat', 'joy', 'question']);
const publicNames = /爱因斯坦|牛顿|乔布斯|霍珀|洛夫莱斯|戴明|汉密尔顿|诺曼|宫崎骏|费曼|居里|萨瑟兰|Einstein|Newton|Jobs|Hopper|Feynman/;
let rounds = 0, lines = 0;
for (const [key, r] of entries) {
  assert(r.name && r.role && r.bio && r.outfit && r.inspiration, `${key}: missing character details`);
  assert(r.inspiration.includes('非本人') && r.inspiration.includes('未使用真实引言'), `${key}: source attribution must identify fiction`);
  assert(a.CHAR[r.avatar], `${key}: missing independent pixel sprite ${r.avatar}`);
  assert.equal(a.WHO['resident_' + key].id, r.avatar);
  assert.equal(a.WHO['resident_' + key].n, r.name);
  assert(r.lines.length >= 4 && r.after.length >= 2, `${key}: need at least four ordinary and two later conversations`);
  let count = 0;
  for (const [phase, pool] of [['before', r.lines], ['after', r.after]]) {
    for (const [index, round] of pool.entries()) {
      assert(round.length >= 2 && round.length <= 3, `${key} ${phase} ${index}: keep two or three concise turns`);
      assert(round.some(l => l.who === 'me'), `${key} ${phase} ${index}: 不响 must respond`);
      assert(round.some(l => l.who === 'self'), `${key} ${phase} ${index}: resident must speak`);
      for (const line of round) {
        assert(['self', 'me', 'xa'].includes(line.who), `${key}: unsupported speaker`);
        assert(line.text.trim().length > 0 && line.text.length <= 72, `${key}: dialogue should remain concise`);
        assert(!publicNames.test(line.text), `${key}: inspiration names must not enter fictional dialogue`);
        assert(!/名言|曾说过|说过：|原话|语录|——/.test(line.text), `${key}: dialogue must not claim a real quote`);
        assert(!seen.has(line.text), `Duplicate dialogue: ${line.text}`);
        seen.add(line.text); count++; lines++;
        for (const char of line.text) words.add(char);
      }
      rounds++;
    }
    const progress = phase === 'after' ? r.afterAt : r.afterAt - 1;
    const signatures = Array.from({ length: pool.length }, (_, visit) => JSON.stringify(a.residentConversation(key, visit, progress)));
    assert.equal(new Set(signatures).size, pool.length, `${key}: visits must rotate before repeating`);
    assert.equal(JSON.stringify(a.residentConversation(key, pool.length, progress)), signatures[0]);
    for (let visit = 0; visit < pool.length; visit++) for (const [lineIndex, speech] of a.residentConversation(key, visit, progress).entries()) {
      const [who, text, code, metadata] = speech, authored = pool[visit][lineIndex];
      assert(a.WHO[who], `${key}: missing WHO reference ${who}`);
      assert(typeof text === 'string');
      assert.equal(text, authored.text, `${key}: reaction metadata must not alter dialogue text`);
      if (authored.emotion) {
        assert(emotions.has(authored.emotion), `${key}: unsupported authored emotion`);
        assert.equal(code, '', `${key}: emotion must not occupy the code slot`);
        assert.equal(metadata?.emotion, authored.emotion, `${key}: selected emotion must reach the dialogue metadata slot`);
      } else assert.equal(metadata, undefined, `${key}: unmarked dialogue must not acquire an inferred emotion`);
    }
  }
  assert(count >= 12, `${key}: need at least twelve authored lines`);
  const profile = a.residentProfile(key);
  assert(!('inspiration' in profile), `${key}: inspiration is source-only metadata`);
  assert(!publicNames.test(JSON.stringify(profile)), `${key}: public profile must remain original`);
  for (const value of [r.name, r.role, r.bio, r.outfit]) for (const char of value) words.add(char);
}
assert.equal(a.residentProfile('missing'), null);
assert.equal(a.residentConversation('missing').length, 0);

// Exercise the optional helper: visits survive saving and restart at a later story phase.
for (const [key, r] of entries) {
  context.G = { done: 0, residentVisits: {} };
  await a.talkResident(key); await a.talkResident(key);
  assert.equal(context.G.residentVisits[key + ':before'], 2);
  assert.notEqual(JSON.stringify(context.calls.at(-2)), JSON.stringify(context.calls.at(-1)));
  context.G.done = r.afterAt;
  await a.talkResident(key);
  assert.equal(context.G.residentVisits[key + ':after'], 1);
  assert.equal(JSON.stringify(context.calls.at(-1)), JSON.stringify(a.residentConversation(key, 0, r.afterAt)));
}
const visitsBefore = JSON.stringify(context.G.residentVisits);
assert.equal(await a.talkResident('missing'), false);
assert.equal(JSON.stringify(context.G.residentVisits), visitsBefore);

// Read the bundled TrueType cmap directly, so validation has no Python/package dependency.
const font = fs.readFileSync(path.join(root, 'source/assets/fusion-pixel.ttf'));
function tableOffset(tag) {
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const p = 12 + i * 16;
    if (font.toString('ascii', p, p + 4) === tag) return font.readUInt32BE(p + 8);
  }
  throw new Error(`Font lacks ${tag}`);
}
const cmap = tableOffset('cmap'), maps = [];
for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
  const p = cmap + 4 + i * 8, platform = font.readUInt16BE(p), encoding = font.readUInt16BE(p + 2);
  if (platform === 0 || platform === 3 && (encoding === 1 || encoding === 10)) maps.push(cmap + font.readUInt32BE(p + 4));
}
function hasGlyph(code) {
  return maps.some(o => {
    const format = font.readUInt16BE(o);
    if (format === 12) {
      for (let i = 0; i < font.readUInt32BE(o + 12); i++) {
        const p = o + 16 + i * 12, start = font.readUInt32BE(p), end = font.readUInt32BE(p + 4);
        if (code >= start && code <= end) return font.readUInt32BE(p + 8) + code - start !== 0;
      }
    } else if (format === 4 && code <= 0xffff) {
      const n = font.readUInt16BE(o + 6) / 2, ends = o + 14, starts = ends + n * 2 + 2, deltas = starts + n * 2, offsets = deltas + n * 2;
      for (let i = 0; i < n; i++) {
        const start = font.readUInt16BE(starts + i * 2), end = font.readUInt16BE(ends + i * 2);
        if (code < start || code > end) continue;
        const delta = font.readInt16BE(deltas + i * 2), offset = font.readUInt16BE(offsets + i * 2);
        if (!offset) return ((code + delta) & 0xffff) !== 0;
        const glyph = font.readUInt16BE(offsets + i * 2 + offset + (code - start) * 2);
        return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
      }
    }
    return false;
  });
}
const missing = [...words].filter(c => !/\s/.test(c) && !hasGlyph(c.codePointAt(0)));
assert.deepEqual(missing, [], 'Every displayed character must exist in the bundled font');
console.log(`PASS: 12 residents, ${rounds} rotating conversations, ${lines} unique authored lines, 12 independent avatars, WHO references, progress/visit persistence, ${words.size} displayed font characters.`);
