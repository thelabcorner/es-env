import type {
  CapabilityName,
  CapabilityObservation,
  ESENV,
  EnvironmentSnapshot,
  Fact,
  StableFactName,
  StableFacts
} from './types.js';

interface PropertyRead {
  state: 'value' | 'missing' | 'error';
  value: any;
}

type CachedCapabilities = {
  [name: string]: CapabilityObservation | undefined;
};

interface PersistenceProbeState {
  armed: boolean;
}

var LANGUAGE_PROFILE_SOURCE =
  'https://extendscript.docsforadobe.dev/introduction/extendscript-overview/';
var PERSISTENCE_KEY = '__ESENV_PERSISTENCE_PROBE_V1__';
var PERSISTENCE_TOKEN = 'ESENV:PERSISTENCE:1';
function makeFact<T>(
  value: T | null,
  evidence: Fact<T>['evidence'],
  source: string,
  detail: string | null
): Fact<T> {
  return {
    value: value,
    evidence: evidence,
    source: source,
    detail: detail
  };
}

function unknownFact<T>(source: string, detail: string): Fact<T> {
  return makeFact<T>(null, 'unknown', source, detail);
}

function readProperty(object: any, name: string): PropertyRead {
  if (object === null || object === undefined) {
    return { state: 'missing', value: undefined };
  }
  try {
    var value = object[name];
    if (value === undefined || value === null) {
      return { state: 'missing', value: value };
    }
    return { state: 'value', value: value };
  } catch (error) {
    return { state: 'error', value: undefined };
  }
}

function readStringFact(object: any, name: string, source: string): Fact<string> {
  var read = readProperty(object, name);
  if (read.state === 'error') {
    return unknownFact<string>(source, 'The host property could not be read.');
  }
  if (read.state === 'missing') {
    return unknownFact<string>(source, 'The host property was not exposed.');
  }
  try {
    return makeFact<string>(String(read.value), 'observed', source, null);
  } catch (error) {
    return unknownFact<string>(source, 'The host value could not be converted to text.');
  }
}

function inferFamily(rawName: Fact<string>): Fact<string> {
  if (rawName.value === null) {
    return unknownFact<string>('app.name', 'Application identity is unavailable.');
  }
  var name = rawName.value.toLowerCase();
  if (name.indexOf('illustrator') >= 0) return inferredFamily('illustrator');
  if (name.indexOf('photoshop') >= 0) return inferredFamily('photoshop');
  if (name.indexOf('indesign') >= 0) return inferredFamily('indesign');
  if (name.indexOf('after effects') >= 0) return inferredFamily('after-effects');
  if (name.indexOf('premiere pro') >= 0) return inferredFamily('premiere-pro');
  if (name.indexOf('bridge') >= 0) return inferredFamily('bridge');
  if (name.indexOf('incopy') >= 0) return inferredFamily('incopy');
  if (name.indexOf('audition') >= 0) return inferredFamily('audition');
  return unknownFact<string>('app.name', 'The application name did not match a known product token.');
}

function inferredFamily(value: string): Fact<string> {
  return makeFact<string>(value, 'inferred', 'app.name',
    'Inferred from a known product-name token; the raw application name is retained.');
}

function inferPlatform(osFact: Fact<string>): Fact<string> {
  if (osFact.value === null) {
    return unknownFact<string>('$.os', 'The ExtendScript operating-system string is unavailable.');
  }
  var osName = osFact.value.toLowerCase();
  if (osName.indexOf('windows') >= 0) {
    return makeFact<string>('windows', 'inferred', '$.os',
      'Inferred from the observed operating-system string.');
  }
  if (osName.indexOf('mac os') >= 0 || osName.indexOf('macos') >= 0 || osName.indexOf('macintosh') >= 0) {
    return makeFact<string>('macos', 'inferred', '$.os',
      'Inferred from the observed operating-system string.');
  }
  if (osName.indexOf('linux') >= 0) {
    return makeFact<string>('linux', 'inferred', '$.os',
      'Inferred from the observed operating-system string.');
  }
  return unknownFact<string>('$.os', 'The operating-system string did not match a known platform token.');
}

function readPresence(root: any, name: string): Fact<boolean> {
  var source = '$.global.' + name;
  if (root === null || root === undefined) {
    return unknownFact<boolean>(source, 'The ExtendScript global object is unavailable.');
  }
  var result = readProperty(root, name);
  if (result.state === 'error') {
    return unknownFact<boolean>(source, 'The host capability property could not be read.');
  }
  if (result.state === 'missing') {
    return makeFact<boolean>(false, 'observed', source,
      'The capability global is not exposed in this execution context.');
  }
  return makeFact<boolean>(true, 'observed', source,
    'Only the host API surface is observed; operational support is not tested.');
}

function filesystemObservation(root: any): CapabilityObservation {
  var file = readPresence(root, 'File');
  var folder = readPresence(root, 'Folder');
  var available: Fact<boolean>;
  if (file.value === true && folder.value === true) {
    available = makeFact<boolean>(true, 'observed', '$.global.File + $.global.Folder',
      'Filesystem API surface is present; no file is opened or written.');
  } else if (file.value === false || folder.value === false) {
    available = makeFact<boolean>(false, 'observed', '$.global.File + $.global.Folder',
      'At least one required filesystem API global is not exposed.');
  } else {
    available = unknownFact<boolean>('$.global.File + $.global.Folder',
      'The filesystem API surface could not be determined.');
  }

  var temporaryDirectoryExists = unknownFact<boolean>('Folder.temp.exists',
    'The Folder API surface was not available for a passive temporary-directory check.');
  if (folder.value === true) {
    var folderConstructor = readProperty(root, 'Folder');
    var temporaryFolder = readProperty(folderConstructor.value, 'temp');
    if (temporaryFolder.state === 'value') {
      var exists = readProperty(temporaryFolder.value, 'exists');
      if (exists.state === 'value' && typeof exists.value === 'boolean') {
        temporaryDirectoryExists = makeFact<boolean>(exists.value, 'observed', 'Folder.temp.exists',
          'Read-only existence observation; path, readability, and writability are not claimed.');
      } else if (exists.state === 'error') {
        temporaryDirectoryExists = unknownFact<boolean>('Folder.temp.exists',
          'The temporary-directory existence property could not be read.');
      }
    } else if (temporaryFolder.state === 'error') {
      temporaryDirectoryExists = unknownFact<boolean>('Folder.temp',
        'The temporary-folder property could not be read.');
    }
  }
  return {
    available: available,
    temporaryDirectoryExists: temporaryDirectoryExists
  };
}

function capabilitySource(name: CapabilityName): string {
  if (name === 'externalObject') return '$.global.ExternalObject';
  if (name === 'socket') return '$.global.Socket';
  if (name === 'bridgeTalk') return '$.global.BridgeTalk';
  if (name === 'scriptUI') return '$.global.ScriptUI';
  if (name === 'filesystem') return '$.global.File + $.global.Folder';
  return '$.global.' + PERSISTENCE_KEY;
}

function unknownCapability(name: CapabilityName, detail: string): CapabilityObservation {
  return {
    available: unknownFact<boolean>(capabilitySource(name), detail),
    temporaryDirectoryExists: null
  };
}

function initialCapabilityCache(): CachedCapabilities {
  var detail = 'Not probed; snapshots do not inspect mutable host capabilities.';
  return {
    externalObject: unknownCapability('externalObject', detail),
    socket: unknownCapability('socket', detail),
    bridgeTalk: unknownCapability('bridgeTalk', detail),
    scriptUI: unknownCapability('scriptUI', detail),
    filesystem: unknownCapability('filesystem', detail),
    persistentEngine: unknownCapability('persistentEngine', detail)
  };
}

function probePersistentEngine(
  root: any,
  dollar: any,
  state: PersistenceProbeState
): CapabilityObservation {
  if (root === null || root === undefined) {
    return unknownCapability('persistentEngine', 'The ExtendScript global object is unavailable.');
  }
  var current = readProperty(root, PERSISTENCE_KEY);
  if (current.state === 'error') {
    return unknownCapability('persistentEngine', 'The opt-in sentinel property could not be inspected.');
  }
  if (current.state === 'value' && current.value === PERSISTENCE_TOKEN) {
    if (state.armed) {
      return unknownCapability('persistentEngine',
        'This facade armed the sentinel; only a new facade may observe it as persistence.');
    }
    try {
      delete root[PERSISTENCE_KEY];
    } catch (error) {
      // The observation remains valid even when cleanup is blocked.
    }
    return {
      available: makeFact<boolean>(true, 'observed', '$.global.' + PERSISTENCE_KEY,
        'A sentinel armed by a different createESENV facade survived in this global object.'),
      temporaryDirectoryExists: null
    };
  }
  if (current.state === 'value') {
    return unknownCapability('persistentEngine',
      'The opt-in sentinel name is already occupied; it was not overwritten.');
  }
  if (state.armed) {
    return unknownCapability('persistentEngine',
      'This facade already armed its one-shot sentinel; re-probing cannot certify persistence.');
  }
  var engineName = readStringFact(dollar, 'engineName', '$.engineName');
  // Mark before assignment so even a setter that writes and then throws cannot
  // let this facade mistake its own sentinel for evidence on a later call.
  state.armed = true;
  try {
    root[PERSISTENCE_KEY] = PERSISTENCE_TOKEN;
    return unknownCapability('persistentEngine',
      'Probe armed for engine ' + (engineName.value || '(unnamed)') +
      '; evaluate ESENV again to create a new facade before probing for survival.');
  } catch (error2) {
    return unknownCapability('persistentEngine', 'The opt-in sentinel could not be written to the global object.');
  }
}

function probeOne(
  root: any,
  dollar: any,
  name: CapabilityName,
  persistenceState: PersistenceProbeState
): CapabilityObservation {
  if (name === 'externalObject') {
    return { available: readPresence(root, 'ExternalObject'), temporaryDirectoryExists: null };
  }
  if (name === 'socket') {
    return { available: readPresence(root, 'Socket'), temporaryDirectoryExists: null };
  }
  if (name === 'bridgeTalk') {
    return { available: readPresence(root, 'BridgeTalk'), temporaryDirectoryExists: null };
  }
  if (name === 'scriptUI') {
    return { available: readPresence(root, 'ScriptUI'), temporaryDirectoryExists: null };
  }
  if (name === 'filesystem') {
    return filesystemObservation(root);
  }
  return probePersistentEngine(root, dollar, persistenceState);
}

function isCapabilityName(name: string): name is CapabilityName {
  if (name === 'externalObject') return true;
  if (name === 'socket') return true;
  if (name === 'bridgeTalk') return true;
  if (name === 'scriptUI') return true;
  if (name === 'filesystem') return true;
  if (name === 'persistentEngine') return true;
  return false;
}

function cloneFact<T>(source: Fact<T>): Fact<T> {
  return {
    value: source.value,
    evidence: source.evidence,
    source: source.source,
    detail: source.detail
  };
}

function cloneCapability(source: CapabilityObservation): CapabilityObservation {
  return {
    available: cloneFact(source.available),
    temporaryDirectoryExists: source.temporaryDirectoryExists === null
      ? null
      : cloneFact(source.temporaryDirectoryExists)
  };
}

export function createESENV(root: any, dollar: any): ESENV {
  var stableFacts: StableFacts | null = null;
  var capabilityCache: CachedCapabilities = initialCapabilityCache();
  var persistenceProbeState: PersistenceProbeState = { armed: false };

  function readStableFacts(): StableFacts {
    var appRead = readProperty(root, 'app');
    var appObject = appRead.state === 'value' ? appRead.value : null;
    var name = readStringFact(appObject, 'name', 'app.name');
    var os = readStringFact(dollar, 'os', '$.os');
    var extendscriptObjectPresent = dollar !== null && dollar !== undefined;
    var runtimeKind = extendscriptObjectPresent
      ? makeFact<string>('ExtendScript', 'observed', '$',
          'The ExtendScript special object is available in this execution context.')
      : unknownFact<string>('$', 'The ExtendScript special object is unavailable.');

    return {
      host: {
        name: name,
        version: readStringFact(appObject, 'version', 'app.version'),
        family: inferFamily(name)
      },
      runtime: {
        kind: runtimeKind,
        languageProfile: makeFact<string>('ECMAScript 3-based ExtendScript', 'documented',
          LANGUAGE_PROFILE_SOURCE,
          'Documented language lineage; this is not a probe of individual syntax or built-ins.'),
        version: readStringFact(dollar, 'version', '$.version'),
        build: readStringFact(dollar, 'build', '$.build'),
        engineName: readStringFact(dollar, 'engineName', '$.engineName')
      },
      platform: {
        os: os,
        family: inferPlatform(os),
        architecture: unknownFact<string>('$.os',
          'No portable architecture fact is inferred from the operating-system string.')
      },
      locale: readStringFact(dollar, 'locale', '$.locale')
    };
  }

  function getCapability(name: CapabilityName): CapabilityObservation {
    var cached = capabilityCache[name];
    if (cached === undefined) {
      return unknownCapability(name, 'Not probed; snapshots do not inspect mutable host capabilities.');
    }
    return cached;
  }

  function makeSnapshot(): EnvironmentSnapshot {
    if (stableFacts === null) {
      stableFacts = readStableFacts();
    }
    return {
      schemaVersion: 1,
      host: {
        name: cloneFact(stableFacts.host.name),
        version: cloneFact(stableFacts.host.version),
        family: cloneFact(stableFacts.host.family)
      },
      runtime: {
        kind: cloneFact(stableFacts.runtime.kind),
        languageProfile: cloneFact(stableFacts.runtime.languageProfile),
        version: cloneFact(stableFacts.runtime.version),
        build: cloneFact(stableFacts.runtime.build),
        engineName: cloneFact(stableFacts.runtime.engineName)
      },
      platform: {
        os: cloneFact(stableFacts.platform.os),
        family: cloneFact(stableFacts.platform.family),
        architecture: cloneFact(stableFacts.platform.architecture)
      },
      locale: cloneFact(stableFacts.locale),
      capabilities: {
        externalObject: cloneCapability(getCapability('externalObject')),
        socket: cloneCapability(getCapability('socket')),
        bridgeTalk: cloneCapability(getCapability('bridgeTalk')),
        scriptUI: cloneCapability(getCapability('scriptUI')),
        filesystem: cloneCapability(getCapability('filesystem')),
        persistentEngine: cloneCapability(getCapability('persistentEngine'))
      }
    };
  }

  function snapshot(): EnvironmentSnapshot {
    return makeSnapshot();
  }

  function read(name: StableFactName): string | null {
    if (stableFacts === null) {
      stableFacts = readStableFacts();
    }
    if (name === 'host.name') return stableFacts.host.name.value;
    if (name === 'host.version') return stableFacts.host.version.value;
    if (name === 'host.family') return stableFacts.host.family.value;
    if (name === 'runtime.kind') return stableFacts.runtime.kind.value;
    if (name === 'runtime.languageProfile') return stableFacts.runtime.languageProfile.value;
    if (name === 'runtime.version') return stableFacts.runtime.version.value;
    if (name === 'runtime.build') return stableFacts.runtime.build.value;
    if (name === 'runtime.engineName') return stableFacts.runtime.engineName.value;
    if (name === 'platform.os') return stableFacts.platform.os.value;
    if (name === 'platform.family') return stableFacts.platform.family.value;
    if (name === 'platform.architecture') return stableFacts.platform.architecture.value;
    if (name === 'locale') return stableFacts.locale.value;
    throw new TypeError('Unknown ESENV fact: ' + name);
  }

  function refresh(): void {
    stableFacts = null;
    capabilityCache = initialCapabilityCache();
  }

  function probe(name: CapabilityName): CapabilityObservation {
    if (!isCapabilityName(name)) {
      throw new TypeError('Unknown ESENV capability: ' + name);
    }
    var observation = probeOne(root, dollar, name, persistenceProbeState);
    capabilityCache[name] = observation;
    return cloneCapability(observation);
  }

  return {
    read: read,
    snapshot: snapshot,
    refresh: refresh,
    probe: probe
  };
}
