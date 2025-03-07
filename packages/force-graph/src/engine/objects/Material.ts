import { EmptyVertShader, EmptyFragShader } from '@engine/shaders';

import type { Uniform, BlendFunc, BlendOp, CullMode, DepthComparator, FrontFace, IMaterialProps } from '@engine/core';

/**
 * Class representing some material, its props and assoc. uniforms and some assoc. render pipeline
 *
 * @class
 * @constructor
 */
export class Material implements IMaterialProps {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Material.name;

  /**
   * @desc internal ID counter
   * @type {number}
   * @static
   */
  private static _ref: number = 0;

  /**
   * @desc default properties assoc. with this instance; used to fulfil props requirements on construction
   * @type {IMaterialProps}
   * @static
   */
  public static DefaultProps: Partial<IMaterialProps> = {
    vs: EmptyVertShader,
    fs: EmptyFragShader,
    cullMode: 'back',
    frontFace: 'CCW',

    depthTest: true,
    depthWrite: true,
    transparent: true,

    depthComp: 'less-equal',
    blendSrc: 'src-alpha',
    blendDst: 'one-minus-src-alpha',
    blendSrcAlpha: 'src-alpha',
    blendDstAlpha: 'one-minus-src-alpha',
    blendOp: 'add',
    blendOpAlpha: 'add',
  };

  /**
   * @desc this instance's internal ID
   * @type {number}
   * @readonly
   */
  public readonly id!: number;

  /**
   * @desc the vertex shader source
   * @note this is varied when processed by the pipeline; however, changing this property further will not force recompilation
   * @type {string}
   */
  public vs!: string;

  /**
   * @desc the vertex shader source
   * @note this is varied when processed by the pipeline; however, changing this property further will not force recompilation
   * @type {string}
   */
  public fs!: string;

  /**
   * @desc gpu shader language version; predominantly for WebGL devices
   * @type {string}
   */
  public version?: string;

  /**
   * @desc a set of definitions applied to the shader version
   * @note modifying this will not force shader recompilation
   * @type {Record<string, any>|null}
   */
  public defines?: Record<string, any> | null;

  /**
   * @desc include directive lookup
   * @see http://www.opengl.org/registry/specs/ARB/shading_language_include.txt
   * @type {Record<string, string>|null}
   */
  public includes?: Record<string, string> | null;

  /**
   * @desc describes a set of global gpu constants
   * @type {Uniform}
   */
  public readonly uniforms!: Record<string, Uniform>;

  /**
   * @desc specifies how to cull faces
   * @see {@link CullMode}
   */
  public cullMode: CullMode | undefined;

  /**
   * @desc specifies the winding order of polygons
   * @see {@link FrontFace}
   */
  public frontFace!: FrontFace;

  /**
   * @desc specifies whether the material should compare its pixels against the depth buffer
   * @type {boolean}
   */
  public depthTest!: boolean;

  /**
   * @desc specifies whether the material should contribute to the depth buffer
   * @type {boolean}
   */
  public depthWrite!: boolean;

  /**
   * @desc specifies whether the material should support transparent renders
   * @type {boolean}
   */
  public transparent!: boolean;

  /**
   * @desc specifies the depth buffer comparator function
   * @see {@link DepthComparator}
   */
  public depthComp!: DepthComparator;

  /**
   * @desc specifies the colour source function
   * @see {@link BlendFunc}
   */
  public blendSrc: BlendFunc | undefined;

  /**
   * @desc specifies the colour destination function
   * @see {@link BlendFunc}
   */
  public blendDst: BlendFunc | undefined;

  /**
   * @desc specifies the alpha source blending function
   * @see {@link BlendFunc}
   */
  public blendSrcAlpha: BlendFunc | undefined;

  /**
   * @desc specifies the alpha destination blending function
   * @see {@link BlendFunc}
   */
  public blendDstAlpha: BlendFunc | undefined;

  /**
   * @desc specifies the colour blend equation
   * @see {@link BlendOp}
   */
  public blendOp: BlendOp | undefined;

  /**
   * @desc specifies the alpha blend equation
   * @see {@link BlendOp}
   */
  public blendOpAlpha: BlendOp | undefined;

  /**
   * @param props see {@link IMaterialProps}}
   */
  public constructor(props: Partial<Omit<IMaterialProps, 'id'>>) {
    props.uniforms = props.uniforms ?? {};

    const opts = {
      ...Material.DefaultProps,
      ...props,
    } as IMaterialProps;

    this.id = 'id' in props ? (props.id as number) : Material._ref++;
    this.vs = opts.vs;
    this.fs = opts.fs;
    this.version = opts.version;
    this.defines = opts.defines;
    this.includes = opts.includes;
    this.uniforms = opts.uniforms;
    this.cullMode = opts.cullMode;
    this.frontFace = opts.frontFace;
    this.depthTest = opts.depthTest;
    this.depthWrite = opts.depthWrite;
    this.transparent = opts.transparent;
    this.depthComp = opts.depthComp;
    this.blendSrc = opts.blendSrc;
    this.blendDst = opts.blendDst;
    this.blendSrcAlpha = opts.blendSrcAlpha;
    this.blendDstAlpha = opts.blendDstAlpha;
    this.blendOp = opts.blendOp;
    this.blendOpAlpha = opts.blendOpAlpha;
  }

  /**
   * @desc {@link Material} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Material} specifying whether the input is a {@link Material}
   */
  public static Is(obj: unknown): obj is Material {
    return obj instanceof Material;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Material';
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

  // TODO: need to add caching to gl renderer before implementing this
  // public clone(): Material { }

  /**
   * @desc destroys this inst & its assoc. resources
   */
  public dispose(): void {
    // TODO: destroy assoc. resources? signal renderer?
  }
}
