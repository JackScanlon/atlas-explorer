import * as Utils from './utils'

import { UUID } from 'crypto'
import { SignalUUIDPattern } from './constants'
import { AsyncHandle, SignalHandle, SignalListeners, SignalTarget } from './types'

/**
 * Signal
 * @desc A helper class to emulate event emitter(s) for event-based communication
 */
export default class Signal {
  private readonly connections: SignalListeners = {};
  private readonly listeners: Record<UUID, string> = {};

  public constructor() { }

  public async Fire(reference: string, ...args: unknown[]): Promise<void> {
    const target = Utils.parseEvent(reference);

    const events = this.connections?.[target.event];
    if (!events) {
      return;
    }

    const group = events?.[target.namespace];
    if (!group) {
      return;
    }

    const promises: Promise<void>[] = [];
    for (let i = 0; i < group.length; ++i) {
      promises.push((group[i].handle as AsyncHandle)(reference, ...args));
    }

    return await Promise.all(promises).then();
  }

  public Connect(reference: string, handle: SignalHandle): UUID {
    const target = Utils.parseEvent(reference);

    let events = this.connections?.[target.event];
    if (!events) {
      events = { };
      this.connections[target.event] = events;
    }

    let group = events?.[target.namespace];
    if (!group) {
      group = [];
      events[target.namespace] = group;
    }

    const uuid = self.crypto.randomUUID();
    group.push({ uuid: uuid, handle: handle });

    return uuid;
  }

  public dispose(): void {
    this.DisconnectAll();
  }

  public Disconnect(reference: string, handle?: SignalHandle): boolean {
    let uuid: UUID | undefined,
        target: SignalTarget | undefined;

    if (SignalUUIDPattern.test(reference)) {
      uuid = reference as UUID;

      const listener = this.listeners?.[uuid];
      if (!listener) {
        return false;
      }

      target = Utils.parseEvent(listener);
    }

    if (!target) {
      target = Utils.parseEvent(reference);
    }

    const events = this.connections?.[target.event];
    if (!events) {
      return false;
    }

    const group = events?.[target.namespace];
    if (!group) {
      return false;
    }

    for (let i = 0; i < group.length; ++i) {
      const obj = group[i];
      if (obj.handle !== handle && obj.uuid !== uuid) {
        continue;
      }

      group.splice(i, 1);

      if (this.listeners?.[obj.uuid]) {
        delete this.listeners[obj.uuid];
      }

      if (group.length < 1) {
        delete events[target.namespace];

        if (Object.keys(events).length < 1) {
          delete this.connections[target.event];
        }
      }

      return true;
    }

    return false;
  }

  public DisconnectAll(reference?: string, cleanAllNamespace: boolean = false): boolean {
    if (!reference) {
      for (const [event, group] of Object.entries(this.connections)) {
        for (const connections of Object.values(group)) {
          for (let i = 0; i < connections.length; ++i) {
            const connection = connections[i];
            if (this.listeners?.[connection.uuid]) {
              delete this.listeners[connection.uuid];
            }
          }
        }

        delete this.connections[event];
      }

      return true;
    }

    const target = Utils.parseEvent(reference);
    const events = this.connections?.[target.event];
    if (!events) {
      return false;
    }

    if (cleanAllNamespace) {
      delete this.connections[target.event];
      return true
    }

    const group = events?.[target.namespace];
    if (group) {
      delete events[target.namespace];
    }

    return false;
  }
};
