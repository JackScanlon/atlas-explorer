import { Mat4 } from '@engine/math';
import { Camera } from './camera';
import { Geometry } from './geom';
import { Material } from './Material';
import { TransformUpdate } from '@engine/common';
import { Transform3d, Transform3dProps } from './Transform3d';

/**
 * A class representing some mesh object containing a {@link Material} and a {@link Geometry}
 *
 * @class
 * @constructor
 * @extends Transform3d
 * @extends Disposable
 */
export class Mesh extends Transform3d {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Mesh.name;

  /**
   * @desc transposed inverse of the orientation component of the model's view matrix
   * @type {Mat4}
   * @readonly
   */
  public readonly normalMatrix: Mat4 = new Mat4();

  /**
   * @desc instance's local->world & world->view-space transform
   * @type {Mat4}
   * @readonly
   */
  public readonly modelViewMatrix: Mat4 = new Mat4();

  /**
   * @desc some assoc. geometry
   * @type {Geometry}
   */
  public geometry!: Geometry;

  /**
   * @desc some assoc. material
   * @type {Material}
   */
  public material!: Material;

  /**
   * @param {Geometry}         geom     a geom inst describing this object's attribute buffers
   * @param {Material}         material some pipeline contained by some {@link Material}
   * @param {Transform3dProps} [props]  optionally specify the base object properties, see {@link Transform3dProps}
   */
  public constructor(geom: Geometry, material: Material, props?: Transform3dProps) {
    super(props);

    this.geometry = geom;
    this.material = material;

    const uniforms = this.material.uniforms;
    uniforms.viewMatrix = { value: null };
    uniforms.cameraPosition = { value: null };
    uniforms.projectionMatrix = { value: null };

    uniforms.modelMatrix = { value: this.transform, needsUpdate: true };
    uniforms.normalMatrix = { value: this.normalMatrix, needsUpdate: true };
    uniforms.modelViewMatrix = { value: this.modelViewMatrix, needsUpdate: true };
  }

  /**
   * @desc {@link Mesh} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Mesh} specifying whether the input is a {@link Mesh}
   */
  public static Is(obj: unknown): obj is Mesh {
    return obj instanceof Mesh;
  }

  /**
   * @desc updates this inst's model view matrix & its normal matrix, see {@link Material}
   *
   * @param {Camera} camera the scene's camera used to render this obj
   *
   * @returns {this}
   */
  public updateMatrix(camera: Camera): this {
    this.modelViewMatrix.mulMatrices(camera.viewTransform, this.transform);
    this.normalMatrix.copy(this.modelViewMatrix).normalise();
    this.toggleUpdateReq(TransformUpdate.Transform, false);
    return this;
  }

  /**
   * @desc updates the transform, geometry & material associated with this object
   *
   * @param {Camera} camera the camera from which this object will be rendered
   *
   * @returns {this}
   */
  public updateRender(camera: Camera): this {
    if (this.requiresUpdate(TransformUpdate.TRS)) {
      this.updateTransform(true, false, true);
    }

    if (this.requiresUpdate(TransformUpdate.Transform) || camera.requiresUpdate(TransformUpdate.Rendering)) {
      this.updateMatrix(camera);
    }

    if (this.material.uniforms.viewMatrix.value !== camera.viewTransform) {
      this.material.uniforms.viewMatrix.value = camera.viewTransform;
      this.material.uniforms.cameraPosition.value = camera.position;
      this.material.uniforms.projectionMatrix.value = camera.projectionMatrix;

      this.material.uniforms.viewMatrix.needsUpdate = true;
      this.material.uniforms.cameraPosition.needsUpdate = true;
      this.material.uniforms.projectionMatrix.needsUpdate = true;
    }

    return this;
  }
}
