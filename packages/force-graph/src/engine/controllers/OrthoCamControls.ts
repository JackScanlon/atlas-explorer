import { Disposable, TransformUpdate } from '@engine/common';
import { NumberUtils, Vec2, Vec3, Mat4, type Vec2Like } from '@engine/math';
import { OrthographicCamera, type OrthographicCamProps } from '@engine/objects';
import { InputController, InputGesture, InputObject, InputState, TouchState } from './InputController';

/**
 * @desc Orhographic camera controller constructor props
 * @see {@link OrthographicCamProps}
 *
 * @property {number} [minZoom=1e-3] camera zoom scale lower bounds
 * @property {number} [maxZoom=2]    camera zoom scale upper bounds
 */
export interface OrthoCamCtrlProps extends OrthographicCamProps {
  minZoom?: number;
  maxZoom?: number;
}

/**
 * @desc default constructor props
 * @see {@link OrthographicCamProps}
 * @type {Partial<OrthoCamCtrlProps>}
 * @constant
 */
export const DefaultOrthoCamCtrlProps: Partial<OrthoCamCtrlProps> = {
  minZoom: 1e-2,
  maxZoom: 2,
  position: [0, 0, 1],
};

/**
 * Class controlling the behaviour of a {@link OrthographicCamera} through some {@link InputController}
 *
 * @todo need to change this once we're ready to work on UI/UX; this has been thrown together for quick iteration
 *
 * @class
 * @constructor
 * @extends Disposable
 */
export class OrthoCamControls extends Disposable {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = OrthoCamControls.name;

  /**
   * @desc this controller's camera instance
   * @type {OrthographicCamera}
   */
  public camera!: OrthographicCamera;

  /**
   * @desc whether this inst has any updates that need to be processed
   * @type {boolean}
   */
  public needsUpdate: boolean = true;

  /**
   * @desc specifies whether the client is currently performing a pan input
   * @type {boolean}
   */
  public isPanning: boolean = false;

  /**
   * @desc inverse projection view transform matrix
   * @type {Vec3}
   */
  public panInvProj: Mat4 = Mat4.Identity();

  /**
   * @desc specifies the camera's initial position on pan initialisation
   * @type {Vec3}
   */
  public panInitial: Vec3 = Vec3.Zero();

  /**
   * @desc specifies the transformed input position on initialisation
   * @type {Vec2}
   */
  public panOrigin: Vec2 = Vec2.Zero();

  /**
   * @desc specifies the client's initial input position on pan initialisation
   * @type {Vec2}
   */
  public panStart: Vec2 = Vec2.Zero();

  /**
   * @desc specifies this frame's current pan dx/dy movement
   * @type {Vec2}
   */
  public panDelta: Vec2 = Vec2.Zero();

  /**
   * @desc optionally specify this controller's pan speed multiplier
   * @type {number}
   */
  public panSpeed: number = 1;

  /**
   * @desc the current zoom factor
   * @type {number}
   */
  public zoomScale: number = 1;

  /**
   * @desc optionally specify this controller's zoom speed multiplier
   * @type {number}
   */
  public zoomSpeed: number = 1;

  /**
   * @desc some x/y position on the canvas describing the target to zoom towards
   * @type {Vec2}
   */
  public zoomTarget: Vec2 = new Vec2(-1, -1);

  /**
   * @desc lower zoom bounds
   * @type {number}
   * @private
   */
  private _zoomMin: number = 1e-3;

  /**
   * @desc upper zoom bounds
   * @type {number}
   * @private
   */
  private _zoomMax: number = 2.0;

  /**
   * @desc the input controller managing & dispatching input events assoc. with some {@link HTMLCanvasElement}
   * @type {InputController}
   * @private
   */
  private _controls!: InputController;

  /**
   * @param {OrthographicCamera} camera        the camera instance to control
   * @param {InputController}    inputControls input event dispatcher
   */
  public constructor(camera: OrthographicCamera, inputControls: InputController) {
    super();

    this.camera = camera;
    this.zoomScale = camera.zoom;

    this._controls = inputControls;
    this.initialise();
  }

  /**
   * @desc constructs a orbit cam instance given an input controller and optionally specified orthographic camera props
   * @see {@link OrthographicCamera}
   * @see {@link OrthoCamCtrlProps}
   * @see {@link OrthographicCamProps}
   * @static
   *
   * @param {InputController}   inputControls the input controller listening to user input; signals downstream camera controller inputs
   * @param {OrthoCamCtrlProps} [props]       {@link OrthographicCamera} contructor props; see {@link OrthoCamCtrlProps}
   */
  public static WithInputControls(inputControls: InputController, props?: OrthoCamCtrlProps): OrthoCamControls {
    props = { ...DefaultOrthoCamCtrlProps, ...(props ?? {}) };

    const camera = new OrthographicCamera(props);
    const controls = new OrthoCamControls(camera, inputControls);
    controls.zoomRange = [props.minZoom!, props.maxZoom!];

    return controls;
  }

  /**
   * @desc {@link OrthoCamControls} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is OrthoCamControls} specifying whether the input is a {@link OrthoCamControls}
   */
  public static Is(obj: unknown): obj is OrthoCamControls {
    return obj instanceof OrthoCamControls;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'OrthoCamControls';
  }

  /**
   * @returns {number} the allowed lower bounds of the zoom scale
   */
  public get zoomMin(): number {
    return this._zoomMin;
  }

  /**
   * @param {number} value zoom scale lower bounds
   */
  public set zoomMin(value: number) {
    if (value === this._zoomMin) {
      return;
    }

    this._zoomMin = value;
    this.zoomScale = NumberUtils.clamp(this.zoomScale, this._zoomMin, this._zoomMax);
  }

  /**
   * @returns {number} the allowed upper bounds of the zoom scale
   */
  public get zoomMax(): number {
    return this._zoomMax;
  }

  /**
   * @param {number} value zoom scale upper bounds
   */
  public set zoomMax(value: number) {
    if (value === this._zoomMax) {
      return;
    }

    this._zoomMax = value;
    this.zoomScale = NumberUtils.clamp(this.zoomScale, this._zoomMin, this._zoomMax);
    this.needsUpdate = true;
  }

  /**
   * @param {[number, number]} value sets the lower and upper bounds of the zoom scale
   */
  public set zoomRange(value: [number, number]) {
    const min = Math.min(value[0], value[1]);
    const max = Math.max(value[0], value[1]);
    if (this._zoomMin !== min || this._zoomMax !== max) {
      this._zoomMin = min;
      this._zoomMax = max;
      this.zoomScale = NumberUtils.clamp(this.zoomScale, this._zoomMin, this._zoomMax);
      this.needsUpdate = true;
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
   * @desc selectively updates this controller given the client's inputs
   *
   * @param {boolean} [force=false] optionally specify whether to forcefully update the camera instance's transform
   *
   * @returns {boolean} evaluates to `true` if the object required an update
   */
  public update(force: boolean = false): boolean {
    const cam = this.camera;

    const cnv = this._controls.element.value;
    const pan = this.panDelta;
    const zoom = this.zoomScale;

    const hasPanUpdate = pan.magnitudeSq() > 1e-4;
    const hasZoomUpdate = cam.zoom !== zoom;
    if (!this.needsUpdate && !force && !hasPanUpdate && !hasZoomUpdate) {
      if (cam.requiresUpdate(TransformUpdate.TRS, TransformUpdate.Transform)) {
        cam.updateTransform();
      }

      return false;
    }

    let w!: number, h!: number;
    if (cnv) {
      w = cnv.clientWidth;
      h = cnv.clientHeight;
    } else {
      w = 1;
      h = 1;
    }

    const panSpd = this.panSpeed;
    if (hasPanUpdate) {
      const panned = Vec2.FromArray(this.panStart).add(pan);
      panned.div([w, h]).mul([2, -2]).add([-1, 1]).applyMat4(this.panInvProj);

      const origPos = this.panOrigin;
      const initPos = this.panInitial;
      cam.position.set(initPos[0] + (origPos[0] - panned[0]) * panSpd, initPos[1] + (origPos[1] - panned[1]) * panSpd);
      this.panStart.add(pan);
    }
    pan.set(0, 0);

    if (hasZoomUpdate) {
      const trg = this.zoomTarget;
      if (trg.x < 0 || trg.y < 0) {
        trg.set(0.5, 0.5);
      } else {
        trg.div([w, h]).mul([2, -2]).add([-1, 1]);
      }

      const vec = trg.clone().applyMat4(cam.projectionMatrix.mul(cam.viewTransform).getInverse());
      cam.zoom = zoom;
      cam.updateTransform();

      const res = trg.clone().applyMat4(cam.projectionMatrix.mul(cam.viewTransform).getInverse());
      cam.position.add([vec[0] - res[0], vec[1] - res[1], 0]);
    }

    cam.updateTransform();
    this.needsUpdate = false;
    return true;
  }

  /**
   * @desc private initialiser to manage event listener(s)
   * @private
   */
  private initialise(): void {
    const controls = this._controls;
    const gBinding = controls.gestureSignal.connect((gesture: InputGesture, state: InputState, ...args: any[]): void => {
      const cam = this.camera;
      const cnv = this._controls.element.value;
      switch (gesture) {
        // 2d pan
        case InputGesture.Drag:
          {
            const inputObj = args[0] as TouchState;
            const touchObj = inputObj.touch0 as InputObject;
            const willPan = (state & InputState.Began) === InputState.Began || (state & InputState.Moved) === InputState.Moved;
            if (willPan && !this.isPanning) {
              this.panDelta.add([-inputObj.deltaPan[0], inputObj.deltaPan[1]]);
              this.panStart.set(touchObj.position[0], touchObj.position[1]);
              this.panInitial.copy(cam.position);
              this.panInvProj.copy(cam.projectionMatrix.mul(cam.viewTransform).getInverse());
              InputController.ToNormalDeviceCoordinate(this.panOrigin.copy(this.panStart), cnv).applyMat4(this.panInvProj);
            } else if (willPan) {
              this.panDelta.add([-inputObj.deltaPan[0], inputObj.deltaPan[1]]);
            } else {
              this.panDelta.set(0, 0);
            }
            this.isPanning = (state & InputState.Began) === InputState.Began || (state & InputState.Moved) === InputState.Moved;
          }
          break;

        case InputGesture.LeftDrag:
          {
            const inputObj = args[0] as InputObject;
            const willPan = (state & InputState.Began) === InputState.Began || (state & InputState.Moved) === InputState.Moved;
            if (willPan && !this.isPanning) {
              this.panDelta.add([-inputObj.deltaPosition[0], inputObj.deltaPosition[1]]);
              this.panStart.set(inputObj.position[0], inputObj.position[1]);
              this.panInitial.copy(cam.position);
              this.panInvProj.copy(cam.projectionMatrix.mul(cam.viewTransform).getInverse());
              InputController.ToNormalDeviceCoordinate(this.panOrigin.copy(this.panStart), cnv).applyMat4(this.panInvProj);
            } else if (willPan) {
              this.panDelta.add([-inputObj.deltaPosition[0], inputObj.deltaPosition[1]]);
            } else {
              this.panDelta.set(0, 0);
            }
            this.isPanning = (state & InputState.Began) === InputState.Began || (state & InputState.Moved) === InputState.Moved;
          }
          break;

        // Zoom
        case InputGesture.Pinch:
          this.processZoomCmd(args[0].deltaScale, args[0].midpoint);
          break;

        case InputGesture.Scrollwheel:
          this.processZoomCmd(args[0].deltaY, InputController.ToCanvasPosition([args[0].clientX, args[0].clientY], cnv));
          break;

        default:
          break;
      }
    });

    this._disposables.push(gBinding);
  }

  /**
   * @desc processes the touch & mouse zoom events
   * @protected
   *
   * @param {number} dy some zoom scalar
   */
  protected processZoomCmd(dy: number, pos?: Vec2Like): void {
    if (Math.abs(dy) < 1e-6) {
      return;
    }

    const dt = Math.pow(0.95, this.zoomSpeed * Math.abs(dy * 0.01));
    this.zoomScale = NumberUtils.clamp(dy > 0 ? this.zoomScale * dt : this.zoomScale / dt, this._zoomMin, this._zoomMax);

    if (typeof pos !== 'undefined') {
      this.zoomTarget.set(pos[0], pos[1]);
    }
  }
}
