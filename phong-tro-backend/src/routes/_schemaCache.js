/** Chạy fn tối đa một lần mỗi key trong vòng đời process — tránh DDL lặp trên mọi request. */
const completed = new Set();
const pending = new Map();

async function once(key, fn) {
  if (completed.has(key)) return;
  if (pending.has(key)) return pending.get(key);

  const promise = (async () => {
    await fn();
    completed.add(key);
  })().finally(() => {
    pending.delete(key);
  });

  pending.set(key, promise);
  return promise;
}

module.exports = { once };
