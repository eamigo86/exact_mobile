import type { Answer, Database, Result, SQLValue, Sources, Storage } from './app.contract.d.ts';

const JSON_FILE = 'app:/data/todo.json'; // the previous store, imported once
const DB_FILE = 'app:/data/todo.db';
// app:/data holds todo.db (SQLite), the old todo.json(.bak) and the avatar; app:/tmp the pick (read from picked/) and its resize.
export const grants = ['fs.read app:/data', 'fs.write app:/data', 'fs.read app:/tmp', 'fs.write app:/tmp', 'sqlite.open app:/data/todo.db', 'device.geolocation purpose.locationPurpose'].join('\n');

type Task = Result<'loadTasks'>[number];
type Category = Result<'loadCategories'>[number];
type Data = { categories: Category[]; tasks: Task[] };

const PALETTE = ['blue', 'violet', 'pink', 'orange', 'green', 'teal'];
const SEED: Category[] = ['Home', 'Work', 'Personal'].map((name, i) => ({ id: String(i + 1), name, color: PALETTE[i] }));

// Tasks and categories live in app:/data/todo.db (user_version 1). An install from the JSON build
// has app:/data/todo.json: the first open imports it (or the seed) in one transaction, then renames
// it to todo.json.bak. A file saved before categories had a colour gets one from the palette by position.
const withColors = (data: Data): Data => ({
  ...data,
  categories: data.categories.map((c, i) => ({ ...c, color: c.color || PALETTE[i % PALETTE.length] })),
});
const readLegacy = (storage: Storage): Promise<Data> => storage.fs.readFile(JSON_FILE).then(
  (bytes) => withColors(JSON.parse(new TextDecoder().decode(bytes)) as Data),
  (e) => { if (e.code === 'ENOENT' || e.code === 'bake') return { categories: SEED, tasks: [] }; throw e; });
const SCHEMA = [
  'CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, color TEXT NOT NULL)',
  'CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT NOT NULL, notes TEXT NOT NULL, category_id TEXT NOT NULL, due TEXT NOT NULL, time TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)',
];
const migrate = async (db: Database, storage: Storage) => {
  const { rows } = await db.query('PRAGMA user_version');
  if (rows[0][0] !== 0n) return;
  const data = await readLegacy(storage);
  await db.transaction([
    ...SCHEMA.map((sql) => ({ sql })),
    ...data.categories.map((c) => ({ sql: 'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)', params: [Number(c.id), c.name, c.color] })),
    ...data.tasks.map((t) => ({ sql: 'INSERT INTO tasks (id, title, notes, category_id, due, time, done) VALUES (?, ?, ?, ?, ?, ?, ?)', params: [Number(t.id), t.title, t.notes, t.categoryId, t.due, t.time, t.done ? 1 : 0] })),
    { sql: 'PRAGMA user_version = 1' },
  ]);
  await storage.fs.rename(JSON_FILE, `${JSON_FILE}.bak`).catch(() => {}); // no file: nothing to keep
};

// An open database locks its file, so overlapping calls (a mutation and its refresh) would refuse
// each other as busy: one queue, open and close per call. A failed call must not stall the queue.
let queue: Promise<unknown> = Promise.resolve();
const withDb = <T>(storage: Storage, work: (db: Database) => Promise<T>): Promise<T> => {
  const run = queue.then(async () => {
    const db = await storage.sqlite.open(DB_FILE);
    try { await migrate(db, storage); return await work(db); } finally { await db.close(); }
  });
  queue = run.catch(() => {});
  return run;
};
// No storage at build time (code 'bake'): a read answers the first frame's value, the app asks again.
const read = <T>(storage: Storage, fallback: T, work: (db: Database) => Promise<T>): Promise<T> =>
  withDb(storage, work).catch((e) => { if (e.code === 'bake') return fallback; throw e; });
const OK: Result<'saveTask'> = { ok: true, error: '' };
const write = async (storage: Storage, sql: string, params: SQLValue[]): Promise<Result<'saveTask'>> => {
  await withDb(storage, (db) => db.execute(sql, params));
  return OK;
};

// Avatar: centre square of the pick, 256 px, JPEG, under a fresh name (a reused name can show
// stale). A first pass bounds a big photo and tells its size; "" as `from` only removes.
const rmQuiet = (storage: Storage, path: string) => (path ? storage.fs.rm(path).catch(() => {}) : Promise.resolve());
const saveAvatar = async (from: string, old: string, seed: number, storage: Storage): Promise<Result<'saveAvatar'>> => {
  if (from === '') { await rmQuiet(storage, old); return { path: '', error: '' }; }
  const tmp = 'app:/tmp/avatar-probe.jpg';
  const to = `app:/data/avatar-${seed}.jpg`;
  try {
    const { width, height } = await storage.fs.compressImage(from, tmp, { maxDimension: 1024, maxBytes: 4_000_000 });
    const side = Math.min(width, height);
    await storage.fs.transformImage(tmp, to, {
      crop: { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), width: side, height: side },
      resizeWidth: 256, resizeHeight: 256, type: 'image/jpeg', metadata: 'none',
    });
  } catch {
    return { path: old, error: 'Could not use that photo. Try another one.' };
  } finally {
    await rmQuiet(storage, tmp);
  }
  if (old !== to) await rmQuiet(storage, old);
  return { path: to, error: '' };
};

const sources: Sources = {
  saveAvatar: ([from, old, seed], _store, storage) => saveAvatar(from, old, seed, storage),
  loadCategories: (_args, _store, storage) => read(storage, SEED, async (db) =>
    (await db.query('SELECT id, name, color FROM categories ORDER BY id')).rows.map(([id, name, color]) => ({ id: String(id), name: String(name), color: String(color) }))),
  loadTasks: (_args, _store, storage) => read(storage, [], async (db) =>
    (await db.query('SELECT id, title, notes, category_id, due, time, done FROM tasks ORDER BY id')).rows
      .map(([id, title, notes, categoryId, due, time, done]) => ({ id: String(id), title: String(title), notes: String(notes), categoryId: String(categoryId), due: String(due), time: String(time), done: done !== 0n }))),
  saveTask: ([id, title, notes, categoryId, due, time], _store, storage) => id === ''
    ? write(storage, 'INSERT INTO tasks (id, title, notes, category_id, due, time) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM tasks), ?, ?, ?, ?, ?)', [title, notes, categoryId, due, time])
    : write(storage, 'UPDATE tasks SET title = ?, notes = ?, category_id = ?, due = ?, time = ? WHERE id = ?', [title, notes, categoryId, due, time, Number(id)]),
  toggleTask: ([id, done], _store, storage) => write(storage, 'UPDATE tasks SET done = ? WHERE id = ?', [done ? 1 : 0, Number(id)]),
  removeTask: ([id], _store, storage) => write(storage, 'DELETE FROM tasks WHERE id = ?', [Number(id)]),
  addCategory: ([name, color], _store, storage) => withDb(storage, async (db): Promise<Result<'addCategory'>> => {
    const { rows } = await db.query('SELECT name FROM categories WHERE name = ?', [name]); // NOCASE column
    if (rows.length) return { ok: false, error: `There is already a category called ${rows[0][0]}.` };
    await db.execute('INSERT INTO categories (id, name, color) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM categories), ?, ?)', [name, PALETTE.includes(color) ? color : PALETTE[0]]);
    return OK;
  }),
};
export const answer: Answer = (source, args, store, storage, native) => sources[source](args, store, storage, native);
