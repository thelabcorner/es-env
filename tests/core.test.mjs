import assert from 'node:assert/strict';
import test from 'node:test';

import { createESENV } from '../build/node/core.js';

function createFixture(options = {}) {
  const reads = Object.create(null);
  const folderConstructor = function Folder() {};
  folderConstructor.temp = { exists: true, fsName: 'not returned' };

  const app = {
    name: 'Adobe Illustrator',
    version: '30.6.0'
  };
  const root = {
    app,
    ExternalObject: function ExternalObject() {},
    BridgeTalk: function BridgeTalk() {},
    ScriptUI: {},
    File: function File() {},
    Folder: folderConstructor
  };
  const dollar = {
    global: root,
    version: '4.5.6',
    build: 'observed-build',
    engineName: 'main',
    locale: 'en_US',
    os: 'Windows 11'
  };

  if (options.throwOnExternalObject) {
    Object.defineProperty(root, 'ExternalObject', {
      configurable: true,
      get() {
        throw new Error('host getter failure');
      }
    });
  }

  return {
    api: createESENV(root, dollar),
    root,
    app,
    dollar,
    reads
  };
}

test('records raw host facts and labels derived classifications as inferred', () => {
  const fixture = createFixture();
  const snapshot = fixture.api.snapshot();

  assert.equal(snapshot.schemaVersion, 1);
  assert.deepEqual(snapshot.host.name, {
    value: 'Adobe Illustrator',
    evidence: 'observed',
    source: 'app.name',
    detail: null
  });
  assert.equal(snapshot.host.version.value, '30.6.0');
  assert.equal(snapshot.host.version.evidence, 'observed');
  assert.equal(snapshot.host.family.value, 'illustrator');
  assert.equal(snapshot.host.family.evidence, 'inferred');
  assert.equal(snapshot.runtime.kind.value, 'ExtendScript');
  assert.equal(snapshot.runtime.version.value, '4.5.6');
  assert.equal(snapshot.runtime.languageProfile.evidence, 'documented');
  assert.equal(snapshot.platform.os.value, 'Windows 11');
  assert.equal(snapshot.platform.family.value, 'windows');
  assert.equal(snapshot.platform.family.evidence, 'inferred');
  assert.equal(snapshot.platform.architecture.value, null);
  assert.equal(snapshot.platform.architecture.evidence, 'unknown');
  assert.equal(snapshot.locale.value, 'en_US');
});

test('represents missing identity and capability evidence as unknown, not false', () => {
  const api = createESENV(null, null);
  const snapshot = api.snapshot();

  assert.equal(snapshot.host.name.value, null);
  assert.equal(snapshot.host.name.evidence, 'unknown');
  assert.equal(snapshot.runtime.version.value, null);
  assert.equal(snapshot.capabilities.socket.available.value, null);
  assert.equal(snapshot.capabilities.socket.available.evidence, 'unknown');
  assert.equal(snapshot.capabilities.filesystem.available.value, null);
  assert.equal(snapshot.capabilities.persistentEngine.available.value, null);
});

test('hot stable reads are cached primitives; explicit refresh re-reads the host', () => {
  const fixture = createFixture();

  assert.equal(fixture.api.read('host.version'), '30.6.0');
  fixture.app.version = '31.0.0';
  assert.equal(fixture.api.read('host.version'), '30.6.0');

  fixture.api.refresh();
  assert.equal(fixture.api.read('host.version'), '31.0.0');
  assert.equal(fixture.api.read('host.family'), 'illustrator');
  assert.throws(() => fixture.api.read('unbounded.user.key'), TypeError);
});

test('read and snapshot are passive and do not inspect or arm mutable capabilities', () => {
  const fixture = createFixture();
  let capabilityReads = 0;
  for (const name of ['ExternalObject', 'File', 'Folder']) {
    Object.defineProperty(fixture.root, name, {
      configurable: true,
      get() {
        capabilityReads += 1;
        return function HostCapability() {};
      }
    });
  }

  assert.equal(fixture.api.read('host.name'), 'Adobe Illustrator');
  const snapshot = fixture.api.snapshot();

  assert.equal(Object.hasOwn(fixture.root, '__ESENV_PERSISTENCE_PROBE_V1__'), false);
  assert.equal(capabilityReads, 0);
  assert.equal(snapshot.capabilities.externalObject.available.evidence, 'unknown');
  assert.equal(snapshot.capabilities.filesystem.available.evidence, 'unknown');
  assert.equal(snapshot.capabilities.persistentEngine.available.evidence, 'unknown');
});

test('snapshots are detached; mutating one cannot corrupt the cached facts', () => {
  const fixture = createFixture();
  fixture.api.probe('externalObject');
  const first = fixture.api.snapshot();
  first.host.name.value = 'changed by caller';
  first.capabilities.externalObject.available.value = false;

  const second = fixture.api.snapshot();
  assert.equal(second.host.name.value, 'Adobe Illustrator');
  assert.equal(second.capabilities.externalObject.available.value, true);
});

test('mutable capabilities are targeted, refreshable, and only surface-tested', () => {
  const fixture = createFixture();
  const initial = fixture.api.snapshot();
  assert.equal(initial.capabilities.socket.available.value, null);
  assert.equal(initial.capabilities.socket.available.evidence, 'unknown');

  const initialProbe = fixture.api.probe('socket');
  assert.equal(initialProbe.available.value, false);

  fixture.root.Socket = function Socket() {};
  const fresh = fixture.api.probe('socket');
  assert.equal(fresh.available.value, true);
  assert.equal(fresh.available.evidence, 'observed');
  assert.match(fresh.available.detail, /surface/);
  assert.equal(fixture.api.snapshot().capabilities.socket.available.value, true);

  delete fixture.root.Socket;
  fixture.api.refresh();
  assert.equal(fixture.api.snapshot().capabilities.socket.available.value, null);
  assert.equal(fixture.api.probe('socket').available.value, false);
});

test('filesystem reports its API surface and passive temp existence only when explicitly probed', () => {
  let fileConstructorCalls = 0;
  const fixture = createFixture();
  const fileConstructor = function File() {
    fileConstructorCalls += 1;
  };
  fixture.root.File = fileConstructor;

  const fileSystem = fixture.api.probe('filesystem');
  assert.equal(fileSystem.available.value, true);
  assert.equal(fileSystem.temporaryDirectoryExists.value, true);
  assert.equal(fileSystem.temporaryDirectoryExists.evidence, 'observed');
  assert.equal(fileConstructorCalls, 0);
  assert.equal(fileSystem.available.detail.includes('written'), true);
});

test('a throwing host capability getter remains unknown and does not abort inspection', () => {
  const fixture = createFixture({ throwOnExternalObject: true });
  const snapshot = fixture.api.snapshot();

  assert.equal(snapshot.capabilities.externalObject.available.evidence, 'unknown');
  const externalObject = fixture.api.probe('externalObject');
  assert.equal(externalObject.available.value, null);
  const bridgeTalk = fixture.api.probe('bridgeTalk');
  assert.equal(bridgeTalk.available.value, true);
});

test('persistent-engine observation needs a new facade and cleans its sentinel there', () => {
  const fixture = createFixture();
  const facadeA = fixture.api;

  const first = facadeA.probe('persistentEngine');
  assert.equal(first.available.value, null);
  assert.match(first.available.detail, /evaluate ESENV again/);
  assert.equal(fixture.root.__ESENV_PERSISTENCE_PROBE_V1__, 'ESENV:PERSISTENCE:1');

  const sameFacade = facadeA.probe('persistentEngine');
  assert.equal(sameFacade.available.value, null);
  assert.equal(sameFacade.available.evidence, 'unknown');
  assert.match(sameFacade.available.detail, /only a new facade/);
  assert.equal(fixture.root.__ESENV_PERSISTENCE_PROBE_V1__, 'ESENV:PERSISTENCE:1');

  const facadeB = createESENV(fixture.root, fixture.dollar);
  const secondFacade = facadeB.probe('persistentEngine');
  assert.equal(secondFacade.available.value, true);
  assert.equal(secondFacade.available.evidence, 'observed');
  assert.match(secondFacade.available.detail, /different createESENV facade/);
  assert.equal(Object.hasOwn(fixture.root, '__ESENV_PERSISTENCE_PROBE_V1__'), false);
});

test('persistent-engine probe never overwrites an occupied sentinel', () => {
  const fixture = createFixture();
  fixture.root.__ESENV_PERSISTENCE_PROBE_V1__ = 'caller-owned';

  const observation = fixture.api.probe('persistentEngine');
  assert.equal(observation.available.value, null);
  assert.match(observation.available.detail, /not overwritten/);
  assert.equal(fixture.root.__ESENV_PERSISTENCE_PROBE_V1__, 'caller-owned');
});

test('unknown capability names fail closed', () => {
  const fixture = createFixture();
  assert.throws(() => fixture.api.probe('some-arbitrary-capability'), TypeError);
});
