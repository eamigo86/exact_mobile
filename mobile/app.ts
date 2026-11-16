import type { Answer, Result, Sources, Storage } from './app.contract.d.ts';

const FILE = 'app:/data/todo.json';
// app:/data holds todo.json and the avatar; app:/tmp the pick (read from picked/) and its resize.
export const grants = ['fs.read app:/data', 'fs.write app:/data', 'fs.read app:/tmp', 'fs.write app:/tmp', 'device.geolocation purpose.locationPurpose'].join('\n');

type Task = Result<'loadTasks'>[number];
type Category = Result<'loadCategories'>[number];
type Data = { categories: Category[]; tasks: Task[] };

const PALETTE = ['blue', 'violet', 'pink', 'orange', 'green', 'teal'];
const SEED: Category[] = ['Home', 'Work', 'Personal'].map((name, i) => ({ id: String(i + 1), name, color: PALETTE[i] }));

// The file is the only store; no file yet (also the build's 'bake') is the seeded, empty app.
// A file saved before categories had a colour gets one from the palette by position.
const withColors = (data: Data): Data => ({
  ...data,
  categories: data.categories.map((c, i) => ({ ...c, color: c.color || PALETTE[i % PALETTE.length] })),
});
const load = (storage: Storage): Promise<Data> => storage.fs.readFile(FILE).then(
  (bytes) => withColors(JSON.parse(new TextDecoder().decode(bytes)) as Data),
  (e) => { if (e.code === 'ENOENT' || e.code === 'bake') return { categories: SEED, tasks: [] }; throw e; });
const save = async (storage: Storage, data: Data): Promise<Result<'saveTask'>> => {
  await storage.fs.atomicWriteFile(FILE, new TextEncoder().encode(JSON.stringify(data)));
  return { ok: true, error: '' };
};
const nextId = (rows: { id: string }[]) => String(Math.max(0, ...rows.map((r) => Number(r.id))) + 1);

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
  loadCategories: async (_args, _store, storage) => (await load(storage)).categories,
  loadTasks: async (_args, _store, storage) => (await load(storage)).tasks,
  saveTask: async ([id, title, notes, categoryId, due, time], _store, storage) => {
    const data = await load(storage);
    const tasks = id === ''
      ? [...data.tasks, { id: nextId(data.tasks), title, notes, categoryId, due, time, done: false }]
      : data.tasks.map((t) => (t.id === id ? { ...t, title, notes, categoryId, due, time } : t));
    return save(storage, { ...data, tasks });
  },
  toggleTask: async ([id, done], _store, storage) => {
    const data = await load(storage);
    return save(storage, { ...data, tasks: data.tasks.map((t) => (t.id === id ? { ...t, done } : t)) });
  },
  removeTask: async ([id], _store, storage) => {
    const data = await load(storage);
    return save(storage, { ...data, tasks: data.tasks.filter((t) => t.id !== id) });
  },
  addCategory: async ([name, color], _store, storage) => {
    const data = await load(storage);
    const same = data.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (same) return { ok: false, error: `There is already a category called ${same.name}.` };
    return save(storage, { ...data, categories: [...data.categories, { id: nextId(data.categories), name, color: PALETTE.includes(color) ? color : PALETTE[0] }] });
  },
};
export const answer: Answer = (source, args, store, storage, native) => sources[source](args, store, storage, native);
