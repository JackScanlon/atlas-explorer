import { SignalSymbol, SignalProps, SignalListenerProps } from './types';

/**
 * @desc key-value pair map of named {@link SignalSymbol|SignalSymbols}
 * @type {Record<string, SignalSymbol>}
 * @constant
 */
export const SignalResult: Record<string, SignalSymbol> = {
  Sink: Symbol('__Signal_Sink'),
  Pass: Symbol('__Signal_Pass'),
};

/**
 * @desc default Signal constructor props
 * @type {SignalProps}
 * @constant
 */
export const DefaultSignalProps: SignalProps = {
  bufferLast: false,
};

/**
 * @desc default SignalListener constructor props
 * @type {SignalListenerProps}
 * @constant
 */
export const DefaultListenerProps: SignalListenerProps = {
  once: false,
  params: undefined,
  context: undefined,
  priority: 0,
};
