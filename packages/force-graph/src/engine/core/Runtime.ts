import { Device } from './device';
import { Adapter } from './adapter';

import type { CanvasType, DeviceType, AdapterProps } from './types';

import {
  Disposable,
  ExplorerError,
  Signal,
  CancellablePromise,
  type DisposableObject,
  type DisposableFunction,
  type PromiseCancelHandler,
} from '@engine/common';

/**
 * @desc async handler used to manage resource loading
 * @see {@link CancellablePromise}
 */
export type LoadingExecutor = (
  resolve: (value: void | PromiseLike<void>) => void,
  reject: (reason?: any) => void,
  onCancel: (...args: any[]) => void
) => void;

/**
 * @desc an object describing the current frame during a render step
 *
 * @property {number} id          id of this frame
 * @property {number} time        epoch time
 * @property {number} runtime     elapsed time since current runtime was started
 * @property {number} deltaTime   time since last frame
 * @property {number} smoothDelta smoothed delta time
 */
export interface RuntimeFrame {
  id: number;
  time: number;
  runtime: number;
  deltaTime: number;
  smoothDelta: number;
}

/**
 * @desc constructor props
 * @see {@link Adapter}
 * @see {@link AdapterProps}
 *
 * @property {boolean} [autoclear=false]            specifies whether to clear the canvas on each render step
 * @property {boolean} [catchRuntimeErrors=false]   specifies whether runtime errors should be caught before being thrown
 * @property {boolean} [suspendLoadOnCtxLoss=false] specifies whether this inst will cancel the load promise if the GL context is lost
 */
export interface RuntimeProps extends AdapterProps {
  autoclear?: boolean;
  catchRuntimeErrors?: boolean;
  suspendLoadOnCtxLoss?: boolean;
}

/**
 * An extensible class describing some render loop
 *
 * @class
 * @constructor
 * @extends Disposable
 * @abstract
 */
export abstract class Runtime extends Disposable {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Runtime.name;

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
  public readonly id!: number;

  /**
   * @desc specifies whether to clear the canvas on each render step
   * @type {boolean}
   */
  public autoclear: boolean = false;

  /**
   * @desc specifies whether runtime errors should be caught before being thrown
   * @type {boolean}
   */
  public catchRuntimeErrors: boolean = false;

  /**
   * @desc specifies whether this inst has loaded its resources on initialisation
   * @type {boolean}
   * @readonly
   */
  private _loaded: boolean = false;

  /**
   * @desc internal loading Promise
   * @type {CancellablePromise<void>}
   * @private
   */
  private _loadHandler?: CancellablePromise<void>;

  /**
   * @desc specifies whether this instance has initialised without error
   * @type {boolean}
   * @private
   */
  private _valid: boolean = false;

  /**
   * @desc describes whether the render step is being executed
   * @type {boolean}
   * @private
   */
  private _running: boolean = false;

  /**
   * @desc current render step frame data
   * @type {RuntimeFrame}
   * @private
   */
  private _frame: RuntimeFrame = {
    id: 0,
    time: 0,
    runtime: 0,
    deltaTime: 0,
    smoothDelta: 0,
  };

  /**
   * @desc describes whether the canvas is currently visible
   * @type {boolean}
   * @private
   */
  private _visible: boolean = false;

  /**
   * @desc describes whether the canvas' gl context is currently active
   * @type {boolean}
   * @private
   */
  private _contextActive: boolean = false;

  /**
   * @desc describes whether the render context has ever been initialised
   * @type {boolean}
   * @private
   */
  private _hadContext: boolean = false;

  /**
   * @desc describes whether resources have been initialised
   * @type {boolean}
   * @private
   */
  private _initialised: boolean = false;

  /**
   * @desc retrieves the device adapted by this instance
   * @type {Adapter}
   * @private
   */
  private _adapter!: Adapter;

  /**
   * @desc retrieves the device adapted by this instance
   * @type {Promise<Runtime>}
   * @private
   */
  private _initialisedResolver?: Promise<this>;

  /**
   * @desc specifies whether this inst will cancel the load promise if the GL context is lost
   * @type {boolean}
   * @private
   */
  private _suspendLoadOnCtxLoss: boolean = false;

  /**
   * @desc constructs the render loop and its associated {@link Adapter} & {@link Device}
   *
   * @param {RuntimeProps} props see {@link RuntimeProps}, {@link AdapterProps} and {@link Device}
   */
  public constructor(props: RuntimeProps) {
    super();

    this.id = Runtime._ref++;
    this.autoclear = props.autoclear ?? false;
    this.catchRuntimeErrors = props.catchRuntimeErrors ?? false;
    this._suspendLoadOnCtxLoss = props.suspendLoadOnCtxLoss ?? false;
    this.initialise(props);
  }

  /**
   * @desc {@link Runtime} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Runtime} specifying whether the input is a {@link Runtime}
   */
  public static Is(obj: unknown): obj is Runtime {
    return obj instanceof Runtime;
  }

  /**
   * @desc this instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'CancellablePromise';
  }

  /**
   * @desc descibres the type of {@link DeviceType} defined by this device
   * @type {DeviceType}
   */
  public get deviceType(): DeviceType {
    return this._adapter.deviceType;
  }

  /**
   * @desc descibres the type of {@link CanvasType} defined by this device
   * @type {CanvasType}
   */
  public get canvasType(): CanvasType {
    return this._adapter.canvasType;
  }

  /**
   * @desc retrieves the adapter contained by this instance
   * @type {Adapter}
   */
  public get adapter(): Adapter {
    return this._adapter;
  }

  /**
   * @desc retrieves the device contained by this instance
   * @type {Device}
   */
  public get device(): Device {
    return this._adapter.device;
  }

  /**
   * @desc the rendering context associated with this instance, e.g. `WebGL2RenderingContext` if a `webgl` device
   * @type {unknown}
   */
  public get handle(): unknown {
    return this._adapter.handle;
  }

  /**
   * @desc returns a typed gl context
   * @type {WebGL2RenderingContext}
   */
  public get webgl(): WebGL2RenderingContext {
    return this.handle as WebGL2RenderingContext;
  }

  /**
   * @desc the canvas associated with this instance
   * @type {HTMLCanvasElement | OffscreenCanvas}
   */
  public get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this._adapter.canvas;
  }

  /**
   * @desc the onscreen {@link HTMLCanvasElement} associated with this instance
   * @type {HTMLCanvasElement}
   */
  public get htmlCanvas(): HTMLCanvasElement {
    return this._adapter.canvas as HTMLCanvasElement;
  }

  /**
   * @desc changed event dispatcher
   * @type {Signal}
   */
  public get changedSignal(): Signal {
    return this._adapter.device.changedSignal;
  }

  /**
   * @returns {boolean} specifies whether this device has initialised without error
   */
  public isValid(): boolean {
    return this._valid;
  }

  /**
   * @returns {boolean} specifies whether this device has completed the load handler
   */
  public isLoaded(): boolean {
    return this.onLoad ? this._loaded : false;
  }

  /**
   * @returns {boolean} describes whether the render context has ever been initialised
   */
  public isInitialised(): boolean {
    return this._initialised;
  }

  /**
   * @returns {boolean} describes whether the render step is being executed
   */
  public isRunning(): boolean {
    return this._running;
  }

  /**
   * @returns {boolean} describes whether the canvas is currently visible
   */
  public isVisible(): boolean {
    return this._visible;
  }

  /**
   * @returns {boolean} describes whether the canvas' gl context is currently active
   */
  public hasContext(): boolean {
    return this._contextActive;
  }

  /**
   * @returns {boolean} describes whether this runtime is steppable
   */
  public isSteppable(): boolean {
    return this._valid && this._visible && this._contextActive;
  }

  /**
   * @desc a thenable that is resolved once the device is initialised; including its width, height and device pixel ratio
   *
   * @returns {Promise<this>} a promise that resolves upon device initialisation
   */
  public initialised(): Promise<this> {
    if (!this._initialisedResolver) {
      return Promise.reject(
        new ExplorerError({
          msg: `Failed to initialise ${this}`,
          code: ExplorerError.Errors.Unknown,
        })
      );
    } else if (this._valid) {
      return Promise.resolve(this);
    }

    return this._initialisedResolver;
  }

  /**
   * @desc abstract initialisation handler, used to initialise resources etc
   * @abstract
   *
   * @param {boolean} contextRestored specifies whether this initialisation was restored after context loss
   *
   * @returns {any} some return value
   */
  public abstract onInit(contextRestored: boolean): any;

  /**
   * @see {@link RuntimeFrame}
   * @abstract
   *
   * @param {RuntimeFrame} frame an object describing the current frame of the render step
   *
   * @returns {any} some return value
   */
  public abstract onRender(frame: RuntimeFrame): any;

  /**
   * @desc optional method to handle loading of resources on first initialisation
   * @note behaviour can be varied by {@link RuntimeProps}
   *
   * @param {Function} resolve  see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve|Promise.resolve}
   * @param {Function} reject   see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject|Promise.reject}
   * @param {Function} onCancel see {@link CancellablePromise.cancel}
   */
  public onLoad?(
    resolve: (value: void | PromiseLike<void>) => void,
    reject: (reason?: any) => void,
    onCancel: (...args: any[]) => void
  ): void;

  /**
   * @desc optional method to handle deinitialisation / deallocation of resources
   * @abstract
   *
   * @returns {any} some return value
   */
  public onDeinit?(): any;

  /**
   * @desc optional method called before destruction of this object
   * @abstract
   *
   * @returns {any} some return value
   */
  public onDispose?(): any;

  /**
   * @desc handler for events dispatched when the context state is changed, i.e. is lost or restored
   * @abstract
   *
   * @param {boolean} hasContext specifies whether the device has a valid context available
   *
   * @returns {any} some return value
   */
  public onContextChanged?(hasContext: boolean): any;

  /**
   * @desc handler for events dispatched when the viewport size/devicePixelRatio changes
   * @abstract
   *
   * @param {[number, number]} drawBufferSize   see {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawingBufferWidth|drawBufferWidth/Height}
   * @param {number}           devicePixelRatio see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio|devicePixelRatio}
   *
   * @returns {any} some return value
   */
  public onViewportChanged?(drawBufferSize: [number, number], devicePixelRatio: number): any;

  /**
   * @desc handler for events dispatched when the intersection between the canvas and the viewport changes
   * @abstract
   *
   * @param {boolean} isVisible specifies whether the canvas is currently visible, i.e. intersecting with the viewport
   *
   * @returns {any} some return value
   */
  public onVisibilityChanged?(isVisible: boolean): any;

  /**
   * @desc error handler for issues that occur during initialisation or during runtime (latter requires `catchRuntimeErrors` flag)
   * @abstract
   *
   * @param {any} err some error message
   *
   * @returns {any} some return value
   */
  public onError?(err: any): any;

  /**
   * @desc destructor & cleanup
   */
  public override dispose(): void {
    this?.onDispose?.();
    super.dispose();
  }

  /**
   * @param {string} name the name of the disposable item to retrieve
   *
   * @return {DisposableFunction | DisposableObject | null} the retrieved disposable, if applicable
   */
  public getNamedDisposable(name: string): DisposableFunction | DisposableObject | null {
    return this._namedDisposables?.[name] ?? null;
  }

  /**
   * @param {...DisposableFunction | DisposableObject} disposables some disposable object(s) / function(s)
   *
   * @returns {this}
   */
  public pushDisposables(...disposables: Array<DisposableFunction | Disposable>): void {
    this._disposables.push(...disposables);
  }

  /**
   * @desc records a named disposable; note that setting a key-value pair to a `Nullable` type and/or to another value will dispose of the last known value
   *
   * @param {string}                                       name       the name of the disposable item
   * @param {DisposableFunction | DisposableObject | null} disposable optionally specify a disposable object / function
   *
   * @returns {this}
   */
  public setNamedDisposable(name: string, disposable: DisposableFunction | DisposableObject | null): void {
    const obj = this._namedDisposables?.[name];
    if (obj) {
      delete this._namedDisposables[name];
      this.disposeItem(obj);
    }

    if (disposable !== null && typeof disposable !== 'undefined') {
      this._namedDisposables[name] = disposable;
    }
  }

  /**
   * @desc private initialiser responsible for constructing the `Device` and `Canvas`
   * @private
   */
  private initialise(props: AdapterProps): void {
    this._adapter = new Adapter(props);

    this._initialisedResolver = this._adapter
      .initialised()
      .then((adapter: Adapter) => {
        const device = adapter.device;

        const listener = device.changedSignal.connect((eventName: string, ...args: any[]) => {
          switch (eventName) {
            case 'context':
              {
                const [currentState, lastState] = args as boolean[];
                if (currentState !== lastState) {
                  this._contextActive = currentState!;
                  this.handleRuntime();
                  this?.onContextChanged?.(currentState!);
                }
              }
              break;

            case 'visibility':
              {
                const [currentState, lastState] = args as boolean[];
                if (currentState !== lastState) {
                  this._visible = currentState!;
                  this.handleRuntime();
                  this?.onVisibilityChanged?.(currentState!);
                }
              }
              break;

            case 'viewportSize':
            case 'devicePixelRatio':
              this?.onViewportChanged?.(device.drawBufferSize, device.devicePixelRatio);
              break;

            default:
              break;
          }
        });
        this._disposables.push(() => listener.dispose());
      })
      .then(() => {
        this._valid = true;
        return this;
      })
      .catch((...args: any[]) => {
        if (this.onError) {
          (this.onError as any)(...args);
        } else {
          console.error(...args);
        }

        return this;
      });
  }

  /**
   * @desc builds a cancellable promise that resolves once user-defined resource loading is completed
   * @async
   * @private
   *
   * @param {LoadingExecutor} executor see {@link LoadingExecutor}
   *
   * @returns {Promise<void>} some constructed thenable
   */
  private async buildLoader(executor: LoadingExecutor): Promise<void> {
    if (this._loaded) {
      return Promise.resolve();
    }

    const isThenable =
      this._loadHandler && (this._loadHandler.status & (CancellablePromise.Status.Pending | CancellablePromise.Status.Resolved)) !== 0;

    if (isThenable) {
      return this._loadHandler;
    }

    let onCancel: PromiseCancelHandler | undefined;
    this._loadHandler = new CancellablePromise<void>(
      (resolve, reject) =>
        executor(resolve, reject, (handler: PromiseCancelHandler) => {
          onCancel = handler;
        }),
      (...args: any[]) => {
        onCancel?.(...args);
      }
    );

    return this._loadHandler.then(() => {
      this._loaded = true;
    });
  }

  /**
   * @desc initialises the render loop and manages render step(s)
   * @protected
   */
  protected startRuntime(): void {
    if (this._running) {
      return;
    }

    this._running = true;

    const frame = this._frame;
    frame.time = performance.now();
    frame.runtime = 0;

    let time: number = 0,
      deltaTime: number = 0;

    let renderLoop!: (frame: RuntimeFrame) => any;
    if (this.catchRuntimeErrors && !!this.onError) {
      const render = this.onRender.bind(this);
      renderLoop = (frame: RuntimeFrame) => {
        try {
          render(frame);
        } catch (e: any) {
          this.onError!(e);
        }
      };
    } else {
      renderLoop = this.onRender.bind(this);
    }

    const renderStep = (): void => {
      time = performance.now();
      deltaTime = frame.deltaTime = (time - frame.time) * 0.001;

      frame.time = time;
      frame.smoothDelta += (deltaTime - frame.smoothDelta) * (1 - Math.exp(-0.5 * frame.deltaTime));
      frame.runtime += deltaTime;

      if (this.autoclear) {
        this.device.clear();
      }

      renderLoop(frame);

      if (this._running) {
        frame.id = requestAnimationFrame(renderStep);
      }
    };

    setTimeout(() =>
      requestAnimationFrame(() => {
        if (!this._running) {
          return;
        }

        const time = performance.now();
        frame.smoothDelta = frame.deltaTime = (time - frame.time) * 0.001;
        frame.time = time;

        frame.id = requestAnimationFrame(renderStep);
      })
    );

    this.changedSignal.fire('running', true, false);
  }

  /**
   * @desc stops the render loop and any current render step
   * @protected
   */
  protected stopRuntime(): void {
    if (!this._running) {
      return;
    }

    this._running = false;
    cancelAnimationFrame(this._frame.id);

    this.changedSignal.fire('running', false, true);
  }

  /**
   * @desc responsible for starting & stopping the render loop
   * @protected
   */
  protected handleRuntime(): void {
    const hasContext = this._contextActive;
    const isInitialised = this._initialised;
    if (!this._visible || !hasContext) {
      this.stopRuntime();

      if (!hasContext) {
        if (
          this._suspendLoadOnCtxLoss &&
          !this._loaded &&
          this._loadHandler &&
          this._loadHandler.isStatus(CancellablePromise.Status.Pending)
        ) {
          this._loadHandler.cancel('ContextLost');
        }

        if (isInitialised) {
          this._initialised = false;
          this?.onDeinit?.();
        }
      }

      return;
    }

    const hadContext = this._hadContext;
    if (this.onLoad) {
      this.buildLoader(this.onLoad.bind(this))
        .then(() => {
          this._loaded = true;

          if (!this.isSteppable() || this.isRunning()) {
            return;
          }

          if (!this._initialised) {
            this._initialised = true;
            this._hadContext = true;

            this.onInit(hadContext);
            this.onViewportChanged?.(this.device.drawBufferSize, this.device.devicePixelRatio);
          }

          if (this.isSteppable() && !this.isRunning()) {
            this.startRuntime();
          }
        })
        .catch((...args: any[]) => {
          if (args.length && CancellablePromise.IsCancelToken(args[0])) {
            return;
          }

          if (this.onError) {
            (this.onError as any)(...args);
          } else {
            console.error(...args);
          }
        });

      return;
    }

    if (!this._initialised) {
      this._initialised = true;
      this._hadContext = true;

      this.onInit(hadContext);
    }

    if (this.isSteppable() && !this.isRunning()) {
      this.startRuntime();
    }
  }
}
