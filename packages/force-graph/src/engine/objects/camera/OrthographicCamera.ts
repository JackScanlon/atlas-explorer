import { Camera } from './Camera';
import { TransformUpdate } from '@engine/common';
import { type Transform3dProps } from '@engine/objects/Transform3d';

/**
 * @desc Orthographic camera constructor props
 * @extends Transform3dProps
 *
 * @property {number} [near=0.1]    frustum near plane distance
 * @property {number} [far=1000]    frustum far plane distance
 * @property {number} [left=-1]     frustum left plane
 * @property {number} [right=1]     frustum right plane
 * @property {number} [top=1]       frustum top plane
 * @property {number} [bottom=-1]   frustum bottom plane
 * @property {number} [zoom=1]      camera zoom scale
 */
export interface OrthographicCamProps extends Transform3dProps {
  near?: number;
  far?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  zoom?: number;
}

/**
 * @desc describes some orthographic window / view offset (i.e. some translation of a frustum along its XY axes)
 *
 * @property {number} [width=70]       width of view
 * @property {number} [height=1]       height of view
 * @property {number} [offsetX=0.1]    view offset from frustum left
 * @property {number} [offsetY=1000]   view offset from frustum top
 * @property {number} [invWidth=1000]  1 / width
 * @property {number} [invHeight=1000] 1 / height
 */
export interface OrthographicViewWindow {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  invWidth: number;
  invHeight: number;
}

/**
 * @desc default constructor props
 * @type {OrthographicCamProps}
 * @constant
 */
export const DefaultOrthoCamProps: OrthographicCamProps = {
  near: 0.1,
  far: 100,
  left: -1,
  right: 1,
  top: 1,
  bottom: -1,
  zoom: 1,
  position: [0, 0, 1],
};

/**
 * Class describing an orthographic cam projection
 *
 * @class
 * @constructor
 * @extends Camera
 * @extends Transform3d
 * @extends Disposable
 */
export class OrthographicCamera extends Camera {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = OrthographicCamera.name;

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
   * @desc this camera's left plane; defaults to `-1`
   * @type {number}
   * @private
   */
  private _left!: number;

  /**
   * @desc this camera's right plane; defaults to `1`
   * @type {number}
   * @private
   */
  private _right!: number;

  /**
   * @desc this camera's top plane; defaults to `1`
   * @type {number}
   * @private
   */
  private _top!: number;

  /**
   * @desc this camera's bottom plane; defaults to `-1`
   * @type {number}
   * @private
   */
  private _bottom!: number;

  /**
   * @desc this camera's current zoom scale; defaults to `1`
   * @type {number}
   * @private
   */
  private _zoom!: number;

  /**
   * @desc describes some perspective window / view offset (i.e. some translation of a frustum along its XY axes)
   * @type {OrthographicViewWindow|undefined}
   * @private
   */
  private _viewWindow?: OrthographicViewWindow;

  /**
   * @desc constructs a camera with a orthographic projection
   *
   * @param {OrthographicCamProps} [props] see {@link OrthographicCamProps} and {@link Transform3dProps}
   */
  public constructor(props?: OrthographicCamProps) {
    const opts = { ...DefaultOrthoCamProps, ...(props ?? {}) } as Required<OrthographicCamProps>;
    super(props);

    this._far = opts.far;
    this._near = opts.near;
    this._left = opts.left;
    this._right = opts.right;
    this._top = opts.top;
    this._bottom = opts.bottom;
    this._zoom = opts.zoom;

    this.toggleUpdateReq(TransformUpdate.TRS | TransformUpdate.TRS, true);
    this.updateTransform(true, false);
  }

  /**
   * @desc {@link OrthographicCamera} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is OrthographicCamera} specifying whether the input is a {@link OrthographicCamera}
   */
  public static Is(obj: unknown): obj is OrthographicCamera {
    return obj instanceof OrthographicCamera;
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
   * @desc left plane getter
   */
  public get left(): number {
    return this._left;
  }

  /**
   * @desc left plane setter, will dispatch a `left` change event
   */
  public set left(value: number) {
    if (this._left === value) {
      return;
    }

    this._left = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('left', value);
  }

  /**
   * @desc right plane getter
   */
  public get right(): number {
    return this._right;
  }

  /**
   * @desc right plane setter, will dispatch a `right` change event
   */
  public set right(value: number) {
    if (this._right === value) {
      return;
    }

    this._right = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('right', value);
  }

  /**
   * @desc bottom plane getter
   */
  public get bottom(): number {
    return this._bottom;
  }

  /**
   * @desc bottom plane setter, will dispatch a `bottom` change event
   */
  public set bottom(value: number) {
    if (this._bottom === value) {
      return;
    }

    this._bottom = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('bottom', value);
  }

  /**
   * @desc top plane getter
   */
  public get top(): number {
    return this._top;
  }

  /**
   * @desc top plane setter, will dispatch a `top` change event
   */
  public set top(value: number) {
    if (this._top === value) {
      return;
    }

    this._top = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('top', value);
  }

  /**
   * @desc zoom getter
   */
  public get zoom(): number {
    return this._zoom;
  }

  /**
   * @desc zoom setter, will dispatch a `zoom` change event
   */
  public set zoom(value: number) {
    if (this._zoom === value) {
      return;
    }

    this._zoom = value;
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('zoom', value);
  }

  /**
   * @returns {Readonly<OrthographicViewWindow> | undefined}
   */
  public get viewWindow(): Readonly<OrthographicViewWindow> | undefined {
    return this._viewWindow ? Object.freeze(this._viewWindow) : undefined;
  }

  /**
   * @param {Nullable<OrthographicViewWindow>} value
   */
  public set viewWindow(value: Nullable<OrthographicViewWindow>) {
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
   * @param {boolean} [updateParent=true]    specifies whether to update all parent transforms before updating this object
   * @param {boolean} [claimUpdate=true]     specifies whether to claim transform updates when recursively updating transform(s) in hierarchy
   *
   * @returns {this} this transform
   */
  public override updateTransform(ignoreChildren: boolean = false, updateParent: boolean = false, claimUpdate: boolean = true): this {
    super.updateTransform(ignoreChildren, updateParent, claimUpdate);

    if (this.claimUpdate(TransformUpdate.Transform)) {
      const view = this._viewWindow;

      const zf = this._zoom;
      const dw = this._right - this._left;
      const dh = this._top - this._bottom;

      const dx = dw / (2 * zf);
      const dy = dh / (2 * zf);
      const cx = 0.5 * (this._right + this._left);
      const cy = 0.5 * (this._top + this._bottom);

      let left = cx - dx;
      let right = cx + dx;
      let top = cy + dy;
      let bottom = cy - dy;

      if (view) {
        const scaleW = (dw * view.invWidth) / zf;
        const scaleH = (dh * view.invHeight) / zf;

        left += scaleW * view.offsetX;
        right = left + scaleW * view.width;
        top -= scaleH * view.offsetY;
        bottom = top - scaleH * view.height;
      }

      this.projectionMatrix.setOrthographicProj(left, right, bottom, top, this._near, this._far);
      this.projectionMatrix.scale([zf, zf, 1 / zf]);
      this.toggleUpdateReq(TransformUpdate.Rendering, true);
    }

    return this;
  }
}
