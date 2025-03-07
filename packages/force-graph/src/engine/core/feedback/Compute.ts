import { ComputeVertShader, ComputeFragShader } from '@engine/shaders';

import * as AdapterUtils from '@engine/core/utils';

import { Mesh } from '@engine/objects/Mesh';
import { Device } from '@engine/core/device';
import { Material } from '@engine/objects/Material';
import { NumberUtils } from '@engine/math';
import { ExplorerError } from '@engine/common';
import { Texture, RenderTarget } from '@engine/core/portable';
import { FullscreenGeometry, type FullscreenGeomType } from '@engine/objects/geom';

import {
  isTypedBuffer,
  RenderBufferType,
  type ValueType,
  type ImageType,
  type TypedArray,
  type TextureFormat,
  type TextureInternalFmt,
  type ITexture,
  type IFrameBuffer,
  type Uniform,
  type DeviceType,
  type IMaterialProps,
} from '@engine/core/types';

/**
 * @desc describes a map of vert & frag shaders describing default sources for implemented device types
 * @see {@link DeviceType}
 */
type CDefShaderMap = Record<Extract<DeviceType, 'webgl'>, Readonly<Record<'vs' | 'fs', string>>>;

/**
 * @desc describes some Compute object
 * @see {@link Compute}
 *
 * @property {Texture}       target        the buffer texture assoc. with the compute buf
 * @property {ValueType}     [type]        optionally specify the underlying data type; defaults to `float`
 * @property {number}        [size]        optionally specify the width/height of the compute buf; only used if `data` is not specified - if specified this will be rounded to a PoT
 * @property {number}        [shape='tri'] specifies whether to build this geom as a Tri or a Quad (2x tri); only used if `geom` prop is not specified
 * @property {Geometry}      [geom]        optionally specify some geom. for the assoc. shader; defaults to {@link FullscreenGeometry}
 */
export interface ICompute {
  target: Texture;
  type: ValueType;
  size: number;
  shape: FullscreenGeomType;
  geometry: FullscreenGeometry;
}

/**
 * @desc compute (pass) unit interface
 *
 * @property {string}  [texName]  specifies the name of the texture expected by the pipeline
 * @property {Mesh}    [mesh]     specifies the geometry and material assoc. with this compute pass
 * @property {boolean} [enabled]  specifies whether this compute pass should be processed on render
 */
export interface IComputeUnit {
  texName: string;
  mesh: Mesh;
  enabled: boolean;
}

/**
 * @desc instantiation props
 * @see {@link Compute}
 * @see {@link ICompute}
 *
 * @property {ImageType}          [src]            optionally specify some texture source from which to build the texture
 * @property {number}             [alignment=1]    specifies how to read the tex. components
 * @property {TextureFormat}      [format]         internal ref. to the gpu format
 * @property {TextureInternalFmt} [internalFormat] specifying the colour components in the texture
 */
export interface ComputeProps extends ICompute {
  src?: ImageType;
  alignment?: number;
  format?: TextureFormat;
  internalFormat?: TextureInternalFmt;
}

/**
 * @desc compute (pass) unit instantiation props
 * @extends IMaterialProps
 *
 * @property {string}                     vs         the vertex shader source assoc. with this pass
 * @property {string}                     fs         the fragment shader source assoc. with this pass
 * @property {string}                     [texName]  specifies the name of the texture uniform
 * @property {boolean}                    [enabled]  specifies whether this compute pass will be processed; defaults to `true`
 * @property {string}                     [version]  the desired shader language version; defaults to `300 es` if device is `webgl`
 * @property {Record<string, any> | null} [defines]  any definitions that should be appended to the shader on assembly
 * @property {Record<string, string>}     [includes] include directive lookup
 * @property {Record<string, Uniform>}    [uniforms] the uniforms assoc. with this pass and its render pipeline
 */
export interface ComputePassProps extends Partial<IMaterialProps> {
  vs: string;
  fs: string;
  texName?: string;
  enabled?: boolean;
  version?: string;
  defines?: Record<string, any> | null;
  includes?: Record<string, string> | null;
  uniforms?: Record<string, Uniform>;
}

/**
 * Class describing compute behaviour for GPGPU
 *
 * @class
 * @constructor
 */
export class Compute implements ICompute {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Compute.name;

  /**
   * @desc the default name of the texture uniform
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly DefaultTexName: string = 'uTex';

  /**
   * @desc default vertex and fragment shaders
   * @type {CDefShaderMap}
   * @static
   * @readonly
   */
  public static readonly DefaultShaders: CDefShaderMap = {
    webgl: { vs: ComputeVertShader, fs: ComputeFragShader },
  };

  /**
   * @desc internal ID counter
   * @type {number}
   * @static
   */
  private static _ref: number = 0;

  /**
   * @desc this instance's internal ID
   * @type {number}
   * @readonly
   */
  public readonly id!: number;

  /**
   * @desc specifies the type of the underlying texture data
   * @type {ValueType}
   * @readonly
   */
  public readonly type!: ValueType;

  /**
   * @desc the target render texture of this instance
   * @type {Texture}
   * @readonly
   */
  public readonly target!: Texture;

  /**
   * @desc the target texture uniform, appended to each material on render
   * @type {Uniform}
   * @readonly
   */
  public readonly uniform!: Uniform;

  /**
   * @desc the fullscreen geometry assoc. with this instance
   * @type {Geometry}
   * @readonly
   */
  public readonly geometry!: FullscreenGeometry;

  /**
   * @desc specifies whether this instance's assoc. geometry is of a `tri` or `quad` shape
   * @type {FullscreenGeomType}
   * @readonly
   */
  public readonly shape!: FullscreenGeomType;

  /**
   * @desc
   * @type {Array<IComputeUnit>}
   * @readonly
   */
  public readonly passes: Array<IComputeUnit> = [];

  /**
   * @desc the size, describing both the width and height, of the target texture
   * @note this will be rounded to the nearest power of two
   * @type {number}
   * @private
   */
  private _size!: number;

  /**
   * @desc the render/framebuffer to be read from
   * @type {RenderTarget}
   * @private
   */
  private _readTarget!: RenderTarget;

  /**
   * @desc the render/framebuffer to be written to
   * @type {RenderTarget}
   * @private
   */
  private _writeTarget!: RenderTarget;

  /**
   * @note if no target texture is provided this instance will be instantiated using the specified `type` and `size` properties if available; otherwise a `Float32Array` texture is instantiated
   * @see {@link ComputeProps}
   * @see {@link ICompute}
   *
   * @param {Partial<ComputeProps>} props constructor props
   */
  public constructor(props: Partial<ComputeProps>) {
    let size = props.size,
      type = props.type,
      target = props.target;
    if (target == null || typeof target === 'undefined' || ArrayBuffer.isView(props.src)) {
      let buf: TypedArray;
      if (ArrayBuffer.isView(props.src)) {
        buf = props.src;
        size = NumberUtils.ceilPowerOfTwo(size ?? Math.sqrt(props.src.byteLength / props.src.BYTES_PER_ELEMENT / 4));
        type = type ?? AdapterUtils.getAttrDataType(buf);
      } else {
        size = NumberUtils.ceilPowerOfTwo(size ?? 1);
        type = type ?? 'float';

        const cls = AdapterUtils.getArrayBufferConstructor(type);
        buf = new cls(size * size * 4);
        buf.fill(0);
      }

      target = new Texture({
        image: buf,
        width: size,
        height: size,
        type: type,
        target: 'texture2d',
        format: props.format ?? 'rgba',
        internalFormat: props.internalFormat ?? 'rgba32-float',
        flipY: false,
        mipmaps: false,
        minFilter: 'nearest',
        magFilter: 'nearest',
        wrapU: 'repeat',
        wrapV: 'repeat',
        wrapW: 'repeat',
        alignment: props.alignment ?? 1,
      });
    } else {
      size = NumberUtils.ceilPowerOfTwo(size ?? Math.min(target.width, target.height));
      type = props.type ?? AdapterUtils.getAttrDataType(target.image as TypedArray);

      target.width = size;
      target.height = size;
    }

    const renderProps: Partial<Omit<IFrameBuffer, 'textures'> & ITexture> = {
      type: type,
      width: size,
      height: size,
      format: props.format ?? 'rgba',
      target: 'texture2d',
      internalFormat: props.internalFormat ?? 'rgba32-float',
      minFilter: 'nearest',
      magFilter: 'nearest',
      renderBufferType: RenderBufferType.None,
      attachments: 1,
      wrapU: 'repeat',
      wrapV: 'repeat',
      wrapW: 'repeat',
    };

    this.id = Compute._ref++;
    this.type = type;
    this.shape = props.shape ?? 'tri';
    this.geometry = props.geometry ?? new FullscreenGeometry({ shape: props.shape });
    this.target = target;
    this.target.setSize(size, size);
    this.uniform = { value: target, needsUpdate: true };

    this._readTarget = new RenderTarget(renderProps);
    this._writeTarget = new RenderTarget(renderProps);
    this._size = size;
  }

  /**
   * @desc attempts to instantiate a {@link Compute} instance from a {@link Texture}, or some related image data target, _e.g._ some {@link ImageReference} / {@link ImageType}
   * @note async as a result of the requirement to read non-accessible image data from an {@link OffscreenCanvas} (if applicable)
   * @async
   * @static
   *
   * @param {Partial<ComputeProps>} [props] constructor props
   *
   * @returns {Promise<Compute>} a thenable that will evaluate to a {@link Compute} instance if successfully instantiated
   */
  public static async From(props?: Partial<ComputeProps>): Promise<Compute> {
    props = props ?? {};

    return new Promise<typeof props>((resolve, reject) => {
      if (typeof props.src === 'undefined') {
        resolve(props);
        return;
      } else if (props?.target instanceof Texture) {
        if (!ArrayBuffer.isView(props.target.image)) {
          reject(
            new ExplorerError({
              code: ExplorerError.Errors.InvalidArgument,
              msg: 'Compute expects an ArrayBuffer texture',
            })
          );

          return;
        }
      } else if (isTypedBuffer(props.src)) {
        const len = props.src.byteLength / props.src.BYTES_PER_ELEMENT;
        const size = NumberUtils.ceilPowerOfTwo(props.size ?? Math.sqrt(len / 4));
        props.size = size;

        resolve(props);
        return;
      }

      return Texture.GetImageData(props.src).then(data => {
        props.src = data;
        resolve(props);
      });
    }).then(props => {
      if (!Texture.Is(props?.target)) {
        if (props.src instanceof ImageData) {
          props.size = props.size ?? Math.min(props.src.width, props.src.height);
          if (typeof props.type === 'undefined') {
            props.type = AdapterUtils.getAttrDataType(props.src.data);
          } else {
            props.src = AdapterUtils.convertTypedArray(props.type, props.src.data);
            props.type = props.type ?? AdapterUtils.getAttrDataType(props.src);
          }
        } else if (typeof props.src === 'undefined' || props.src === null) {
          props.size = props.size ?? 16;
          props.type = props.type ?? 'float';

          const cls = AdapterUtils.getArrayBufferConstructor(props.type);
          props.src = new cls(props.size * props.size * 4);
          props.src.fill(0);
        } else if (isTypedBuffer(props.src)) {
          if (typeof props.type === 'undefined') {
            props.type = AdapterUtils.getAttrDataType(props.src);
          } else {
            props.src = AdapterUtils.convertTypedArray(props.type, props.src);
            props.type = props.type ?? AdapterUtils.getAttrDataType(props.src);
          }

          props.size = props.size ?? Math.sqrt(props.src.byteLength / props.src.BYTES_PER_ELEMENT / 4);
        }

        props.target = new Texture({
          image: props.src,
          width: props.size,
          height: props.size,
          type: props.type,
          target: 'texture2d',
          format: props.format ?? 'rgba',
          internalFormat: props.internalFormat ?? 'rgba32-float',
          flipY: false,
          mipmaps: false,
          minFilter: 'nearest',
          magFilter: 'nearest',
          wrapU: 'repeat',
          wrapV: 'repeat',
          wrapW: 'repeat',
          alignment: props.alignment ?? 1,
        });
      }

      const { width, height } = props.target;
      props.size = Math.min(width, height);
      props.type = props.type ?? AdapterUtils.getAttrDataType(props.target.image as TypedArray)!;
      props.shape = props.shape ?? 'tri';
      props.geometry = props.geometry ?? new FullscreenGeometry({ shape: props.shape });

      return new Compute(props as ICompute);
    });
  }

  /**
   * @desc {@link Compute} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Compute} specifying whether the input is a {@link Compute}
   */
  public static Is(obj: unknown): obj is Compute {
    return obj instanceof Compute;
  }

  /**
   * @desc this instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Compute';
  }

  /**
   * @returns {number} a scalar value describing the width and height of the target texture
   */
  public get size(): number {
    return this._size;
  }

  /**
   * @param {number} value a scalar value specifying the width and height of the target texture
   */
  public set size(value: number) {
    // TODO: flag `needsUpdate`? Need to update tex and render targets?
    this._size = NumberUtils.ceilPowerOfTwo(value);
  }

  /**
   * @desc swaps the render targets
   *
   * @returns {this}
   */
  public swap(): this {
    let tmp = this._readTarget;
    this._readTarget = this._writeTarget;
    this._writeTarget = tmp;

    this.uniform.value = this._readTarget.textures[0];
    return this;
  }

  /**
   * @desc enacts the compute units/passes assoc. with this instance, successively rendering each to the current write {@link RenderTarget}
   *
   * @param {Device} device some gpu device context
   *
   * @returns {this}
   */
  public compute(device: Device): this {
    const passes = this.passes;

    let pass: IComputeUnit | undefined;
    for (let i = 0; i < passes.length; ++i) {
      pass = passes[i];
      if (!pass || !pass.enabled) {
        continue;
      }

      device.setRenderTarget(this._writeTarget);
      device.drawObject(pass.mesh);
      this.swap();
    }

    return this;
  }

  /**
   * @desc constructs and appends a compute (pass) unit to this instance
   *
   * @param {ComputePassProps} props compute pass instantiation props
   *
   * @returns {IComputeUnit} an object describing some compute pass unit and its assoc. resource(s)
   */
  public addComputeUnit(props: ComputePassProps): IComputeUnit {
    props.texName = props.texName ?? Compute.DefaultTexName;
    props.uniforms = props.uniforms ?? {};
    props.uniforms[props.texName] = this.uniform;

    const pass: IComputeUnit = {
      mesh: new Mesh(
        this.geometry,
        new Material({
          vs: props.vs,
          fs: props.fs,
          version: props.version,
          defines: props.defines,
          uniforms: props.uniforms,
          includes: props.includes,
          blendSrc: props.blendSrc,
          blendDst: props.blendDst,
          blendSrcAlpha: props.blendSrcAlpha,
          blendDstAlpha: props.blendDstAlpha,
        })
      ),
      enabled: props.enabled ?? true,
      texName: props.texName,
    };

    this.passes.push(pass);
    return pass;
  }

  /**
   * @desc attempts to remove of a compute (pass) from this instance _without_ disposing of it
   *
   * @param {IComputeUnit} pass the compute (pass) unit to remove
   *
   * @returns {boolean} reflecting whether this unit was removed
   */
  public removeComputeUnit(pass: IComputeUnit): boolean {
    const index = this.passes.findIndex(x => x === pass);
    if (index >= 0) {
      this.passes.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * @desc attempts to remove and dispose of a compute (pass) from this instance
   * @note this instance will not be disposed unless it is known to be a related compute pass
   *
   * @param {IComputeUnit} pass the compute (pass) unit to remove & dispose
   *
   * @returns {boolean} reflecting whether this unit was removed & disposed
   */
  public disposeComputeUnit(pass: IComputeUnit): boolean {
    if (this.removeComputeUnit(pass)) {
      pass.mesh.dispose();
      return true;
    }

    return false;
  }

  /**
   * @desc destroys this inst & its assoc. resources
   */
  public dispose(): void {
    this._readTarget.dispose();
    this._writeTarget.dispose();
    this.target.dispose();

    for (let i = 0; i < this.passes.length; ++i) {
      this.passes.shift()?.mesh?.dispose?.();
    }
  }
}
