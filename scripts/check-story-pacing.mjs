#!/usr/bin/env node
// Story pacing regression: count authored content by route, without driving browser state.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const events = [];
const count = s => [...String(s).replace(/\s/g, '')].length;
const record = (type, value) => { events.push({ type, value }); return true; };
const screen = type => class { constructor(cfg) { this.type = type; this.cfg = cfg; } };
const ctx = vm.createContext({
  console, events, G: { wrong: 0, done: 0 }, npcs: [{ kind: 'xaNpc', x: 1, y: 1 }], xa: {},
  talk: async lines => { record('conversation', lines.map(line => line[0])); for (const line of lines) record('line', Array.isArray(line) ? line.slice(1, 3).join('') : line); },
  quiz: async cfg => record('exercise', { type: 'QuizScreen', cfg }),
  quizzes: async list => { for (const cfg of list) record('exercise', { type: 'QuizScreen', cfg }); },
  pickGame: async cfg => record('exercise', { type: 'PickScreen', cfg }),
  rush: async cfg => record('exercise', { type: 'RushScreen', cfg }),
  openScreen: async s => record('exercise', s), giveTerms: async ids => record('terms', ids),
  OrderScreen: screen('OrderScreen'), PromptScreen: screen('PromptScreen'), HalluScreen: screen('HalluScreen'),
  AgentDeskScreen: screen('AgentDeskScreen'), TerminalScreen: screen('TerminalScreen'),
  LaunchScreen: screen('LaunchScreen'), ArchScreen: screen('ArchScreen'),
  noodleCfg: () => ({ title: '锅锅的菜谱' }), gitPic: noop,
  unlock: noop, wait: async () => {}, Audio: { play: noop, sfx: noop },
  flash: noop, shake: noop, zoneMusic: noop, doorOpen: false, endingSequence: async () => {},
});
vm.runInContext(source('60_story.js'), ctx);
const journal = source('55_journal.js');
vm.runInContext(journal.slice(journal.indexOf('const COMICS ='), journal.indexOf('const COMIC_AT =')), ctx);
vm.runInContext(`
complete = async i => { G.done = i + 1; };
bossFight = async (cfg, pre, post) => { await talk(pre); await openScreen({type:'BattleScreen',cfg}); await talk(post); };
globalThis.pacingAPI = {CH,COMICS,TERMS};
`, ctx);
const { CH, COMICS, TERMS } = ctx.pacingAPI;
const summarize = list => ({
  conversationRounds: list.filter(e => e.type === 'conversation').length,
  dialogueTurns: list.filter(e => e.type === 'line').length,
  dialogueCharacters: list.filter(e => e.type === 'line').reduce((n,e) => n + count(e.value), 0),
  exerciseScreens: list.filter(e => e.type === 'exercise').length,
  termCards: list.filter(e => e.type === 'terms').reduce((n,e) => n + e.value.length, 0),
});
const chapters = [], traces = [];
for (let i = 0; i < CH.length; i++) {
  events.length = 0; await CH[i]();
  traces.push(events.slice()); chapters.push({ chapter: i, ...summarize(events) });
}
const comicStats = Object.fromEntries(Object.entries(COMICS).map(([key,c]) => [key, {
  frames: c.frames.length,
  characters: c.frames.reduce((n,f) => n + count(f.line) + count(f.caption), 0),
}]));
const firstExerciseIndex = traces[1].findIndex(e => e.type === 'exercise');
const openingQuizText = traces[0].filter(e => e.type === 'exercise' && e.value.type === 'QuizScreen').map(e => {
  const cfg = e.value.cfg;
  return [cfg.q, ...cfg.options.map(o => o.t), '答对了！' + cfg.options.find(o => o.ok).why];
}).flat();
const openingTerms = traces[0].filter(e => e.type === 'terms').flatMap(e => e.value).map(id => TERMS.find(t => t.id === id));
const openingCardCharacters = openingTerms.reduce((n,t) => n + ['t','a','d','ai'].reduce((s,k) => s + count(t[k]), 0), 0);
const result = {
  counting: 'Non-whitespace Unicode characters in spoken/narrated lines and comic line/caption; UI labels, quiz choices, tooltips and 70_main intro excluded.',
  openingToWorldControl: { frames: comicStats.arrival.frames, comicCharacters: comicStats.arrival.characters, ...chapters[0] },
  firstTaskBeforeExercise: summarize(traces[1].slice(0, firstExerciseIndex)),
  defaultOpeningReading: {
    comicCharacters: comicStats.arrival.characters,
    dialogueCharacters: chapters[0].dialogueCharacters,
    quizAndCorrectFeedbackCharacters: openingQuizText.reduce((n,s) => n + count(s), 0),
    termCardCharacters: openingCardCharacters,
    totalCharacters: comicStats.arrival.characters + chapters[0].dialogueCharacters + openingCardCharacters + openingQuizText.reduce((n,s) => n + count(s), 0),
    contentNodes: comicStats.arrival.frames + chapters[0].dialogueTurns + chapters[0].exerciseScreens * 2 + chapters[0].termCards,
  },
  chapters,
  mainRoute: summarize(traces.flat()), comics: comicStats,
};
if (process.argv.includes('--stats-only')) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }
assert.equal(CH.length, 27);
assert.equal(chapters[0].exerciseScreens, 0, 'CH0 must return world control before any quiz');
assert.equal(chapters[0].termCards, 0, 'No vocabulary cards before first playable task');
assert(chapters[0].conversationRounds >= 3, 'Opening needs at least three exchanges');
assert(chapters[0].dialogueTurns >= 6 && chapters[0].dialogueTurns <= 15 && chapters[0].dialogueCharacters <= 360, 'Keep the expanded opening conversational and bounded');
for (const round of traces[0].filter(e => e.type === 'conversation')) {
  assert(round.value.includes('me') && new Set(round.value).size >= 2, 'Buxiang participates in each exchange');
}
assert(COMICS.arrival.frames.length >= 1 && COMICS.arrival.frames.length <= 3, 'Explain the commission within three short opening frames');
assert(traces[0].some(e => e.type === 'line' && /鸭老师.*店主/.test(e.value)), 'Introduce the client and profession');
assert(traces[0].some(e => e.type === 'line' && /(?:右边|往右).*锅锅/.test(e.value)), 'Give the first concrete destination');
assert.equal(traces[1][firstExerciseIndex].value.type, 'OrderScreen', 'First task is a hands-on ordering puzzle');
assert.equal(result.mainRoute.exerciseScreens, 44, 'Keep all existing exercises');
assert.equal(result.mainRoute.termCards, TERMS.length, 'Keep all 42 main terms');
assert(result.mainRoute.dialogueCharacters < 4000, 'Do not restore the old lecture-heavy route');
for (const [key,c] of Object.entries(COMICS)) {
  assert(c.frames.length >= 1 && c.frames.length <= 3, `${key}: bounded chapter transition`);
  for (const f of c.frames) assert(count(f.line) <= 70 && count(f.caption) <= 32, `${key}: concise comic text`);
}
console.log(`PASS: ${chapters[0].dialogueTurns} opening lines / ${chapters[0].dialogueCharacters} characters; ${comicStats.arrival.frames} arrival frame / ${comicStats.arrival.characters} characters; first task has ${result.firstTaskBeforeExercise.dialogueTurns} lines before sorting; ${result.mainRoute.exerciseScreens} exercises / ${result.mainRoute.termCards} terms preserved.`);
if (process.argv.includes('--details')) console.log(JSON.stringify(result, null, 2));
