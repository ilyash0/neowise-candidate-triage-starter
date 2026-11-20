import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./server.mjs";

test("AI failure falls back to manual review and empty input is rejected", async (t) => {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/triage`;

  const failure = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "[bad-json]" }),
  });
  assert.equal(failure.status, 200);
  assert.deepEqual(await failure.json(), { status: "manual_review", topic: null, draft: null });

  const started = Date.now();
  const timeout = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "[timeout]" }),
  });
  assert.equal(timeout.status, 200);
  assert.deepEqual(await timeout.json(), { status: "manual_review", topic: null, draft: null });
  assert.ok(Date.now() - started < 900, "AI timeout should be limited to 300 ms");

  const empty = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "   " }),
  });
  assert.equal(empty.status, 400);
  assert.deepEqual(await empty.json(), { status: "invalid_input" });
});
