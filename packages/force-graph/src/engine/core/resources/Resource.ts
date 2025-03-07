/**
 * An abstract class wrapping some gpu resource
 *
 * @class
 * @constructor
 * @abstract
 */
export abstract class Resource {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Resource.name;

  /**
   * @desc internal ID counter
   * @type {number}
   * @static
   */
  private static _ref: number = 0;

  /**
   * @desc this instance's internal ID
   * @type {number}
   * @readonly
   */
  public readonly id!: number;

  /**
   * @desc some gpu texture resource
   * @type {unknown}
   * @readonly
   */
  protected readonly _resource!: unknown;

  /**
   * @desc the gpu device assoc. with this instance
   * @type {unknown}
   * @protected
   * @readonly
   */
  protected readonly _handle!: unknown;

  /**
   * @note see inherited classes
   * @param {unknown} handle the graphics context
   */
  public constructor(handle: unknown, resource?: unknown) {
    this.id = Resource._ref++;
    this._handle = handle;
    this._resource = resource;
  }

  /**
   * @desc {@link Resource} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Resource} specifying whether the input is a {@link Resource}
   */
  public static Is(obj: unknown): obj is Resource {
    return obj instanceof Resource;
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
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Texture';
  }

  /**
   * @returns {unknown} retrieves the resource assoc. with this inst
   */
  public get resource(): unknown {
    return this._resource;
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
   * @desc some cleanup method to destroy this instance
   * @abstract
   */
  public abstract dispose(): void;
};
