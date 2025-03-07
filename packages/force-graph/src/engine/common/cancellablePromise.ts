/**
 * @desc promise constructor args
 * @type {Function}
 */
export type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

/**
 * @desc fn callback executed when a Promise is cancelled
 * @type {Function}
 */
export type PromiseCancelHandler = (...args: any[]) => void;

/**
 * @desc an enum describing the current status of a promise
 * @note
 *  | Name      | Info                                                | Value |
 *  |-----------|-----------------------------------------------------|-------|
 *  | Unknown   | Unexpected, invalid value                           |     0 |
 *  | Cancelled | Promise execution has been cancelled                |     1 |
 *  | Rejected  | Promise has been rejected and/or experienced an err |     2 |
 *  | Pending   | Promise has been started but has not completed yet  |     4 |
 *  | Resolved  | Promise has been fulfilled                          |     8 |
 * @type {enum}
 */
export enum PromiseStatus {
  //                     | Binary   | Decimal |
  //                     |----------|---------|
  Unknown   =      0, // | 00000000 |  0      |
  Cancelled = 1 << 0, // | 00000001 |  1      |
  Rejected  = 1 << 1, // | 00000010 |  2      |
  Pending   = 1 << 2, // | 00000100 |  4      |
  Resolved  = 1 << 3, // | 00001000 |  8      |
};

/**
 * @desc an object specifying a cancellation signal
 * @property {any}        wasCancelled any property type to flag that a cancellation was signalled
 * @property {Array<any>} [args]       optionally specify variadic arguments to be applied to the cancellation handler
 */
export interface CancelToken {
  wasCancelled: any,
  args?: any[],
};

/**
 * Extended Promise class that can be cancelled during its execution
 *
 * @class
 * @constructor
 * @implements {Promise}
 */
export class CancellablePromise<T> implements Promise<T> {
  /**
   * @desc this class' type name
   * @static
   * @readonly
   */
  public static readonly ClassName: string = CancellablePromise.name;

  /**
   * @see {@link PromiseStatus}
   * @static
   * @readonly
   */
  public static readonly Status: typeof PromiseStatus = PromiseStatus;

  /**
   * @desc internal promise reference
   * @type {boolean}
   * @readonly
   * @private
   */
  private readonly promise: Promise<T>

  /**
   * @desc a uint8 enum describing the status of this Promise
   * @type {PromiseStatus}
   * @private
   */
  private _status: PromiseStatus = PromiseStatus.Pending;

  /**
   * @desc an internal fn
   * @type {boolean}
   * @private
   */
  private _rejectable?: (reason?: any) => void

  /**
   * @desc Promise-like constructor
   *
   * @param {PromiseExecutor<T>}   executor   {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise|Promise constructor args}
   * @param {PromiseCancelHandler} [onCancel] a callback executed on cancellation
   */
  public constructor(executor: PromiseExecutor<T>, onCancel?: PromiseCancelHandler) {
    const promise = new Promise(executor);
    this.promise = new Promise<T>((resolve, reject) => {
      this._rejectable = (reason?: any) => {
        if (CancellablePromise.IsCancelToken(reason)) {
          this._status = PromiseStatus.Cancelled;
          onCancel?.(...((reason as CancelToken)?.args ?? []));
        } else {
          this._status = PromiseStatus.Rejected;
        }

        reject(reason);
      }

      promise.then(
        r => {
          this._status = PromiseStatus.Resolved;
          resolve(r);
        },
        e => {
          if (!this.isStatus(PromiseStatus.Pending)) {
            return;
          }

          if (this._rejectable) {
            this._rejectable(e);
            return;
          }

          reject(e);
        }
      );
    })
  }

  /**
   * @desc {@link CancellablePromise} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is CancellablePromise<T>} specifying whether the input is a {@link CancellablePromise}
   */
  public static Is<T>(obj: unknown): obj is CancellablePromise<T> {
    return obj instanceof CancellablePromise;
  }

  /**
   * @desc {@link CancelToken} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is CancelToken} specifying whether the input is a {@link CancelToken}
   */
  public static IsCancelToken(obj: unknown): obj is CancelToken {
    return !!obj && obj instanceof Object && obj.hasOwnProperty('wasCancelled');
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'CancellablePromise';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag]() {
    return String(this);
  }

  /**
   * @desc a uint8 enum describing the status of this Promise
   * @type {PromiseStatus}
   * @public
   */
  public get status(): PromiseStatus {
    return this._status;
  }

  /**
   * @desc friendly name of this Promise's current status
   * @type {string}
   * @public
   */
  public get namedStatus(): string {
    return PromiseStatus[this._status];
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
   * @desc compares this Promise's evaluated status with the given {@link PromiseStatus}
   *
   * @param {PromiseStatus} status some status flag
   *
   * @returns {boolean} describing the equality result
   */
  public isStatus(status: PromiseStatus): boolean {
    return (this._status & status) === status;
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
   *
   * @param {Function} [onFulfilled] optionally specify a callback that's asynchronously executed when resolved
   * @param {Function} [onRejected]  optionally specify a callback that's asynchronously executed when rejected
   *
   * @returns {Promise<U | V>} a new Promise instance
   */
  public then<U = T, V = never>(
    onFulfilled?: ((value: T) => U | PromiseLike<U>) | undefined | null,
    onRejected?: ((reason: any) => V | PromiseLike<V>) | undefined | null
  ): Promise<U | V> {
    return this.promise.then(onFulfilled, onRejected);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally
   *
   * @param {Function} [onFinally] optionally specify a callback that's asynchronously executed when any {@link PromiseStatus} is resolved
   *
   * @returns {Promise<T>} a new Promise instance
   */
  public finally(onFinally?: (() => void) | undefined | null): Promise<T> {
    return this.promise.finally(onFinally);
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch
   *
   * @param {Function} onRejected optionally specify a callback that's asynchronously executed when rejected
   *
   * @returns {Promise<T | U>} a new Promise instance
   */
  public catch<U = never>(
    onRejected?: ((reason: any) => U | PromiseLike<U>) | undefined | null
  ): Promise<T | U> {
    return this.promise.catch(onRejected);
  }

  /**
   * @desc method to cancel this object's execution outside of this Promise's asynchronous execution
   *
   * @param {...*} args variadic arguments to be passed to the cancellation thread
   */
  public cancel(...args: any[]): void {
    if (!this.isStatus(PromiseStatus.Pending) || !this._rejectable) {
      return;
    }

    this._rejectable({ wasCancelled: true, args });
  }
};
