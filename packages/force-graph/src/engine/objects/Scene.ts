import { Mesh } from './Mesh';
import { Camera } from './camera';
import { Device } from '@engine/core';
import { TransformUpdate } from '@engine/common';
import { Transform3d, type Transform3dProps } from './Transform3d';

/**
 * A class representing an empty, non-renderable Transform3d container
 *
 * @class
 * @constructor
 * @extends Transform3d
 * @extends Disposable
 */
export class Scene extends Transform3d {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Scene.name;

  /**
   * @see {@link Transform3d}
   *
   * @param {Transform3dProps} [props] optionally specify the base object properties, see {@link Transform3dProps}
   */
  public constructor(props?: Transform3dProps) {
    super(props);
  }

  /**
   * @desc {@link Scene} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Scene} specifying whether the input is a {@link Scene}
   */
  public static Is(obj: unknown): obj is Scene {
    return obj instanceof Scene;
  }

  /**
   * @desc renders this scene
   *
   * @param {Device} device some gpu device context
   * @param {Camera} camera the scene's camera used to render this obj
   *
   * @returns {this}
   */
  public draw(device: Device, camera: Camera): this {
    if (this.requiresUpdate(TransformUpdate.TRS)) {
      this.updateTransform(true, false, true);
    }

    this.traverse((obj: Transform3d): void => {
      if (Mesh.Is(obj)) {
        device.drawObject(obj, camera);
      }
    });

    return this;
  }
}
