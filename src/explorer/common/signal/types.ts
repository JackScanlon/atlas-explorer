import { UUID } from 'crypto'

export type AsyncHandle = (eventName: string, ...args: any[]) => Promise<void>;

export type SignalHandle = (eventName: string, ...args: any[]) => void;

export interface SignalConnection {
  uuid: UUID;
  handle: SignalHandle;
}

export interface SignalNamespace {
  [namespace: string]: SignalConnection[],
}

export type SignalListeners = Record<string, SignalNamespace>;

export type SignalTarget = { event: string, namespace: string };
