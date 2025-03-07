import * as Utils from '@engine/common/utils';

import { SignalBinding } from './binding';
import { DefaultSignalProps, SignalResult } from './constants';
import { SignalListener, SignalListenerProps, SignalProps } from './types';

export { SignalBinding };

export type {
  AsyncSignalHandle, SignalSymbol, SignalProps,
  SignalListener, SignalListenerProps,
} from './types';

/**
 * @desc priority sort function
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
 *
 * @param {SignalBinding} a some {@link SignalBinding} object
 * @param {SignalBinding} b some {@link SignalBinding} object
 *
 * @returns {number} integer describing sort order
 */
const priorityComparator = (a: SignalBinding, b: SignalBinding): number => {
  return a.priority < b.priority ? -1 : (a.priority > b.priority ? 1 : 0);
};

/**
 * Class representing a Signal, describing one or more {@link SignalBinding}
 *
 * @class
 * @constructor
 */
export class Signal {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Signal.name;

  /**
   * @see {@link SignalResult}
   * @static
   * @readonly
   */
  public static readonly SignalResult = SignalResult;

  /**
   * @desc internal ID counter
   * @type {number}
   * @static
   */
  private static _ref: number = 0;

  /**
   * @desc this instance's ID
   * @type {number}
   * @readonly
   */
  public readonly id: number;

  /**
   * @desc determines whether the last dispatched event should be buffered and repeated on new connections
   * @type {boolean}
   */
  public bufferLast: boolean = false;

  /**
   * @desc whether this binding is currently active (i.e. valid)
   * @type {boolean}
   */
  public active: boolean = true;

  /**
   * @desc the previously dispatched event args
   * @type {Nullable<any[]>}
   * @private
   */
  private _buffered: Nullable<any[]>;

  /**
   * @desc an array of bound signals
   * @type {Array<SignalBinding>}
   * @private
   * @readonly
   */
  private readonly _bindings: Array<SignalBinding> = [];

  /**
   * @param {SignalProps} [props] an object describing this signal's props, see {@link SignalProps}
   */
  public constructor(props?: SignalProps) {
    props = { ... DefaultSignalProps, ...props };

    this.id = Signal._ref++;
    this.bufferLast = props.bufferLast!;
  }

  /**
   * @desc {@link Signal} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Signal} specifying whether the input is a {@link Signal}
   */
  public static Is(obj: unknown): obj is Signal {
    return obj instanceof Object
      && 'isA' in obj
      && (typeof obj.isA === 'function' && obj.isA.length === 1)
      && obj.isA(Signal.ClassName);
  }

  /**
   * @desc formats this instance as a string
   *
   * @returns {string} string representation
   */
  public toString(): string {
    return `${this.ClassName}<id: ${this.id}>`;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Signal';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `${this.ClassName}<id: ${this.id}>`;
  }

  /**
   * @desc describes the number of bindings associated with this signal (regardless of their state)
   * @type {number}
   */
  public get numListeners(): number {
    return this._bindings.length;
  }

  /**
   * @desc describes the number of enabled bindings associated with this signal
   * @type {number}
   */
  public get numEnabledListeners(): number {
    return this._bindings.reduce((enabled: number, binding: SignalBinding) => binding.enabled ? ++enabled : enabled, 0);
  }

  /**
   * @desc the buffered dispatch args (if any)
   * @type {Nullable<any[]>}
   */
  public get buffered(): Nullable<any[]> {
    return this._buffered;
  }

  /**
   * @desc releases any buffered signal args
   * @returns {this}
   */
  public releaseBuffered(): Signal {
    this._buffered = null;
    return this;
  }

  /**
   * @desc compares equality of this instance's class name to some given class name
   *
   * @param {string} className some class name input
   *
   * @returns {boolean} evaluates to `true` if the class names are equal
   */
  public isA(className: string): boolean {
    return this.ClassName === className;
  }

  /**
   * @param {SignalListener} listener some listener
   *
   * @returns {boolean} determines whether a listener is associated with this signal
   */
  public has(listener: SignalListener): boolean {
    let index = this._bindings.length - 1;
    while (index >= 0) {
      const bound = this._bindings?.[index];
      if (!bound) {
        break;
      }

      if (bound.listener === listener) {
        return true;
      }

      index--;
    }

    return false;
  }

  /**
   * @desc connects an event dispatch listener
   *
   * @param {SignalListener}      listener  some event listener
   * @param {SignalListenerProps} [options] optionally specify any behaviour options
   *
   * @returns {SignalBinding} see {@link SignalBinding}
   */
  public connect(listener: SignalListener, options?: SignalListenerProps): SignalBinding {
    let binding!: SignalBinding;
    binding = new SignalBinding(
      this.id,
      listener,
      () => {
        const index = this._bindings.findIndex((element: SignalBinding) => element === binding);
        if (index < 0) {
          return;
        }

        this._bindings.splice(index, 0);
      },
      options
    );

    Utils.binaryInsert(this._bindings, binding, priorityComparator, true);

    if (this.bufferLast && this._buffered) {
      binding.exec(this._buffered);
    }

    return binding;
  }

  /**
   * @desc connects a listener that disconnects after the first dispatch, sugar for {@link Signal.connect}
   *
   * @param {SignalListener}      listener  some event listener
   * @param {SignalListenerProps} [options] optionally specify any behaviour options
   *
   * @returns {SignalBinding} see {@link SignalBinding}
   */
  public once(listener: SignalListener, options?: SignalListenerProps): SignalBinding {
    options = options || { };
    options.once = true;

    return this.connect(listener, options);
  }

  /**
   * @desc dispatches an event
   *
   * @param {...*} args the event args
   *
   * @returns {this}
   */
  public fire(...args: any[]): Signal {
    if (!this.active) {
      return this;
    }

    if (this.bufferLast) {
      this._buffered = args;
    }

    let index = this._bindings.length - 1;
    while (this.active && index >= 0 && this._bindings?.[index]) {
      const result = this._bindings[index].exec(args);
      if (result === SignalResult.Sink) {
        break;
      }

      index--;
    }

    return this;
  }

  /**
   * @desc disconnects all associated {@link SignalBinding|SignalBindings}
   *
   * @returns {this}
   */
  public disconnectAll(): Signal {
    while (this._bindings.length) {
      const binding = this._bindings.shift();
      if (!binding) {
        continue;
      }

      binding.dispose();
    }

    return this;
  }

  /**
   * @desc destroys this instance
   */
  public dispose(): void {
    this.active = false;
    delete this._buffered;

    this.disconnectAll();
  }
};
