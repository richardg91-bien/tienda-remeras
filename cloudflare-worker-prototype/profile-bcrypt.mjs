import assert from "node:assert/strict";
import WebSocket from "ws";

const inspectorUrl = process.env.WORKER_INSPECTOR_URL || "ws://127.0.0.1:9229/ws";
const workerUrl = process.env.WORKER_TEST_URL || "http://127.0.0.1:8787";
const socket = new WebSocket(inspectorUrl);
let nextId = 0;
const pending = new Map();

socket.on("message", (data) => {
  const message = JSON.parse(data.toString());
  if (!message.id) return;
  const operation = pending.get(message.id);
  if (!operation) return;
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error.message));
  else operation.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

try {
  await command("Profiler.enable");
  await command("Profiler.start");
  const response = await fetch(`${workerUrl}/benchmark/bcrypt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "SyntheticBcryptProbe123" }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  const { profile } = await command("Profiler.stop");
  const nodeById = new Map(profile.nodes.map((node) => [node.id, node]));
  const selfMicros = new Map();
  for (let index = 0; index < profile.samples.length; index += 1) {
    const node = nodeById.get(profile.samples[index]);
    const key = node?.callFrame?.functionName || "(anonymous)";
    selfMicros.set(key, (selfMicros.get(key) || 0) + (profile.timeDeltas[index] || 0));
  }
  const hottestFunctions = [...selfMicros]
    .filter(([functionName]) => functionName !== "(idle)")
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([functionName, microseconds]) => ({ functionName, sampledCpuMs: microseconds / 1000 }));
  console.log(JSON.stringify({
    runtime: "local workerd via Wrangler inspector",
    bcryptCost: 12,
    workerElapsedMs: result.elapsedMs,
    profilerSampledCpuMsExcludingIdle: [...selfMicros]
      .filter(([functionName]) => functionName !== "(idle)")
      .reduce((total, [, microseconds]) => total + microseconds, 0) / 1000,
    hottestFunctions,
    caveat: "Local CPU profile on this host; not a hosted Workers Free invocation metric.",
  }, null, 2));
} finally {
  socket.terminate();
}
