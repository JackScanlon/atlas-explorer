import { Signal } from './signal';
import { Disposable } from './disposable';
import { hasDeepEquality } from './equality';

/**
 * @desc varying value object constructor properties
 */
export interface VariantProps<T> {
  value?: Nullable<T>,
  bufferLast?: boolean,
  deepCompare?: boolean,
  ignoreEquality?: boolean,
};

/**
 * @desc varying value object default properties
 */
const DefaultValueProps: VariantProps<any> = {
  value: undefined,
  deepCompare: false,
  ignoreEquality: false,
};

/**
 * @desc {@link Value} of type `T` type-guard
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is Value<T>} specifying whether the input is a {@link Variant}
 */
export const isValueObject = <T>(obj: unknown): obj is Variant<T> => {
  return obj instanceof Object
    && 'isA' in obj
    && (typeof obj.isA === 'function' && obj.isA.length === 1)
    && obj.isA(Variant.ClassName);
};

/**
 * Class representing a varying value
 *
 * @note we might consider extending this in the future to return a `Proxy` object
 *       when accessing the instance's `value`
 *
 *       Though, at that point it might be better to consider using the React-like
 *       state objects if we really need it?
 *
 * @see `Proxy` related reference here (this cls a kind of a cheap knock off of this, i.e. an observable value):
 *      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
 *
 * @class
 * @constructor
 * @extends Disposable
 */
export class Variant<T> extends Disposable {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Variant.name;

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
   * @desc internal value reference
   * @type {Nullable<T>}
   * @private
   */
  private _value: Nullable<T>;

  /**
   * @desc this instance's changed event dispatcher
   * @type {Signal}
   * @private
   */
  private _signal!: Signal;

  /**
   * @desc specifies whether this inst will perform deep comparison of object values
   * @type {boolean}
   * @private
   */
  private _deepCompare: boolean;

  /**
   * @desc specifies whether this inst will dispatch an event regardless of equality
   * @type {number}
   * @private
   */
  private _ignoreEquality: boolean;

  /**
   * @param {VariantProps<T>} props see {@link VariantProps}
   */
  public constructor(props?: VariantProps<T>) {
    props = { ... DefaultValueProps, ...props };

    super();

    this.id = Variant._ref++;
    this._value = props.value;
    this._deepCompare = props.deepCompare!;
    this._ignoreEquality = props.ignoreEquality!;

    this._signal = new Signal({ bufferLast: !!props.bufferLast });
    this._disposables.push(() => this._signal.dispose());
  }

  /**
   * @desc {@link Variant} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Variant} specifying whether the input is a {@link Variant}
   */
  public static Is(obj: unknown): obj is Variant<any> {
    return isValueObject(obj);
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Variant';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `${this.ClassName}<id: ${this.id}, value: ${this.value}>`;
  }

  /**
   * @returns {Signal} this instance's changed event dispatcher
   */
  public get changedSignal(): Signal {
    return this._signal;
  }

  /**
   * @returns {Nullable<T>} the value contained by this instance
   */
  public get value(): Nullable<T> {
    return this._value;
  }

  /**
   * @param {Nullable<T>} value sets this instance's value and, if appropriate, dispatches a changed event
   */
  public set value(value: Nullable<T>) {
    const prevValue = this._value;
    if (this.hasChanged(value, prevValue)) {
      this._value = value;
      this._signal.fire(value, prevValue);
    }
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
   * @returns {boolean} whether this instance contains a non-null value
   */
  public hasValue(): boolean {
    return this._value != null && typeof this._value !== 'undefined';
  }

  /**
   * @desc marks this inst as dirty and dispatches a changed event signal
   *
   * @returns {this} this instance
   */
  public markDirty(): this {
    this._signal.fire(this._value, this._value);
    return this;
  }

  /**
   * @desc sets this inst's value without dispatching an event
   *
   * @returns {this} this instance
   */
  public setRawValue(value: Nullable<T>): this {
    this._value = value;
    return this;
  }

  /**
   * @desc determines inequality of the given values
   *
   * @param {Nullable<T>} newValue  the new desired value
   * @param {Nullable<T>} prevValue the previous value
   *
   * @returns {boolean} specifies whether this instance's value would change if set to the `newValue`
   * @private
   */
  private hasChanged(newValue: Nullable<T>, prevValue: Nullable<T>): boolean {
    if (this._ignoreEquality) {
      return true;
    }

    return this._deepCompare
      ? !hasDeepEquality(newValue, prevValue)
      : newValue !== prevValue;
  }
};
