import { DisposableFunction } from '@engine/common/disposable';
import { SignalResult, DefaultListenerProps } from './constants';
import { SignalSymbol, SignalListener, SignalListenerProps } from './types';

/**
 * Class representing a listener bound to a {@link Signal}
 *
 * @class
 * @constructor
 */
export class SignalBinding {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = SignalBinding.name;

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
   * @desc whether this binding is currently active (i.e. valid)
   * @type {boolean}
   * @private
   */
  private _active: boolean = true;

  /**
   * @desc whether this binding is currently enabled (i.e. can be executed)
   * @type {boolean}
   * @private
   */
  private _enabled: boolean = true;

  /**
   * @desc properties used to construct this binding
   * @type {SignalListenerProps}
   * @private
   * @readonly
   */
  private readonly _props!: Required<SignalListenerProps>;

  /**
   * @desc the ID of the signal target
   * @type {number}
   * @private
   * @readonly
   */
  private readonly _target!: number;

  /**
   * @see {@link SignalListener}
   * @type {boolean}
   * @private
   * @readonly
   */
  private readonly _listener!: SignalListener;

  /**
   * @desc some disposal method
   * @see {@link DisposableFunction}
   * @type {DisposableFunction}
   * @private
   * @readonly
   */
  private readonly _disposable!: DisposableFunction;

  /**
   * @param {number}              id         the id of the signal target
   * @param {SignalListener}      listener   some listener func
   * @param {DisposableFunction}  disposable some func to dispose of the binding from its target signal
   * @param {SignalListenerProps} [props]    constructor props
   */
  public constructor(id: number, listener: SignalListener, disposable: DisposableFunction, props?: SignalListenerProps) {
    props = { ...DefaultListenerProps, ...(props || { })}

    this.id = SignalBinding._ref++;
    this._props = props as Required<SignalListenerProps>;
    this._target = id;
    this._listener = listener;
    this._disposable = disposable;
  }

  /**
   * @desc Type-guard for {@link SignalSymbol}
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is SignalSymbol} specifying whether the input is a {@link SignalSymbol}
   */
  public static isSignalResult(obj: unknown): obj is SignalSymbol {
    return obj instanceof Object
      && typeof obj === 'symbol'
      && typeof obj.description === 'string'
      && obj.description.startsWith('__Signal');
  };

  /**
   * @desc {@link SignalBinding} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is SignalBinding} specifying whether the input is a {@link SignalBinding}
   */
  public static Is(obj: unknown): obj is SignalBinding {
    return obj instanceof Object
      && 'isA' in obj
      && (typeof obj.isA === 'function' && obj.isA.length === 1)
      && obj.isA(SignalBinding.ClassName);
  }

  /**
   * @desc formats this instance as a string
   *
   * @returns {string} string representation
   */
  public toString(): string {
    return `${this.ClassName}<id: ${this.id}, signalId: ${this._target}>`;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'SignalBinding';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `${this.ClassName}<id: ${this.id}, signalId: ${this._target}>`;
  }

  /**
   * @desc specifies whether this is currently connected
   * @type {boolean}
   */
  public get active(): boolean {
    return this._active;
  }

  /**
   * @desc retrieves this binding's Signal ID
   * @type {number}
   */
  public get parentId(): number {
    return this._target;
  }

  /**
   * @desc specifies the priority of this binding (lower = higher priority)
   * @type {number}
   */
  public get priority(): number {
    return this._props.priority;
  }

  /**
   * @desc specifies whether this binding will close after an event is dispatched
   * @type {boolean}
   */
  public get isOnce(): boolean {
    return this._props.once;
  }

  /**
   * @desc retrieves the listener from this binding
   * @type {SignalListener}
   */
  public get listener(): SignalListener {
    return this._listener;
  }

  /**
   * @desc specifies whether this instance is enabled & active
   * @type {boolean}
   */
  public get enabled(): boolean {
    return this._enabled && this._active;
  }

  /**
   * @param {boolean} value specifies whether this instance should be enabled
   */
  public set enabled(value: boolean) {
    this._enabled = value;
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
   * @desc executes the listener after event dispatch
   *
   * @param {any[]} [params] execution arguments
   *
   * @returns {SignalSymbol} see {@link SignalSymbol}
   */
  public exec(params?: any[]): SignalSymbol {
    if (!this.enabled) {
      return SignalResult.Pass;
    }

    params = Array.isArray(params) ? params : [];
    params = this._props.params
      ? this._props.params.concat(params)
      : params;

    let result: unknown = this._listener.apply(this._props.context, params);
    if (this._props.once) {
      this.disconnect();
    }

    if (!SignalBinding.isSignalResult(result)) {
      result = SignalResult.Pass;
    }

    return result as SignalSymbol;
  }

  /**
   * @desc disconnects this listener
   */
  public disconnect(): void {
    this.dispose();
  }

  /**
   * @desc destroys this instance
   */
  public dispose(): void {
    if (!this._active) {
      return;
    }

    this._active = false;
    this._disposable();
  }
};
