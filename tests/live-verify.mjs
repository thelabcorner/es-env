import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as comtoolSdk from '../../comtool-v2/sdk/node/index.mjs';
import {
  runEvalWithResultModeCompatibility,
  runFileWithResultModeCompatibility
} from '../../extendscript-toolchain/src/comtool.mjs';

const { ComToolLocalRuntime } = comtoolSdk;

const here = new URL('.', import.meta.url);
const bundlePath = resolve(fileURLToPath(new URL('../dist/ESENV.jsx', here)));
const runtime = await ComToolLocalRuntime.start({ host: 'illustrator' });
let session = null;
let leaseAcquired = false;
let reloadKey = null;
let persistenceFacadeKey = null;

function requireSuccess(run, label) {
  if (!run || run.exitCode !== 0) {
    const classification = run && run.classification ? run.classification : 'no-result';
    throw new Error(label + ' failed through COMTool V2: ' + classification);
  }
  return run.value;
}

async function evalCode(source) {
  const run = await runEvalWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    kind: 'expression',
    source: '(function () {' + source + '}())',
    effects: 'unknown',
    watchdogMs: 120_000
  });
  return requireSuccess(run, 'ExtendScript evaluation');
}

try {
  session = await runtime.openSession({
    host: 'illustrator',
    launch: false,
    lease: true,
    leaseTtlMs: 300_000,
    leaseWaitMs: 60_000
  });
  leaseAcquired = true;

  // A fresh-artifact check clears only ESENV-owned globals before first load.
  await evalCode(
    'delete $.global["ESENV"];' +
    'if ($.global["__ESENV_PERSISTENCE_PROBE_V1__"] === "ESENV:PERSISTENCE:1") {' +
    'delete $.global["__ESENV_PERSISTENCE_PROBE_V1__"];' +
    '}' +
    'return true;'
  );

  const load = await runFileWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    file: bundlePath,
    effects: 'unknown',
    watchdogMs: 120_000
  });
  requireSuccess(load, 'Fresh ESENV bundle load');

  const snapshot = await evalCode(
    'var env = $.global["ESENV"];' +
    'if (!env || typeof env.read !== "function" || typeof env.snapshot !== "function") {' +
    'throw new Error("ESENV API surface missing");' +
    '}' +
    'return env.snapshot();'
  );
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.host.name.evidence, 'observed');
  assert.equal(typeof snapshot.host.name.value, 'string');
  assert.equal(snapshot.host.version.evidence, 'observed');
  assert.equal(snapshot.runtime.kind.value, 'ExtendScript');
  assert.equal(snapshot.runtime.version.evidence, 'observed');
  assert.equal(snapshot.capabilities.externalObject.available.evidence, 'unknown');
  assert.equal(snapshot.capabilities.filesystem.available.evidence, 'unknown');
  assert.equal(snapshot.capabilities.persistentEngine.available.evidence, 'unknown');

  const passiveSnapshot = await evalCode(
    'return { sentinelPresent: "__ESENV_PERSISTENCE_PROBE_V1__" in $.global,' +
    ' externalObjectEvidence: $.global["ESENV"].snapshot().capabilities.externalObject.available.evidence };'
  );
  assert.equal(passiveSnapshot.sentinelPresent, false);
  assert.equal(passiveSnapshot.externalObjectEvidence, 'unknown');

  const hotReads = await evalCode(
    'var env = $.global["ESENV"];' +
    'var first = env.read("host.name");' +
    'var second = env.read("host.name");' +
    'return { first: first, second: second, same: first === second };'
  );
  assert.equal(hotReads.first, snapshot.host.name.value);
  assert.equal(hotReads.second, snapshot.host.name.value);
  assert.equal(hotReads.same, true);

  const explicitCapabilities = await evalCode(
    'var env = $.global["ESENV"];' +
    'return { externalObject: env.probe("externalObject"), filesystem: env.probe("filesystem") };'
  );
  assert.equal(explicitCapabilities.externalObject.available.evidence, 'observed');
  assert.equal(explicitCapabilities.filesystem.available.detail.includes('written'), true);

  const socket = await evalCode(
    'return $.global["ESENV"].probe("socket");'
  );
  assert.ok(socket.available.evidence === 'observed' || socket.available.evidence === 'unknown');
  assert.ok(socket.available.value === true || socket.available.value === false || socket.available.value === null);

  const firstPersistence = await evalCode(
    'return $.global["ESENV"].probe("persistentEngine");'
  );
  assert.equal(firstPersistence.available.value, null);
  const sameFacadePersistence = await evalCode(
    'return $.global["ESENV"].probe("persistentEngine");'
  );
  assert.equal(sameFacadePersistence.available.value, null);
  assert.equal(sameFacadePersistence.available.evidence, 'unknown');
  assert.match(sameFacadePersistence.available.detail, /only a new facade/);

  // Reload the actual JSX so createESENV creates facade B over the same global.
  persistenceFacadeKey = '__ESENV_PERSISTENCE_FACADE_' + randomUUID().replace(/-/g, '') + '__';
  await evalCode(
    'if (' + JSON.stringify(persistenceFacadeKey) + ' in $.global) {' +
    'throw new Error("persistence facade key collision");' +
    '}' +
    '$.global[' + JSON.stringify(persistenceFacadeKey) + '] = $.global["ESENV"];' +
    'return true;'
  );
  const persistenceReload = await runFileWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    file: bundlePath,
    effects: 'unknown',
    watchdogMs: 120_000
  });
  requireSuccess(persistenceReload, 'ESENV persistence-probe facade reload');
  const reloadedFacadeState = await evalCode(
    'var key = ' + JSON.stringify(persistenceFacadeKey) + ';' +
    'var oldFacade = $.global[key];' +
    'var newFacade = $.global["ESENV"];' +
    'var sentinelPresent = $.global["__ESENV_PERSISTENCE_PROBE_V1__"] === "ESENV:PERSISTENCE:1";' +
    'delete $.global[key];' +
    'return { replaced: oldFacade !== newFacade, sentinelPresent: sentinelPresent };'
  );
  persistenceFacadeKey = null;
  assert.equal(reloadedFacadeState.replaced, true);
  assert.equal(reloadedFacadeState.sentinelPresent, true);

  const secondFacadePersistence = await evalCode(
    'return $.global["ESENV"].probe("persistentEngine");'
  );
  assert.equal(secondFacadePersistence.available.value, true);
  assert.equal(secondFacadePersistence.available.evidence, 'observed');
  const persistenceCleanup = await evalCode(
    'return "__ESENV_PERSISTENCE_PROBE_V1__" in $.global;'
  );
  assert.equal(persistenceCleanup, false);

  // Reload policy: evaluating the same artifact deliberately installs a new
  // facade and cache. This avoids preserving stale code under a reused version.
  reloadKey = '__ESENV_RELOAD_' + randomUUID().replace(/-/g, '') + '__';
  await evalCode(
    'if (' + JSON.stringify(reloadKey) + ' in $.global) {' +
    'throw new Error("reload test key collision");' +
    '}' +
    '$.global[' + JSON.stringify(reloadKey) + '] = $.global["ESENV"];' +
    'return true;'
  );
  const reload = await runFileWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    file: bundlePath,
    effects: 'unknown',
    watchdogMs: 120_000
  });
  requireSuccess(reload, 'ESENV same-build reload');
  const replacementObserved = await evalCode(
    'var key = ' + JSON.stringify(reloadKey) + ';' +
    'var replaced = $.global[key] !== $.global["ESENV"];' +
    'delete $.global[key];' +
    'return replaced;'
  );
  reloadKey = null;
  assert.equal(replacementObserved, true);

  console.log(JSON.stringify({
    authority: 'COMTool V2 RuntimeHost -> Supervisor -> Worker',
    targetHost: 'illustrator',
    application: snapshot.host.name.value,
    applicationVersion: snapshot.host.version.value,
    extendScriptVersion: snapshot.runtime.version.value,
    platform: snapshot.platform.os.value,
    apiSchemaVersion: snapshot.schemaVersion,
    persistentEngine: secondFacadePersistence.available.value === true ? 'observed-persistent' : 'unknown',
    reloadPolicy: 'same artifact replaces the global facade and its private cache'
  }, null, 2));
} finally {
  if (session) {
    try {
      let cleanup = 'if ($.global["__ESENV_PERSISTENCE_PROBE_V1__"] === "ESENV:PERSISTENCE:1") {' +
        'delete $.global["__ESENV_PERSISTENCE_PROBE_V1__"];' +
        '}';
      if (persistenceFacadeKey !== null) {
        cleanup += 'delete $.global[' + JSON.stringify(persistenceFacadeKey) + '];';
      }
      if (reloadKey !== null) {
        cleanup += 'delete $.global[' + JSON.stringify(reloadKey) + '];';
      }
      await evalCode(cleanup + 'return true;');
    } catch (error) {
      // Preserve the primary test error; COMTool retains its own execution/recovery record.
    }
  }
  if (session && leaseAcquired) {
    await session.releaseLease();
  }
  await runtime.close();
}
