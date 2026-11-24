// Storage for employees and messages.
//
// Two backends, chosen automatically:
// - Redis (Upstash / Vercel KV) when KV_REST_API_URL + KV_REST_API_TOKEN
//   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) are set. Use this
//   on Vercel, where the file system is read-only. On first use the database
//   is filled with the contents of data.json and messages.json.
// - JSON files (data.json / messages.json) otherwise, e.g. `npm run dev`.
//
// Writes are read-modify-write under a lock, so two requests can't overwrite
// each other's changes.
import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import seedEmployees from "@/data.json";
import seedMessages from "@/messages.json";

const SEEDS = { employees: seedEmployees, messages: seedMessages };

/* ============================== Redis ============================== */

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const KEY_PREFIX = "bhrm:";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function redisRead(name) {
  const value = await redis.get(KEY_PREFIX + name);
  if (value === null || value === undefined) {
    // first run: seed from the JSON file shipped with the app
    const seed = structuredClone(SEEDS[name] || []);
    await redis.set(KEY_PREFIX + name, seed, { nx: true });
    return structuredClone((await redis.get(KEY_PREFIX + name)) ?? seed);
  }
  return value;
}

async function withRedisLock(name, task) {
  const lockKey = `${KEY_PREFIX}lock:${name}`;
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 50; attempt++) {
    const ok = await redis.set(lockKey, token, { nx: true, px: 5000 });
    if (ok) {
      try {
        return await task();
      } finally {
        // release only our own lock
        if ((await redis.get(lockKey)) === token) await redis.del(lockKey);
      }
    }
    await sleep(100);
  }
  throw new Error("Database is busy, please try again");
}

/* ============================== Files ============================== */

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const FILES = {
  employees: path.join(DATA_DIR, "data.json"),
  messages: path.join(DATA_DIR, "messages.json"),
};

let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function fileRead(name) {
  try {
    const raw = await fs.readFile(FILES[name], "utf-8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    if (err.code === "ENOENT") return structuredClone(SEEDS[name] || []);
    throw err;
  }
}

async function fileWrite(name, data) {
  const file = FILES[name];
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

/* ============================== API ============================== */

export const storage = redis ? "redis" : "file";

/** Read a collection ("employees" | "messages"). */
export function read(name) {
  return redis ? redisRead(name) : enqueue(() => fileRead(name));
}

/**
 * Read-modify-write a collection atomically.
 * `mutator` receives the current array and returns { data, result }:
 * `data` is saved, `result` is returned to the caller.
 */
export function update(name, mutator) {
  if (redis) {
    return withRedisLock(name, async () => {
      const current = await redisRead(name);
      const { data, result } = await mutator(current);
      await redis.set(KEY_PREFIX + name, data);
      return result;
    });
  }
  return enqueue(async () => {
    const current = await fileRead(name);
    const { data, result } = await mutator(current);
    await fileWrite(name, data);
    return result;
  });
}
