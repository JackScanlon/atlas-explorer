import { SignalTarget } from './types';
import { SignalRootNamespace } from './constants'

/**
 * parseEvent
 * @desc parses the event & related namespace, if any, from the given event name
 *
 * @param {string} eventName some event target e.g. `[NAMESPACE].[EVENT]`
 *
 * @returns {SignalTarget} the components describing this event target; namespace defaults to root namespace
 */
export const parseEvent = (eventName: string): SignalTarget => {
  const components = eventName.split('.');
  return {
    event: components[components.length - 1],
    namespace: components.length > 1 ? components[0] : SignalRootNamespace,
  }
};
