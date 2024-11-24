import * as rx from 'rxjs'
import * as solid from 'solid-js'


/**
 * getSecondsTimestamp
 * @desc get the current timestamp in seconds
 *
 * @returns {number} returns the number of seconds elapsed since epoch (January 1, 1970, UTC)
 */
export const getSecondsTimestamp = (): number => Math.floor(Date.now() / 1000);

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
 * isLikeSolidAccessor
 * @desc tests whether some value is like a SolidJS `Accessor` created from `createSignal<T>()`
 *
 * @param {any} obj some value to test
 *
 * @returns {boolean} describing whether the input object is an `Accessor`
 */
export const isLikeSolidAccessor = <T>(obj: any): obj is solid.Accessor<T> => {
  return !!obj && obj instanceof Function && !obj.hasOwnProperty('prototype') && obj.name === 'bound readSignal';
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
): solid.Signal<T> => {
  const initial = typeof storage.getItem(key) == 'string'
    ? JSON.parse(storage.getItem(key)!) as T
    : defaultValue;

  const [value, setValue] = solid.createSignal<T>(initial);
  const setValueWithEffect = (value: any): T => {
    const res = setValue(value);
    storage.setItem(key, JSON.stringify(res));
    return res;
  }

  return [ value, setValueWithEffect as typeof setValue ]
}

/**
 * observeWithHistory
 * @desc pipes some `rx.Observable`, or an `Observable`-like value, into
 *       an object describing both (1) the input's current state; and (2) the
 *       input's previous state
 *
 * @param {solid.Accessor<T>|rx.Observable<T>|T} input some input value to pipe; this can be derived
 *                                                     from a `solid.Accessor`, an `rx.Observable` or a raw
 *                                                     value
 *
 * @returns {rx.Observable} a piped observable
 */
export const observeWithHistory = <T>(
  input: solid.Accessor<T> | rx.Observable<T> | T
): rx.Observable<{ previous: T | null; current: T | null; }> => {

  let observable!: rx.Observable<T>;
  if (rx.isObservable(input)) {
    observable = input as rx.Observable<T>;
  } else if (isLikeSolidAccessor(input)) {
    observable = rx.from(solid.observable(input as solid.Accessor<T>));
  } else {
    observable = rx.from(input as rx.ObservableInput<T>);
  }

  return observable.pipe(
    rx.startWith(null),
    rx.pairwise(),
    rx.map(([previous, current]) => ({ current: current, previous: previous }))
  );
};

/**
 * withObservableHistory
 * @desc builds a typed `rx.OperatorFunction` for use as a pipeable operator
 *       to derive both (1) the piped observable's current state and (2) its
 *       previous state
 *
 * @returns {rx.OperatorFunction<T, Object>} a pipeable operator
 */
export const withObservableHistory = <T>(): rx.OperatorFunction<
  T,
  { current: T | null; previous?: T | null }
> => rx.pipe(
  rx.startWith(null),
  rx.pairwise(),
  rx.map(([previous, current]) => ({ current: current, previous: previous }))
);

/**
 * bufferedThrottle
 * @desc a typed `rx.OperatorFunction|rx.UnaryFunction` for use as a pipeable operator
 *       to throttle observable streams
 *
 * @param {rx.Observable<T>} input    some input value to observe
 * @param {number}           interval time, in milliseconds, at which to throttle the
 *                                    stream (optional; defaults to `250ms`)
 *
 * @returns {rx.UnaryFunction<rx.Observable<T>, rx.Observable<T>>} a pipeable operator
 */
export const bufferedThrottle = <T>(
  input: rx.Observable<T>,
  interval: number = 250
): rx.UnaryFunction<
  rx.Observable<T>,
  rx.Observable<T>
> => rx.pipe(
  rx.bufferToggle(
    input.pipe(rx.throttleTime(interval)),
    () => rx.timer(interval)
  ),
  rx.map((value: T[]) => value.pop()!)
);
