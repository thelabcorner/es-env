export type EvidenceKind = 'documented' | 'observed' | 'inferred' | 'unknown';

export interface Fact<T> {
  value: T | null;
  evidence: EvidenceKind;
  source: string;
  detail: string | null;
}

export interface CapabilityObservation {
  available: Fact<boolean>;
  temporaryDirectoryExists: Fact<boolean> | null;
}

export type CapabilityName =
  | 'externalObject'
  | 'socket'
  | 'bridgeTalk'
  | 'scriptUI'
  | 'filesystem'
  | 'persistentEngine';

export type StableFactName =
  | 'host.name'
  | 'host.version'
  | 'host.family'
  | 'runtime.kind'
  | 'runtime.languageProfile'
  | 'runtime.version'
  | 'runtime.build'
  | 'runtime.engineName'
  | 'platform.os'
  | 'platform.family'
  | 'platform.architecture'
  | 'locale';

export interface StableFacts {
  host: {
    name: Fact<string>;
    version: Fact<string>;
    family: Fact<string>;
  };
  runtime: {
    kind: Fact<string>;
    languageProfile: Fact<string>;
    version: Fact<string>;
    build: Fact<string>;
    engineName: Fact<string>;
  };
  platform: {
    os: Fact<string>;
    family: Fact<string>;
    architecture: Fact<string>;
  };
  locale: Fact<string>;
}

export interface EnvironmentSnapshot {
  schemaVersion: 1;
  host: StableFacts['host'];
  runtime: StableFacts['runtime'];
  platform: StableFacts['platform'];
  locale: StableFacts['locale'];
  capabilities: {
    externalObject: CapabilityObservation;
    socket: CapabilityObservation;
    bridgeTalk: CapabilityObservation;
    scriptUI: CapabilityObservation;
    filesystem: CapabilityObservation;
    persistentEngine: CapabilityObservation;
  };
}

export interface ESENV {
  read(name: StableFactName): string | null;
  snapshot(): EnvironmentSnapshot;
  refresh(): void;
  probe(name: CapabilityName): CapabilityObservation;
}
