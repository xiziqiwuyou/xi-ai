import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "tools", "provider-smoke-test.mjs");

function run(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [runner, ...args], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function cleanEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  for (const name of ["XI_AI_TOKEN", "OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"]) {
    if (!(name in overrides)) delete env[name];
  }
  return env;
}

async function startFixture() {
  const server = http.createServer((request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        choices: [{ message: { content: "fixture response" }, finish_reason: "stop" }],
        usage: { total_tokens: 3 },
      }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  const dryRun = await run(["--dry-run", "--stream"], cleanEnv());
  assert.equal(dryRun.code, 0, dryRun.stderr);
  const dryJson = JSON.parse(dryRun.stdout);
  assert.equal(dryJson.results.length, 3);
  assert.equal(dryJson.results.find((item) => item.provider === "gemini").requestValid, true);
  assert.match(dryRun.stdout, /streamGenerateContent/);
  assert.doesNotMatch(dryRun.stdout, /TOKEN|API_KEY|unit-test-secret/);

  const missing = await run(["--provider", "openai"], cleanEnv());
  assert.equal(missing.code, 1);
  assert.match(missing.stdout, /missing_openai_api_key/);

  const fixture = await startFixture();
  try {
    const live = await run(["--provider", "openai"], cleanEnv({
      XI_AI_BASE_URL: fixture.baseUrl,
      XI_AI_TOKEN: "unit-test-secret",
    }));
    assert.equal(live.code, 0, live.stderr);
    assert.match(live.stdout, /"status": 200/);
    assert.match(live.stdout, /"usagePresent": true/);
    assert.doesNotMatch(live.stdout, /unit-test-secret|fixture response/);
  } finally {
    await new Promise((resolve) => fixture.server.close(resolve));
  }

  console.log("provider smoke runner contract passed");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
