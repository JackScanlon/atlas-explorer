import * as Three from 'three'
import { Setter } from 'solid-js'

// Handler specifying a disposable hook
export type DisposableItem = () => void;

// Viewport-related type(s)
export type ViewportSize = {
  width: number,
  height: number,
  ratio: number
};

export type ViewportCallback = (
  width: number,
  height: number,
  ratio: number
) => void;

// Describes data axis range
export type AlDataRange = {
  Min: number,
  Max: number,
}

// Describes axis ticks & scaling
export type AlAxisScale = {
  Min: number,
  Max: number,
  Step: number,
}

// JSON object element associated with `explorer-data.json`
export type AtlasObject = {
  Phecode: string,
  Name: string,
  Age: number|string,
  Frequency: number|string,
  Sex: string,
  Category: string,
  Mortality: number|string,
  Type: string,
  SystemSpeciality: string,
  OrganTarget: string,
  OrganRef: string,
  SlugRef: string
};

// Parsed record from `explorer-data.json`
export type AtlasRecord = {
  Id: number,
  Phecode: string,
  Name: string,
  Age: number,
  Frequency: number,
  Sex: string,
  Category: string,
  Mortality: number,
  Type: string,
  SpecialityId: number,
  SystemSpeciality: string,
  OrganId: number,
  OrganTarget: string,
  OrganRef: string,
  SlugRef: string,
  x: number,
  y: number,
};

// Bit packed buffer data
export type AtlasPacked = {
  Id: number,
  SpecialityId: number,
  Active: boolean,
};

// i.e. a map of categories via `Category` property
export type AtlasSpeciality = {
  MapId: number,
  Hex: number,
  Name: string,
  Reference: number,
  RecordIds: number[],
};

// i.e. a map of organ reference target(s) via `OrganRef` property
export type AtlasTarget = {
  MapId: number,
  RecordIds: number[],
};

// Optional Three.JS `ShaderMaterial` properties
//   - See ref @ https://threejs.org/docs/?q=ShaderMa#api/en/materials/ShaderMaterial
export type AlShaderProp = Three.ShaderMaterialParameters | undefined;

// Options when building/instantiating the parsed point(s)
export type AtlasBuildOptions = {
  ShaderProps?: AlShaderProp,
};

// Parsed Geometry/Object output
//   - See attached URLs
export type AtlasGeom = {
  /* Three.JS Attr out */
  Data: Uint32Array,      // See ref @ https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array
  Scaling: Float32Array,  // See ref @ https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array
  Vertices: Float32Array, // See ref @ https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array

  /* Three.JS Geom out */
  Object: Three.Points<Three.BufferGeometry, Three.ShaderMaterial>, // See ref @ https://threejs.org/docs/#api/en/objects/Points
  Material: Three.ShaderMaterial,                                   // See ref @ https://threejs.org/docs/?q=ShaderMa#api/en/materials/ShaderMaterial
  Geometry: Three.BufferGeometry,                                   // See ref @ https://threejs.org/docs/#api/en/core/BufferGeometry

  /* Disposable */
  dispose: () => void;
};

// Interface for the `AtlasData` result set class
export interface IAtlasData {
  // Member(s)
  records: AtlasRecord[],
  vertices: number[],
  scaling: number[],
  reference: number[],
  boundingBox: { min: Three.Vector3, max: Three.Vector3, origin: Three.Vector3 },
  colorMap: number[],

  // Method(s)
  Instantiate: (opts: AtlasBuildOptions) => AtlasGeom;
  AddRecord: (record: AtlasRecord, vert: Three.Vector3, scale: number, ref: number) => IAtlasData;
  AddColorMapping: (colorValue: number) => IAtlasData;
}

// Three.JS `Loader` callback(s)
//   - See ref @ https://threejs.org/docs/#api/en/loaders/Loader
export type AlLoadedCallback = (data: any) => void;
export type AlProgressCallback = (event: ProgressEvent) => void;
export type AlErrCallback = (url: unknown) => void;

// Defines some scale range
export type AlScaleTarget = { min: number, max: number };

// Defines some scaling fn
export type AlScaleFn = (val: number, min: number, max: number) => number;

export type AlScalingOpt = {
  x?: AlScaleTarget | AlScaleFn,
  y?: AlScaleTarget | AlScaleFn,
};

// Load opts for the `AtlasLoader::loadWithOpts` method
export type AtlasLoadOptions = {
  url: string,
  onLoad: AlLoadedCallback,
  onProgress?: AlProgressCallback,
  onError?: AlErrCallback
  scale?: AlScalingOpt,
};

// Atlas pointer selection
export type AtlasSelection = {
  Index: number,
  Record: AtlasRecord,
  Origin: Three.Vector3,
  Indices: number[],
  Coordinate: Three.Vector2,
};

// Atlas tooltip selection target & cursor position
export type AlVec2Like = {
  x: number,
  y: number,
};

export type AtlasTooltipTarget = {
  Position: AlVec2Like,
  Selection: AtlasSelection,
};

// Touch/Mouse Event type(s)
export enum InputState {
  //                   | Binary | Decimal |
  //                   |--------|---------|
  Cancel  =      0, // | 000000 |  0      |
  Idle    = 1 << 0, // | 000001 |  1      |
  Down    = 1 << 1, // | 000010 |  2      |
  Moved   = 1 << 2, // | 000100 |  4      |
  Up      = 1 << 3, // | 001000 |  8      |
  Changed = 1 << 4, // | 010000 | 16      |
  Type    = 1 << 5, // | 100000 | 32      |
};

// Device type(s)
export enum InputType {
  //                   | Binary | Decimal |
  //                   |--------|---------|
  Unknown =      0, // | 000000 | 0       |
  Touch   = 1 << 0, // | 000001 | 1       |
  Mouse   = 1 << 1, // | 000010 | 2       |
};

// Mouse input button
export enum InputButton {
  Unknown  = -1,
  Left     =  0,
  Middle   =  1,
  Right    =  2,
};

// Mouse/Touch event object
export type InputObject = {
  Id: number,
  Type: InputType,
  State: InputState,
  Button: InputButton,
  Position: Three.Vector2,
  DeltaPosition: Three.Vector2,
};

// Describes some event-like object with x/y coordinates
export interface InputEventLike {
  readonly clientX: number;
  readonly clientY: number;
};

// User data filter types e.g. axes toggle / speciality toggle
export enum FilterType {
  AxesToggle       = 0,
  SpecialityFilter = 1,
};

// Axis toggle event target
export enum AxisToggleTarget {
  AxesHelper   = 0,
  AxesLabels   = 1,
  RadialAxis   = 2,
  VerticalAxis = 3,
};

export type AxisFlag = {
  Text: string,
  State: boolean,
  Target: AxisToggleTarget,
  Toggle?: string[],
};

// Explorer interface(s)
export interface ExplorerInteractionOpts {
  TargetSetter?: Setter<AtlasRecord | null>,
  TooltipSetter?: Setter<AtlasTooltipTarget | null>,
};

export interface AtlasDescriptor {
  target: string,
  priority?: string,
};

export type AtlasStyleDeclaration = {
  [key in keyof CSSStyleDeclaration]: string | number | CSSRule | AtlasDescriptor
};

export interface ExplorerElementProps {
  Style?: Partial<AtlasStyleDeclaration>,
  ClassName?: string,
  ClassList?: string[],
  ZIndex?: number | string,
};

export interface ExplorerAppearanceOpts {
  Canvas?: ExplorerElementProps,
  Drawing?: ExplorerElementProps,
};

export interface ExplorerOpts {
  Theme?: string,
  Parent?: HTMLElement,
  Canvas?: HTMLCanvasElement,
  Appearance?: ExplorerAppearanceOpts,
  Interaction?: ExplorerInteractionOpts,
};
