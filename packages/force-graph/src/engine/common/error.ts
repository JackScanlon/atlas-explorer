/**
 * @desc ExplorerError constructor props
 * @see {@link ExplorerError}
 * @private
 */
interface ErrorProps {
  msg?: string;
  name?: string;
  cause?: any;
  code?: ExplorerErrorCode;
}

/**
 * @desc key-value pair records of ErrorCode<->ErrorMessage
 * @see {@link ExplorerErrors}
 * @private
 */
interface ErrorReference {
  [key: number]: string;
}

/**
 * @desc error code enum descriptors
 * @type {enum}
 *
 * @property {number} Unknown               any unknown error/state experienced by the pkg
 * @property {number} InvalidArgument       any invalid arguments passed to a method/function/constructor
 * @property {number} InvalidCanvasElement  any failed state/err experienced when attempting to resolve the device's canvas
 * @property {number} NoWebGLSupport        any err experienced when attempting to collect a `webgl` context
 * @property {number} NoWebGL2Support       any err experienced when attempting to collect a `webgpu` context
 * @property {number} WebGLAttachmentExists notifies the client that a `webgl` context is already owned by another device
 * @property {number} DeviceExtUnavailable  notifies the client that some device extension is unavailable
 * @property {number} ShaderError           any errs relating to the compilation/runtime of shaders
 * @property {number} PipelineError         any errs relating to the compilation/runtime of a render pipeline/program
 */
export enum ExplorerErrorCode {
  Unknown = 0,
  InvalidArgument,
  InvalidCanvasElement,
  NoWebGLSupport,
  NoWebGL2Support,
  WebGLAttachmentExists,
  DeviceExtUnavailable,
  ShaderError,
  PipelineError,
}

/**
 * @desc maps some err to a human readable err message
 * @readonly
 */
export const ExplorerErrors: Readonly<ErrorReference> = Object.freeze({
  [ExplorerErrorCode.Unknown]: 'Unknown error occurred',
  [ExplorerErrorCode.InvalidArgument]: 'Invalid argument',
  [ExplorerErrorCode.InvalidCanvasElement]: 'Invalid HTMLCanvasElement',
  [ExplorerErrorCode.NoWebGLSupport]: "Your browser doesn't support WebGL",
  [ExplorerErrorCode.NoWebGL2Support]: 'Your browser only supports WebGL1',
  [ExplorerErrorCode.WebGLAttachmentExists]: 'Context already attached',
  [ExplorerErrorCode.DeviceExtUnavailable]: 'Device extension is unavailable',
  [ExplorerErrorCode.ShaderError]: 'Shader error occurred',
  [ExplorerErrorCode.PipelineError]: 'Failed to compile Shader Program',
});

/**
 * Class representing an error encountered by the explorer backend; used to standardise error responses
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error|Error}
 *
 * @class
 * @constructor
 * @extends Error
 */
export class ExplorerError extends Error {
  /**
   * @desc readonly ref to the {@link ExplorerErrorCode} enums describing some err state
   * @static
   * @readonly
   */
  public static readonly Errors: typeof ExplorerErrorCode = ExplorerErrorCode;

  /**
   * @desc the {@link ExplorerErrorCode} that this instance describes
   * @public
   */
  public code: ExplorerErrorCode;

  /**
   * @desc see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause|Error.cause}
   * @public
   */
  public cause: any;

  /**
   * @desc constructs a new {@link ExplorerError}
   *
   * @param {object}    param0                                 an obj specifying constructor props
   * @param {string}    param0.msg                             the message associated with this err
   * @param {any}       [param0.cause]                         any associated cause obj, e.g. a prev. err
   * @param {ErrorCode} [param0.code=ExplorerErrorCode.Unknown] the code associated with this err; defaults to `Unknown`
   * @param {string}    [param0.name='ExplorerError']          the name of this err; defaults to `ExplorerError`
   */
  public constructor({ msg, cause, code = ExplorerErrorCode.Unknown, name = 'ExplorerError' }: ErrorProps) {
    if (typeof msg === 'string') {
      msg = `[E${code}: ${ExplorerErrors[code]}]: ${msg}`;
    } else {
      msg = `[E${code}]: ${ExplorerErrors[code]}]`;
    }

    super(msg);

    this.name = name;
    this.code = code;
    this.cause = cause;
  }
}
