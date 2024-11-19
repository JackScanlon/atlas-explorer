import { createSignal, Signal } from 'solid-js'

/**
 * eventTargetIsNode
 * @desc ensure event target is a Node or Node-like
 *
 * @param {EventTarget|null} event some event target
 *
 * @returns {boolean} a boolean specifying whether an event target is a node/node-like
 */
export const eventTargetIsNode = (event: EventTarget | null): event is Node => {
  if (!event || !('nodeType' in event)) {
    return false;
  }

  return true;
}

/**
 * isCSSRule
 * @desc tests whether some value is a `CSSRule`
 *
 * @param {any} obj some value to test
 *
 * @returns {boolean} describing whether the input object is a `CSSRule`
 */
export const isCSSRule = (obj: any): obj is CSSRule => {
  return obj instanceof Object && obj.constructor == Object && obj.hasOwnProperty('cssText');
}

/**
 * createStored
 * @desc creates some storage-related signal & state
 *
 * @param {string}  key          the storage key name
 * @param {T}       defaultValue the default value
 * @param {Storage} storage      the storage device (optional; defaults to `localstorage`)
 *
 * @returns {Signal<T>} the associated signal
 */
export const createStored = <T>(
  key: string,
  defaultValue: T,
  storage: Storage = localStorage
): Signal<T> => {
  const initial = typeof storage.getItem(key) == 'string'
    ? JSON.parse(storage.getItem(key)!) as T
    : defaultValue;

  const [value, setValue] = createSignal<T>(initial);
  const setValueWithEffect = (value: any): T => {
    const res = setValue(value);
    storage.setItem(key, JSON.stringify(res));
    return res;
  }

  return [ value, setValueWithEffect as typeof setValue ]
}
