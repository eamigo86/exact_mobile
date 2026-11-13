import type { Answer, Result, Sources, Storage } from './app.contract.d.ts';

const FILE = 'app:/data/todo.json';
export const grants = [`fs.read ${FILE}`, `fs.write ${FILE}`].join('\n');

type Task = Result<'loadTasks'>[number];
type Category = Result<'loadCategories'>[number];
type Data = { categories: Category[]; tasks: Task[] };

const SEED: Category[] = ['Home', 'Work', 'Personal'].map((name, i) => ({ id: String(i + 1), name }));

// The file is the only store; no file yet (also the build's 'bake') is the seeded, empty app.
const load = (storage: Storage): Promise<Data> => storage.fs.readFile(FILE).then(
  (bytes) => JSON.parse(new TextDecoder().decode(bytes)) as Data,
  (e) => { if (e.code === 'ENOENT' || e.code === 'bake') return { categories: SEED, tasks: [] }; throw e; });
const save = async (storage: Storage, data: Data): Promise<Result<'saveTask'>> => {
  await storage.fs.atomicWriteFile(FILE, new TextEncoder().encode(JSON.stringify(data)));
  return { ok: true, error: '' };
};
const nextId = (rows: { id: string }[]) => String(Math.max(0, ...rows.map((r) => Number(r.id))) + 1);

const sources: Sources = {
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
  addCategory: async ([name], _store, storage) => {
    const data = await load(storage);
    const same = data.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (same) return { ok: false, error: `There is already a category called ${same.name}.` };
    return save(storage, { ...data, categories: [...data.categories, { id: nextId(data.categories), name }] });
  },
};
export const answer: Answer = (source, args, store, storage, native) => sources[source](args, store, storage, native);
