/**
 * @desc describes some async function to be executed as a listener callback
 */
export type AsyncSignalHandle = (...args: any[]) => Promise<void>;

/**
 * @desc describes some synchronous function to be executed as a listener callback
 */
export type SignalListener = (...args: any[]) => void;

/**
 * @desc typed symbol used to vary the behaviour of the signal after execution of a callback
 */
export interface SignalSymbol extends Symbol {};

/**
 * @desc Signal constructor props
 */
export interface SignalProps {
  bufferLast?: boolean,
};

/**
 * @desc SignalListener constructor props; varies the behaviour of some listener instance
 */
export interface SignalListenerProps {
  once?: boolean,
  params?: any[] | null,
  context?: Object | null,
  priority?: number,
};
