import assert from 'node:assert/strict';
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

function requireSuccess(run, label) {
  if (!run || run.exitCode !== 0) {
    const classification = run && run.classification ? run.classification : 'no-result';
    throw new Error(label + ' failed through COMTool V2: ' + classification);
  }
  return run.value;
}

function median(values) {
  const ordered = values.slice().sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
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

  const load = await runFileWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    file: bundlePath,
    effects: 'unknown',
    watchdogMs: 120_000
  });
  requireSuccess(load, 'ESENV benchmark bundle load');

  const measured = await runEvalWithResultModeCompatibility({
    sdk: comtoolSdk,
    runtime,
    session,
    kind: 'expression',
    effects: 'unknown',
    watchdogMs: 120_000,
    source: '(function () {' +
      'var env = $.global["ESENV"];' +
      'var cold = [], hotRead = [], hotSnapshot = [], oneProbe = [];' +
      'var i, j, discard, elapsed;' +
      'for (i = 0; i < 7; i += 1) {' +
        'env.refresh();' +
        'discard = $.hiresTimer;' +
        'env.snapshot();' +
        'elapsed = $.hiresTimer;' +
        'if (elapsed >= 0) cold.push(elapsed);' +
      '}' +
      'env.read("host.family");' +
      'for (i = 0; i < 7; i += 1) {' +
        'discard = $.hiresTimer;' +
        'for (j = 0; j < 5000; j += 1) env.read("host.family");' +
        'elapsed = $.hiresTimer;' +
        'if (elapsed >= 0) hotRead.push(elapsed / 5000);' +
      '}' +
      'env.snapshot();' +
      'for (i = 0; i < 7; i += 1) {' +
        'discard = $.hiresTimer;' +
        'for (j = 0; j < 100; j += 1) env.snapshot();' +
        'elapsed = $.hiresTimer;' +
        'if (elapsed >= 0) hotSnapshot.push(elapsed / 100);' +
      '}' +
      'for (i = 0; i < 7; i += 1) {' +
        'discard = $.hiresTimer;' +
        'for (j = 0; j < 1000; j += 1) env.probe("socket");' +
        'elapsed = $.hiresTimer;' +
        'if (elapsed >= 0) oneProbe.push(elapsed / 1000);' +
      '}' +
      'return {' +
        'application: env.read("host.name"),' +
        'applicationVersion: env.read("host.version"),' +
        'extendScriptVersion: env.read("runtime.version"),' +
        'coldSnapshotUs: cold,' +
        'hotScalarReadUsPerCall: hotRead,' +
        'hotSnapshotUsPerCall: hotSnapshot,' +
        'singleCapabilityProbeUsPerCall: oneProbe' +
      '};' +
    '}())'
  });
  const result = requireSuccess(measured, 'ESENV live benchmark');
  assert.ok(result.coldSnapshotUs.length >= 5);
  assert.ok(result.hotScalarReadUsPerCall.length >= 5);

  console.log(JSON.stringify({
    authority: 'COMTool V2 RuntimeHost -> Supervisor -> Worker',
    environment: {
      application: result.application,
      applicationVersion: result.applicationVersion,
      extendScriptVersion: result.extendScriptVersion
    },
    methodology: {
      timer: '$.hiresTimer delta; read immediately before and after each lane',
      repetitions: 7,
      coldSnapshot: 'refresh followed by one full snapshot, microseconds per call',
      hotScalarRead: '5,000 cached host.family reads per sample, microseconds per call',
      hotSnapshot: '100 detached evidence snapshots per sample, microseconds per call',
      singleCapabilityProbe: '1,000 Socket surface probes per sample, microseconds per call'
    },
    medianUs: {
      coldSnapshot: median(result.coldSnapshotUs),
      hotScalarRead: median(result.hotScalarReadUsPerCall),
      hotSnapshot: median(result.hotSnapshotUsPerCall),
      singleCapabilityProbe: median(result.singleCapabilityProbeUsPerCall)
    },
    rawSamplesUs: {
      coldSnapshot: result.coldSnapshotUs,
      hotScalarRead: result.hotScalarReadUsPerCall,
      hotSnapshot: result.hotSnapshotUsPerCall,
      singleCapabilityProbe: result.singleCapabilityProbeUsPerCall
    }
  }, null, 2));
} finally {
  if (session && leaseAcquired) {
    await session.releaseLease();
  }
  await runtime.close();
}
