// Tiny JSON-file "database".
// Reads and writes are serialised through a queue so two requests can never
// overwrite each other's changes, and writes go through a temp file + rename
// so a crash mid-write can't leave a half-written (corrupted) JSON file.
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || process.cwd();

export const FILES = {
  employees: path.join(DATA_DIR, "data.json"),
  messages: path.join(DATA_DIR, "messages.json"),
};

let queue = Promise.resolve();

function enqueue(task) {
  const run = queue.then(task, task);
  // keep the chain alive even if a task fails
  queue = run.catch(() => {});
  return run;
}

async function readJson(file) {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

/** Read a collection ("employees" | "messages"). */
export function read(name) {
  return enqueue(() => readJson(FILES[name]));
}

/**
 * Read-modify-write a collection atomically.
 * `mutator` receives the current array and returns { data, result }:
 * `data` is saved, `result` is returned to the caller.
 */
export function update(name, mutator) {
  return enqueue(async () => {
    const current = await readJson(FILES[name]);
    const { data, result } = await mutator(current);
    await writeJson(FILES[name], data);
    return result;
  });
}
