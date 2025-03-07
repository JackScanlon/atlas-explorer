import * as AdapterUtils from './utils';

import { Device } from './device';
import { WebGLDevice } from './webgl';
import { ExplorerError } from '@engine/common';
import type { AdapterProps, CanvasType, DeviceType, DeviceProps } from './types';

/**
 * A class adapting a {@link Device}
 *
 * @class
 * @constructor
 */
export class Adapter {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Adapter.name;

  /**
   * @desc default constructor properties; extended from {@link DeviceProps}
   * @type {AdapterProps}
   * @static
   * @readonly
   */
  public static readonly DefaultProps: Partial<AdapterProps> = {
    type: 'webgl',
  };

  /**
   * @desc constructor props for debugging & reference
   * @note this is modified downstream, but changes are not made upstream
   * @type {AdapterProps}
   * @readonly
   */
  public readonly props!: Partial<AdapterProps>;

  /**
   * @desc specifies whether this device has initialised without error
   * @type {boolean}
   * @private
   */
  private _valid: boolean = false;

  /**
   * @desc retrieves the device adapted by this instance
   * @type {Device}
   * @private
   */
  private _device!: Device;

  /**
   * @desc a thenable that is resolved once the device is initialised
   * @type {Promise<this>}
   * @private
   */
  private _initialisedResolver?: Promise<this>;

  /**
   * @desc default public constructor of this class
   *
   * @param {AdapterProps} props see {@link AdapterProps} and {@link Device}
   */
  public constructor(props: Partial<AdapterProps>) {
    this.props = { ...Adapter.DefaultProps, ...props };

    this.initialise();
  }

  /**
   * @desc static constructor of this class
   * @static
   * @async
   *
   * @param {AdapterProps} props see {@link AdapterProps} and {@link Device}
   *
   * @returns {Promise<Adapter>} a promise resolving the newly instantiated adapter after initialisation
   */
  public static async Create(props: AdapterProps): Promise<Adapter> {
    return new Promise<Adapter>(resolve => {
      resolve(new Adapter(props));
    }).then((adapter: Adapter) => adapter.initialised());
  }

  /**
   * @desc checks device support within the current context
   * @static
   *
   * @param {DeviceType} type some {@link DeviceType} input
   *
   * @returns {boolean} specifies whether the given device type is supported
   */
  public static Supports(type: DeviceType): boolean {
    switch (type) {
      // i.e. WebGL2
      case 'webgl':
        return typeof WebGL2RenderingContext !== 'undefined';

      // ...future webgpu support
      default:
        break;
    }

    return false;
  }

  /**
   * @desc determines whether an object is a device context handle
   * @static
   *
   * @param {unknown} obj some input object
   *
   * @returns {boolean} specifies whether the object is a device context handle
   */
  public static IsDeviceHandle(obj: unknown): boolean {
    if (typeof WebGL2RenderingContext !== 'undefined' && obj instanceof WebGL2RenderingContext) {
      return true;
    } else {
      // ...future webgpu support
    }

    return false;
  }

  /**
   * @desc determines whether the page has loaded (browser context only)
   * @static
   *
   * @returns {boolean} reflecting the page loaded state
   */
  public static IsPageLoaded(): boolean {
    return AdapterUtils.isBrowserContext() && document.readyState === 'complete';
  }

  /**
   * @desc creates a promise/thenable that will resolve when the page loads; in non-browser
   *       contexts the promise will resolve immediately
   * @static
   *
   * @returns {Promise<void>} a promise resolved upon page load
   */
  public static PageLoaded(): Promise<void> {
    if (!this.IsPageLoaded() && AdapterUtils.isBrowserContext()) {
      return new Promise(resolve => window.addEventListener('load', () => resolve()));
    }

    return Promise.resolve();
  }

  /**
   * @desc {@link Adapter} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Adapter} specifying whether the input is a {@link Adapter}
   */
  public static Is(obj: unknown): obj is Adapter {
    return obj instanceof Adapter;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Adapter';
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
   * @type {string}
   * @public
   */
  public get [Symbol.toStringTag](): string {
    return `Adapter<deviceId: ${this.device.id}, valid: ${this._valid}>`;
  }

  /**
   * @desc descibres the type of {@link DeviceType} defined by this device
   */
  public get deviceType(): DeviceType {
    return this._device.deviceType;
  }

  /**
   * @desc descibres the type of {@link CanvasType} defined by this device
   */
  public get canvasType(): CanvasType {
    return this._device.canvasType;
  }

  /**
   * @desc retrieves the device adapted by this instance
   */
  public get device(): Device {
    return this._device;
  }

  /**
   * @desc the rendering context associated with this device, e.g. `WebGL2RenderingContext` if a `webgl` device
   */
  public get handle(): unknown {
    return this._device.handle;
  }

  /**
   * @desc the canvas associated with this device
   */
  public get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this._device.element;
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
   * @returns {boolean} specifies whether this device has initialised without error
   */
  public isValid(): boolean {
    return this._valid;
  }

  /**
   * @desc device & canvas cleanup
   */
  public dispose(): void {
    this._device.dispose();
  }

  /**
   * @desc private initialiser responsible for constructing the `Device` and `Canvas`
   * @private
   */
  private initialise(): void {
    if (typeof this.props.type === 'undefined') {
      this.props.type = 'webgl';
    }

    switch (this.props.type) {
      case 'webgl':
        {
          this._initialisedResolver = Adapter.PageLoaded()
            .then(() => {
              this._device = new WebGLDevice(this.props);
              return this._device.initialised();
            })
            .then((device: Device) => {
              if (device.contextLost) {
                throw new ExplorerError({
                  msg: 'Device context lost after initialisation',
                  code: ExplorerError.Errors.Unknown,
                });
              }

              this._valid = true;
              return this;
            });
        }
        break;

      // ...future webgpu support
      default:
        break;
    }
  }
}
