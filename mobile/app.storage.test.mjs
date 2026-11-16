// The data module against a fake `storage`: files in a Map, SQLite from bun:sqlite (INTEGER as
// bigint, one open handle per file, as the host). A Contract test cannot seed app:/data/todo.json,
// so the one-time JSON import is tested here. Run: make test-storage
import { Database as Sqlite } from 'bun:sqlite';
import { expect, test } from 'bun:test';
import { answer } from './app.ts';

function fakeStorage(files = {}) {
  const fs = new Map(Object.entries(files));
  const dbs = new Map();
  const open = new Set();
  const enoent = () => Object.assign(new Error('no such file'), { code: 'ENOENT' });
  return {
    files: fs,
    fs: {
      readFile: async (p) => { if (!fs.has(p)) throw enoent(); return new TextEncoder().encode(fs.get(p)).buffer; },
      rename: async (a, b) => { if (!fs.has(a)) throw enoent(); fs.set(b, fs.get(a)); fs.delete(a); },
      rm: async (p) => { fs.delete(p); },
      atomicWriteFile: async (p, bytes) => { fs.set(p, new TextDecoder().decode(bytes)); },
    },
    sqlite: {
      open: async (path) => {
        if (open.has(path)) throw Object.assign(new Error('busy'), { code: 'EBUSY' });
        open.add(path);
        const db = dbs.get(path) ?? new Sqlite(':memory:', { safeIntegers: true });
        dbs.set(path, db);
        const run = (sql, params = []) => { const r = db.run(sql, params); return { changes: r.changes, lastInsertRowid: BigInt(r.lastInsertRowid) }; };
        return {
          execute: async (sql, params) => run(sql, params),
          query: async (sql, params = []) => {
            const st = db.query(sql);
            return { columns: st.columnNames, rows: st.values(...params) };
          },
          transaction: async (cmds) => db.transaction(() => cmds.map((c) => run(c.sql, c.params)))(),
          close: async () => { open.delete(path); },
        };
      },
    },
  };
}
const ask = (s, source, ...args) => answer(source, args, undefined, s);
const JSON_DATA = {
  categories: [{ id: '1', name: 'Home' }, { id: '2', name: 'Work', color: 'orange' }],
  tasks: [{ id: '7', title: 'Old', notes: 'n', categoryId: '2', due: '2026-03-20', time: '09:30', done: true }],
};

test('first run without a JSON file seeds the categories', async () => {
  const s = fakeStorage();
  expect((await ask(s, 'loadCategories')).map((c) => [c.id, c.name, c.color])).toEqual([['1', 'Home', 'blue'], ['2', 'Work', 'violet'], ['3', 'Personal', 'pink']]);
  expect(await ask(s, 'loadTasks')).toEqual([]);
});

test('the JSON file is imported once, colours backfilled, then kept as todo.json.bak', async () => {
  const s = fakeStorage({ 'app:/data/todo.json': JSON.stringify(JSON_DATA) });
  expect(await ask(s, 'loadTasks')).toEqual(JSON_DATA.tasks);
  expect((await ask(s, 'loadCategories')).map((c) => [c.id, c.name, c.color])).toEqual([['1', 'Home', 'blue'], ['2', 'Work', 'orange']]);
  expect(s.files.has('app:/data/todo.json')).toBe(false);
  expect(s.files.get('app:/data/todo.json.bak')).toBe(JSON.stringify(JSON_DATA));
  // a second launch does not import again, even if a stray todo.json appears
  s.files.set('app:/data/todo.json', JSON.stringify({ categories: [], tasks: [] }));
  expect((await ask(s, 'loadTasks')).length).toBe(1);
});

test('new ids continue after the imported ones; string ids at the boundary', async () => {
  const s = fakeStorage({ 'app:/data/todo.json': JSON.stringify(JSON_DATA) });
  await ask(s, 'saveTask', '', 'New', '', '1', '', '');
  expect((await ask(s, 'loadTasks')).map((t) => t.id)).toEqual(['7', '8']);
  expect(await ask(s, 'addCategory', 'Errands', 'teal')).toEqual({ ok: true, error: '' });
  expect((await ask(s, 'loadCategories')).at(-1)).toEqual({ id: '3', name: 'Errands', color: 'teal' });
});

test('add, edit, toggle and delete run against the table', async () => {
  const s = fakeStorage();
  await ask(s, 'saveTask', '', 'Buy milk', 'Two litres', '2', '', '');
  await ask(s, 'saveTask', '1', 'Buy oat milk', 'x', '1', '2026-03-20', '09:30');
  await ask(s, 'toggleTask', '1', true);
  expect(await ask(s, 'loadTasks')).toEqual([{ id: '1', title: 'Buy oat milk', notes: 'x', categoryId: '1', due: '2026-03-20', time: '09:30', done: true }]);
  await ask(s, 'removeTask', '1');
  expect(await ask(s, 'loadTasks')).toEqual([]);
});

test('a duplicate category is refused, an unknown colour falls back to blue', async () => {
  const s = fakeStorage();
  expect(await ask(s, 'addCategory', 'work', 'blue')).toEqual({ ok: false, error: 'There is already a category called Work.' });
  await ask(s, 'addCategory', 'Errands', 'nope');
  expect((await ask(s, 'loadCategories')).at(-1).color).toBe('blue');
  expect((await ask(s, 'loadCategories')).length).toBe(4);
});

test('overlapping calls do not hit a busy database', async () => {
  const s = fakeStorage();
  await Promise.all([ask(s, 'loadTasks'), ask(s, 'loadCategories'), ask(s, 'saveTask', '', 'A', '', '1', '', '')]);
  expect((await ask(s, 'loadTasks')).length).toBe(1);
});

test('at bake time a read answers the seed or an empty list', async () => {
  const bake = { fs: { readFile: async () => { throw Object.assign(new Error('bake'), { code: 'bake' }); } },
    sqlite: { open: async () => { throw Object.assign(new Error('bake'), { code: 'bake' }); } } };
  expect(await answer('loadTasks', [], undefined, bake)).toEqual([]);
  expect((await answer('loadCategories', [], undefined, bake)).length).toBe(3);
});
