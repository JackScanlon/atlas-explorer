/**
 * @desc a clean up function called when attempting to dispose of an item
 */
export type DisposableFunction = () => unknown;

/**
 * @desc some disposable object containing a clean up method
 */
export interface DisposableObject {
  dispose: DisposableFunction;
}

/**
 * @desc Type-guard for {@link DisposableFunction}
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is DisposableFunction} specifying whether the input is a {@link DisposableFunction}
 */
export const isDisposableFunction = (obj: unknown): obj is DisposableFunction => {
  return typeof obj === 'function' && /function/i.test(Object.prototype.toString.call(obj)) && obj.length === 0;
};

/**
 * @desc Type-guard for {@link DisposableObject}
 *
 * @param {unknown} obj some object to consider
 *
 * @returns {obj is SignalSymbol} specifying whether the input is a {@link DisposableObject}
 */
export const isDisposableObject = (obj: unknown): obj is DisposableObject => {
  return obj instanceof Object && 'dispose' in obj && isDisposableFunction(obj.dispose);
};

/**
 * Class representing a set of disposable objects
 *
 * @class
 * @constructor
 */
export class Disposable {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Disposable.name;

  /**
   * @desc a list of anonymous disposables
   */
  protected _disposables!: Array<DisposableFunction | DisposableObject>;

  /**
   * @desc a map of named disposables, can be used for pseudo-state management
   */
  protected _namedDisposables!: Record<string, DisposableFunction | DisposableObject>;

  /**
   * @desc default constructor
   */
  public constructor() {
    this._disposables = [];
    this._namedDisposables = {};
  }

  /**
   * @desc {@link Runtime} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Runtime} specifying whether the input is a {@link Runtime}
   */
  public static Is(obj: unknown): obj is Disposable {
    return obj instanceof Disposable;
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
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Disposable';
  }

  /**
   * @desc overrideable dispose method
   */
  public dispose(): void {
    this.disposeItems();
  }

  /**
   * @desc dispose all items contained by this instance
   *
   * @returns {this} this instance
   */
  protected disposeItems(): this {
    const disposables = this._disposables;
    const namedDisposables = this._namedDisposables;
    const namedDiposableKeys = Object.keys(namedDisposables);

    for (const key of namedDiposableKeys) {
      this.disposeItem(namedDisposables[key]);
      delete namedDisposables[key];
    }

    let element: any;
    while (disposables.length > 0) {
      element = disposables.pop();
      this.disposeItem(element);
    }

    return this;
  }

  /**
   * @desc utility method to safely dispose of a disposable-like item
   *
   * @returns {this} this instance
   */
  protected disposeItem(element: any): this {
    if (isDisposableFunction(element)) {
      element();
    } else if (isDisposableObject(element)) {
      element.dispose();
    }

    return this;
  }
}
