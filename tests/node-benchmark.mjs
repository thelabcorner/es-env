import { performance } from 'node:perf_hooks';

import { createESENV } from '../build/node/core.js';

const root = {
  app: { name: 'Adobe Illustrator', version: '30.6.0' },
  ExternalObject: function ExternalObject() {},
  BridgeTalk: function BridgeTalk() {},
  ScriptUI: {},
  File: function File() {},
  Folder: function Folder() {}
};
root.Folder.temp = { exists: true };

const dollar = {
  version: '4.5.6',
  build: 'node-benchmark-fixture',
  engineName: 'benchmark',
  locale: 'en_US',
  os: 'Windows 11'
};
const env = createESENV(root, dollar);

function runBatch(operation, count) {
  let result;
  for (let i = 0; i < count; i += 1) result = operation();
  return result;
}

function median(values) {
  const ordered = values.slice().sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function percentile(values, fraction) {
  const ordered = values.slice().sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * fraction) - 1];
}

function measure(operation, count, reset) {
  for (let i = 0; i < 5; i += 1) {
    if (reset) reset();
    runBatch(operation, count);
  }

  const samplesUs = [];
  for (let i = 0; i <  nineSamples; i += 1) {
    if (reset) reset();
    const start = performance.now();
    runBatch(operation, count);
    samplesUs.push(((performance.now() - start) * 1000) / count);
  }
  return {
    operationsPerSample: count,
    medianUsPerCall: median(samplesUs),
    p95UsPerCall: percentile(samplesUs, 0.95),
    samplesUsPerCall: samplesUs
  };
}

const nineSamples = 9;
const results = {
  refreshedSnapshot: measure(
    () => env.snapshot(),
    1,
    () => env.refresh()
  ),
  cachedScalarRead: measure(
    () => env.read('host.family'),
    20000
  ),
  detachedSnapshot: measure(
    () => env.snapshot(),
    100
  ),
  explicitCapabilityProbe: measure(
    () => env.probe('socket'),
    1000
  )
};

console.log(JSON.stringify({
  authority: 'Node.js / V8 only; not ExtendScript engine performance evidence',
  runtime: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch
  },
  methodology: {
    timer: 'node:perf_hooks performance.now()',
    warmupBatches: 5,
    measuredSamples: nineSamples,
    note: 'The refreshed snapshot lane invalidates caches before each sample; capability probes are explicit.'
  },
  results
}, null, 2));
