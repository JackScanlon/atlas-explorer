import { Camera } from './Camera';
import { DEG2RAD } from '@engine/common/constants';
import { TransformUpdate } from '@engine/common';
import { type Transform3dProps } from '@engine/objects/Transform3d';

/**
 * @desc Perspective camera constructor props
 * @extends Transform3dProps
 *
 * @property {number} [fov=70]   vertical field of view (in degrees)
 * @property {number} [aspect=1] view aspect ratio
 * @property {number} [near=0.1] frustum near plane distance
 * @property {number} [far=1000] frustum far plane distance
 */
export interface PerspectiveCamProps extends Transform3dProps {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
}

/**
 * @desc describes some perspective window / view offset (i.e. some translation of a frustum along its XY axes)
 *
 * @property {number} [width=70]       width of view
 * @property {number} [height=1]       height of view
 * @property {number} [offsetX=0.1]    view offset from frustum left
 * @property {number} [offsetY=1000]   view offset from frustum top
 * @property {number} [invWidth=1000]  1 / width
 * @property {number} [invHeight=1000] 1 / height
 */
export interface PerspectiveViewWindow {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  invWidth: number;
  invHeight: number;
}

/**
 * @desc default constructor props
 * @type {PerspectiveCamProps}
 * @constant
 */
export const DefaultPerspCamProps: PerspectiveCamProps = {
  fov: 70,
  aspect: 1,
  near: 0.1,
  far: 1000,
  position: [0, 0, 1],
};

/**
 * Class describing a perspective projection
 *
 * @class
 * @constructor
 * @extends Camera
 * @extends Transform3d
 * @extends Disposable
 */
export class PerspectiveCamera extends Camera {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = PerspectiveCamera.name;

  /**
   * @desc this camera's vertical fov; defaults to `70`
   * @type {number}
   * @private
   */
  private _fov!: number;

  /**
   * @desc this camera's aspect ratio; defaults to `1`
   * @type {number}
   * @private
   */
  private _aspectRatio!: number;

  /**
   * @desc this camera's near plane distance; defaults to `0.1`
   * @type {number}
   * @private
   */
  private _near!: number;

  /**
   * @desc this camera's far plane distance; defaults to `1000`
   * @type {number}
   * @private
   */
  private _far!: number;

  /**
   * @desc describes some perspective window / view offset (i.e. some translation of a frustum along its XY axes)
   * @type {PerspectiveViewWindow|undefined}
   * @private
   */
  private _viewWindow?: PerspectiveViewWindow;

  /**
   * @desc constructs a camera with a perspective projection
   *
   * @param {PerspectiveCamProps} [props] see {@link PerspectiveCamProps}
   */
  public constructor(props?: PerspectiveCamProps) {
    const opts = { ...DefaultPerspCamProps, ...(props ?? {}) } as Required<PerspectiveCamProps>;
    super(props);

    this._fov = opts.fov;
    this._far = opts.far;
    this._near = opts.near;
    this._aspectRatio = opts.aspect;

    this.toggleUpdateReq(TransformUpdate.TRS | TransformUpdate.TRS, true);
    this.updateTransform(true, false);
  }

  /**
   * @desc {@link PerspectiveCamera} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is PerspectiveCamera} specifying whether the input is a {@link PerspectiveCamera}
   */
  public static Is(obj: unknown): obj is PerspectiveCamera {
    return obj instanceof PerspectiveCamera;
  }

  /**
   * @desc vertical fov
   */
  public get fov(): number {
    return this._fov;
  }

  /**
   * @desc vertical fov setter, will dispatch a `fov` change event
   */
  public set fov(value: number) {
    if (this._fov === value) {
      return;
    }

    this._fov = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('fov', value);
  }

  /**
   * @desc far plane distance getter
   */
  public get far(): number {
    return this._far;
  }

  /**
   * @desc far plane distance setter, will dispatch a `far` change event
   */
  public set far(value: number) {
    if (this._far === value) {
      return;
    }

    this._far = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('far', value);
  }

  /**
   * @desc near plane distance getter
   */
  public get near(): number {
    return this._near;
  }

  /**
   * @desc near plane distance setter, will dispatch a `near` change event
   */
  public set near(value: number) {
    if (this._near === value) {
      return;
    }

    this._near = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('near', value);
  }

  /**
   * @desc aspect ratio getter
   */
  public get aspectRatio(): number {
    return this._aspectRatio;
  }

  /**
   * @desc aspect ratio setter, will dispatch a `parent` change event
   */
  public set aspectRatio(value: number) {
    if (this._aspectRatio === value) {
      return;
    }

    this._aspectRatio = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('aspect', value);
  }

  /**
   * @returns {Readonly<PerspectiveViewWindow> | undefined}
   */
  public get viewWindow(): Readonly<PerspectiveViewWindow> | undefined {
    return this._viewWindow ? Object.freeze(this._viewWindow) : undefined;
  }

  /**
   * @param {Nullable<PerspectiveViewWindow>} value
   */
  public set viewWindow(value: Nullable<PerspectiveViewWindow>) {
    if (this._viewWindow === value) {
      return;
    }

    this._viewWindow = !value ? undefined : value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('viewWindow', value);
  }

  /**
   * @desc sets the frustum window
   *
   * @param {number} offsetX      desired horizontal offset of the window (bottom-left)
   * @param {number} offsetY      desired vertical offset of the window (bottom-left)
   * @param {number} width        desired width of the window
   * @param {number} height       desired height of the window
   * @param {number} widthScreen  width of the canvas
   * @param {number} heightScreen height of the canvas
   *
   * @returns {this}
   */
  public setWindow(offsetX: number, offsetY: number, width: number, height: number, widthScreen: number, heightScreen: number): this {
    let view = this._viewWindow;
    if (typeof view === 'undefined') {
      view = {
        width,
        height,
        offsetX,
        offsetY,
        invWidth: 1 / widthScreen,
        invHeight: 1 / heightScreen,
      };
      this._viewWindow = view;
    } else {
      view.width = width;
      view.height = height;
      view.offsetX = offsetX;
      view.offsetY = offsetY;
      view.invWidth = 1 / widthScreen;
      view.invHeight = 1 / heightScreen;
    }

    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('viewWindow', this._viewWindow);
    return this;
  }

  /**
   * @desc updates this object's transform matrix
   * @note updates world inverse matrix
   *
   * @param {boolean} [ignoreChildren=false] specifies whether to ignore updating child transforms, even if `autoUpdateChildTransform` is flagged
   * @param {boolean} [updateParent=false]   specifies whether to update all parent transforms before updating this object
   * @param {boolean} [claimUpdate=true]     specifies whether to claim transform updates when recursively updating transform(s) in hierarchy
   *
   * @returns {this} this transform
   */
  public override updateTransform(ignoreChildren: boolean = false, updateParent: boolean = false, claimUpdate: boolean = true): this {
    super.updateTransform(ignoreChildren, updateParent, claimUpdate);

    if (this.claimUpdate(TransformUpdate.Transform)) {
      const view = this._viewWindow;
      if (!view) {
        this.projectionMatrix.setPerspectiveProj(this._fov, this._aspectRatio, this._near, this._far);
      } else {
        const far = this._far;
        const near = this._near;
        const aspect = this._aspectRatio;

        let top = Math.tan(DEG2RAD * this._fov * 0.5) * near;
        let bottom = -top;
        let left = aspect * bottom;
        let right = aspect * top;
        let width = Math.abs(right - left);
        let height = Math.abs(top - bottom);
        left += view.offsetX * width * view.invWidth;
        bottom += view.offsetY * height * view.invHeight;
        width *= view.width * view.invWidth;
        height *= view.height * view.invHeight;

        this.projectionMatrix.setFrustumPerspProj(left, left + width, bottom + height, bottom, near, far);
      }
    }

    return this;
  }
}
