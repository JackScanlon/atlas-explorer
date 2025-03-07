import { Mat4 } from '@engine/math';
import { Transform3d, Transform3dProps } from '@engine/objects/Transform3d';
import { TransformUpdate } from '@engine/common';

/**
 * A base class describing an extensible Camera
 *
 * @class
 * @constructor
 * @extends Transform3d
 * @extends Disposable
 */
export class Camera extends Transform3d {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Camera.name;

  /**
   * @desc a matrix describing this camera's projection mat
   * @type {Mat4}
   * @readonly
   */
  public readonly projectionMatrix: Mat4 = new Mat4();

  /**
   * @desc world inverse matrix
   * @type {Mat4}
   * @readonly
   */
  public readonly viewTransform: Mat4 = new Mat4();

  /**
   * @param {Transform3dProps} [props] optionally specify the base object properties, see {@link Transform3dProps}
   */
  public constructor(props?: Transform3dProps) {
    super(props);
  }

  /**
   * @desc {@link Camera} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Camera} specifying whether the input is a {@link Camera}
   */
  public static Is(obj: unknown): obj is Camera {
    return obj instanceof Camera;
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

    if ((this._updateTypes & TransformUpdate.Transform) === TransformUpdate.Transform) {
      this.viewTransform.copy(this.transform).inverse();
    }

    return this;
  }
}
