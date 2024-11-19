/**
 * CancellablePromise
 * @desc A promise that can be cancelled before its fulfilled/resolved
 */
export default class CancellablePromise<T> implements Promise<T> {
  private readonly promise: Promise<T>

  private completed = false
  private rejectable?: (reason?: any) => void

  public get [Symbol.toStringTag]() {
    return String(this);
  }

  public get isComplete() {
    return this.completed;
  }

  public constructor(...args: ConstructorParameters<typeof Promise<T>>) {
    const promise = new Promise(...args);
    this.promise = new Promise<T>((resolve, reject) => {
      this.rejectable = reject

      promise.then(
        r => resolve(r),
        e => reject(e)
      )
        .finally(() => this.completed = true)
    })
  }

  public then<TResult1 = T, TResult2 = never>(onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
    return this.promise.then(onFulfilled, onRejected)
  }

  public finally(onFinally?: (() => void) | undefined | null): Promise<T> {
    return this.promise.finally(onFinally)
  }

  public catch<TResult = never>(onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
    return this.promise.catch(onRejected)
  }

  public cancel() {
    if (this.completed || !this.rejectable) {
      return;
    }

    this.rejectable({ wasCancelled: true });
  }
}
