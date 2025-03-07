import { PipelineDrawObj } from '@engine/core';
import { Signal, Disposable, TransformUpdate } from '@engine/common';
import { Vec3, Quat, Mat4, type Mat4Like, type QuatLike, type Vec3Like } from '@engine/math';

/**
 * @desc describes some callback called when traversing a transform's hierarchy
 */
export type Transform3dCallback = (obj: Transform3d) => Nullable<boolean | void>;

/**
 * @desc base Transform3d constructor props
 *
 * @property {number} [scale=Vec3Like]                this object's scale, reflected in its transform
 * @property {number} [position=Vec3Like]             this object's translation, reflected in its transform
 * @property {number} [rotation=QuatLike]             this object's orientation, reflected in its transform
 * @property {number} [transform=Mat4Like]            this object's transform matrix
 * @property {number} [autoUpdateTransform=false]     whether to automatically update the transform of this object when computing it from its components
 * @property {number} [autoUpdateChildTransform=true] whether to automatically update all children defined within this object's hierarchy when this object's transform changes
 */
export interface Transform3dProps {
  scale?: Vec3Like;
  position?: Vec3Like;
  rotation?: QuatLike;
  transform?: Mat4Like;
  userdata?: Record<string, any>;
  autoUpdateTransform?: boolean;
  autoUpdateChildTransform?: boolean;
}

/**
 * Base class representing some 3D object
 *
 * @class
 * @abstract
 * @constructor
 * @extends Disposable
 */
export abstract class Transform3d extends Disposable implements PipelineDrawObj {
  /**
   * @desc this class' type name
   * @type {string}
   * @static
   * @readonly
   */
  public static readonly ClassName: string = Transform3d.name;

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
   * @desc an object describing user-defined information associated with this instance
   * @type {Record<string, any>}
   * @readonly
   */
  public readonly userdata: Record<string, any> = {};

  /**
   * @desc whether to automatically update the transform of this object when computing it from its components
   * @type {boolean}
   */
  public autoUpdateTransform: boolean = false;

  /**
   * @desc whether to automatically update all children defined within this object's hierarchy when this object's transform changes
   * @type {boolean}
   */
  public autoUpdateChildTransform: boolean = true;

  /**
   * @desc this object's scale, reflected in its transform
   * @note modifying this object will dispatch the `transform` event
   * @type {Vec3}
   * @readonly
   */
  public readonly scale: Vec3 = Vec3.One();

  /**
   * @desc this object's translation, reflected in its transform
   * @note modifying this object will dispatch the `transform` event
   * @type {Vec3}
   * @readonly
   */
  public readonly position: Vec3 = new Vec3();

  /**
   * @desc this object's orientation, reflected in its transform
   * @note modifying this object will dispatch the `transform` event
   * @type {Quat}
   * @readonly
   */
  public readonly rotation: Quat = new Quat();

  /**
   * @desc this object's transform matrix
   * @type {Mat4}
   * @protected
   * @readonly
   */
  public readonly transform: Mat4 = new Mat4();

  /**
   * @desc specifies whether this object needs to be updated when rendered
   * @type {TransformUpdate}
   */
  protected _updateTypes: TransformUpdate = TransformUpdate.All;

  /**
   * @desc specifies whether this object should be rendered
   * @type {boolean}
   * @protected
   */
  protected _visible: boolean = true;

  /**
   * @desc changed event dispatcher
   * @note handles all events for this transform, described as `(eventName: string, obj: this, ...args: any[])` on dispatch
   * @type {Signal}
   * @protected
   */
  protected _changedSignal?: Signal;

  /**
   * @desc describes this object's parent in the scene hierarchy
   * @type {Nullable<Transform3d>}
   * @protected
   */
  protected _parent: Nullable<Transform3d>;

  /**
   * @desc describes all children of this object
   * @type {Array<Transform3d>}
   * @protected
   */
  protected readonly _children: Array<Transform3d> = [];

  /**
   * @desc constructs a {@link Transform3d}
   */
  public constructor(props?: Transform3dProps) {
    super();

    this.id = Transform3d._ref++;

    if (!!props) {
      this.userdata = props.userdata ?? this.userdata;
      this.autoUpdateTransform = props.autoUpdateTransform ?? this.autoUpdateTransform;
      this.autoUpdateChildTransform = props.autoUpdateChildTransform ?? this.autoUpdateChildTransform;

      let requiresUpdate: boolean = false;
      if (props.scale) {
        this.scale.copy(props.scale);
        requiresUpdate = true;
      }

      if (props.position) {
        this.position.copy(props.position);
        requiresUpdate = true;
      }

      if (props.rotation) {
        this.rotation.copy(props.rotation);
        requiresUpdate = true;
      }

      if (props.transform) {
        this.transform.copy(props.transform);
        this.transform.getScale(this.scale);
        this.transform.getRotation(this.rotation);
        this.transform.getTranslation(this.position);
        requiresUpdate = true;
      }

      if (requiresUpdate) {
        this.toggleUpdateReq(TransformUpdate.TRS | TransformUpdate.TRS, true);
      }
    }

    const handleTransformChanged = this.handleTransformChange.bind(this);
    this._disposables.push(
      this.scale.changedSignal.connect((obj: Vec3) => handleTransformChanged('scale', obj)),
      this.position.changedSignal.connect((obj: Vec3) => handleTransformChanged('position', obj)),
      this.rotation.changedSignal.connect((obj: Quat) => handleTransformChanged('rotation', obj))
    );
  }

  /**
   * @desc {@link Transform3d} type-guard
   * @static
   *
   * @param {unknown} obj some object to consider
   *
   * @returns {obj is Transform3d} specifying whether the input is a {@link Transform3d}
   */
  public static Is(obj: unknown): obj is Transform3d {
    return obj instanceof Transform3d;
  }

  /**
   * @desc This instance's classname
   * @type {string}
   * @public
   */
  public get ClassName(): string {
    return Object.getPrototypeOf(this).constructor.ClassName ?? 'Transform3d';
  }

  /**
   * @returns {boolean} whether this transform inst has any updates that need to be processed
   */
  public get needsUpdate(): boolean {
    return (this._updateTypes & this._updateTypes) !== 0;
  }

  /**
   * @param {boolean} value sets the update types required by this transform to {@link TransformUpdate.All}
   */
  public set needsUpdate(value: boolean) {
    this._updateTypes = !!value ? TransformUpdate.All : TransformUpdate.None;
  }

  /**
   * @returns {TransformUpdate} the updates expected by this instance due to variation of its properties
   */
  public get updateTypes(): TransformUpdate {
    return this._updateTypes;
  }

  /**
   * @param {boolean} value sets the update types required by this transform to the given {@link TransformUpdate}
   */
  public set updateTypes(value: TransformUpdate) {
    this._updateTypes = value;
  }

  /**
   * @desc visibility getter
   */
  public get visible(): boolean {
    return this._visible;
  }

  /**
   * @desc visibility setter, will dispatch a `visibility` change event
   */
  public set visible(vis: boolean) {
    this._visible = vis;
    this.toggleUpdateReq(TransformUpdate.Appearance, true);
    this.dispatchEvent('visibility', this._visible);
  }

  /**
   * @desc parent getter
   */
  public get parent(): Nullable<Transform3d> {
    return this._parent;
  }

  /**
   * @desc parent setter, will dispatch a `parent` change event
   */
  public set parent(parent: Transform3d | null) {
    this._parent = parent;
    this.toggleUpdateReq(TransformUpdate.Hierarchy, true);
    this.dispatchEvent('parent', parent);
  }

  /**
   * @returns {number} get the number of children defined by this obj's hierarchy
   */
  public get numChildren(): number {
    return this._children.length;
  }

  /**
   * @returns {Array<Transform3d>} all children assoc. with this transform
   */
  public get children(): Transform3d[] {
    return this._children;
  }

  /**
   * @returns {Signal} resolves the changed signal listener
   */
  public get changedSignal(): Signal {
    let signal = this._changedSignal;
    if (!signal) {
      signal = new Signal();
      this._changedSignal = signal;
      this._disposables.push(() => signal!.dispose());
    }

    return signal;
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
   * @desc used to claim the `updateTypes` flag
   *
   * @param {TransformUpdate} [flag] optionally specify the flag to claim; otherwise defaults to {@link TransformUpdate.All}
   *
   * @returns {boolean} whether this update will be claimed
   */
  public claimUpdate(flag?: TransformUpdate): boolean {
    let needsUpdate: boolean = false;
    if (typeof flag === 'undefined' && this.needsUpdate) {
      needsUpdate = true;
      this._updateTypes = TransformUpdate.None;
    } else if (!!flag && (this._updateTypes & flag) === flag) {
      needsUpdate = true;
      this.toggleUpdateReq(flag, false);
    }

    return needsUpdate;
  }

  /**
   * @desc used to test the `updateTypes` flag without claiming it
   *
   * @param {...TransformUpdate} [flags] optionally specify the flag(s) to test; otherwise defaults to {@link TransformUpdate.All}
   *
   * @returns {boolean} whether this component needs to be updated
   */
  public requiresUpdate(...flags: TransformUpdate[]): boolean {
    const upd = this._updateTypes;
    if (flags.length < 1) {
      return (upd & upd) !== 0;
    }

    let flag!: TransformUpdate;
    for (let i = 0; i < flags.length; ++i) {
      flag = flags[i];
      if ((upd & flag) === flag) {
        return true;
      }
    }

    return false;
  }

  /**
   * @desc either (a) toggles the given TransformUpdate bit flag, or (b) if the `enabled` param is defined, will set/unset the given flag according to the enabled state
   *
   * @param {TransformUpdate} value     the update flag to set
   * @param {boolean}         [enabled] optionally specify whether to set/unset this flag; defaults to toggling the flag
   *
   * @returns {this} this instance
   */
  public toggleUpdateReq(value: TransformUpdate, enabled?: boolean): this {
    if (typeof enabled === 'undefined') {
      this._updateTypes = this._updateTypes ^ value;
      return this;
    }

    const hasFlag = (this._updateTypes & value) === value;
    if (hasFlag && !enabled) {
      this._updateTypes = this._updateTypes & ~value;
    } else if (!hasFlag && enabled) {
      this._updateTypes = this._updateTypes | value;
    }

    return this;
  }

  /**
   * @param {string} key the name of the userdata key-value pair
   *
   * @returns {Nullable<T>} some userdata described by the specified key, if applicable
   */
  public getUserData<T extends any = any>(key: string): Nullable<T> {
    const data = this.userdata?.[key];
    if (data === null || typeof data === 'undefined') {
      return null;
    }

    return data as T;
  }

  /**
   * @param {string} className the class name to test against children
   *
   * @returns {Nullable<T>} the first child of this class, if available
   */
  public getFirstChildOfClass<T extends Transform3d = Transform3d>(className: string): Nullable<T> {
    for (let i = 0; i < this._children.length; ++i) {
      const child = this._children[i];
      if (child.isA(className)) {
        return child as T;
      }
    }

    return null;
  }

  /**
   * @desc attempts to find some child given a predicate function to evaluate each child
   *
   * @param {Function} predicate some function to test child conditions; resolving to `true` if valid, otherwise `false`
   *
   * @returns {Nullable<T>} the first child that meets the given predicate
   */
  public getFirstChildWithPredicate<T extends Transform3d = Transform3d>(
    predicate: (obj: Transform3d) => Nullable<T>
  ): Nullable<T | false> {
    for (let i = 0; i < this._children.length; ++i) {
      const child = this._children[i];
      if (predicate(child)) {
        return child as T;
      }
    }

    return null;
  }

  /**
   * @desc collects an array of children that meet the criteria defined by some predicate
   *
   * @param {Function} predicate    some function to test child conditions; resolving to `true` if valid, otherwise `false`
   * @param {Array<T>} [results=[]] optionally specify an array of all children that meet the current predicate criteria; newly found children will be appended to the list
   *
   * @returns {Array<T>} an array of all children that have successfully met the criteria of the predicate
   */
  public getChildrenWithPredicate<T extends Transform3d = Transform3d>(
    predicate: (obj: Transform3d) => Nullable<T>,
    results?: Array<T>
  ): Array<T> {
    let mapped!: WeakMap<Transform3d, boolean>;

    const isNewObject = (obj: Transform3d): boolean => {
      if (!(mapped instanceof WeakMap)) {
        mapped = new WeakMap<Transform3d, boolean>();
        for (let i = 0; i < results!.length; ++i) {
          mapped.set(results![i], true);
        }
      }

      if (mapped.has(obj)) {
        return false;
      }

      return true;
    };

    if (!Array.isArray(results)) {
      results = [];
    } else if (results.length > 0) {
      mapped = new WeakMap<Transform3d, boolean>();
      for (let i = 0; i < results.length; ++i) {
        mapped.set(results[i], true);
      }
    }

    for (let i = 0; i < this._children.length; ++i) {
      const child = this._children[i];
      if (isNewObject(child) && predicate(child)) {
        results.push(child as T);
      }
    }

    return results;
  }

  /**
   * @desc collects an array of descendants that meet the criteria defined by some predicate
   *
   * @param {Function} predicate    some function to test descendant conditions; resolving to `true` if valid, otherwise `false`
   * @param {Array<T>} [results=[]] optionally specify an array of all descendants that meet the current predicate criteria; newly found descendants will be appended to the list
   *
   * @returns {Array<T>} an array of all descendants that have successfully met the criteria of the predicate
   */
  public getDescendantsWithPredicate<T extends Transform3d = Transform3d>(
    predicate: (obj: Transform3d) => Nullable<T>,
    results?: Array<T>
  ): Array<T> {
    let mapped!: WeakMap<Transform3d, boolean>;

    const isNewObject = (obj: Transform3d): boolean => {
      if (!(mapped instanceof WeakMap)) {
        mapped = new WeakMap<Transform3d, boolean>();
        for (let i = 0; i < results!.length; ++i) {
          mapped.set(results![i], true);
        }
      }

      if (mapped.has(obj)) {
        return false;
      }

      return true;
    };

    if (!Array.isArray(results)) {
      results = [];
    } else if (results.length > 0) {
      mapped = new WeakMap<Transform3d, boolean>();
      for (let i = 0; i < results.length; ++i) {
        mapped.set(results[i], true);
      }
    }

    this.traverse((obj: Transform3d) => {
      if (obj === this || !isNewObject(obj) || !predicate(obj)) {
        return;
      }

      results.push(obj as T);
    });

    return results;
  }

  /**
   * @desc handles clean up of this transform
   */
  public override dispose(): void {
    this.internalDispose();
    super.dispose();
  }

  /**
   * @desc dispatches the `changedSignal` event
   *
   * @param {string}     eventName some event target name
   * @param {Array<any>} args      variadic arguments to incl. on dispatch
   *
   * @returns {this} this transform
   */
  public dispatchEvent(eventName: string, ...args: any[]): this {
    const signal = this._changedSignal;
    if (signal) {
      signal.fire(eventName, this, ...args);
    }

    return this;
  }

  /**
   * @desc rotates this transform at its current translation, such that its look vector will coincide with a direction facing the target
   * @note the source position is the translation of this transform
   *
   * @param {Vec3Like} target               some target position
   * @param {Vec3Like} [upVector=[0, 1, 0]] some up vector
   *
   * @returns {this} this transform
   */
  public lookAt(target: Vec3Like, upVector?: Vec3Like): this {
    this.rotation.lookAt(this.position, target, upVector);
    return this;
  }

  /**
   * @desc updates this object's transform matrix
   *
   * @param {boolean} [ignoreChildren=false] specifies whether to ignore updating child transforms, even if `autoUpdateChildTransform` is flagged
   * @param {boolean} [updateParent=false]   specifies whether to update all parent transforms before updating this object
   * @param {boolean} [claimUpdate=true]     specifies whether to claim transform updates when recursively updating transform(s) in hierarchy
   *
   * @returns {this} this transform
   */
  public updateTransform(ignoreChildren: boolean = false, updateParent: boolean = false, claimUpdate: boolean = true): this {
    this.transform.toggleDispatcher(false);

    if (claimUpdate && this.claimUpdate(TransformUpdate.TRS)) {
      this.transform.setTRS(this.position, this.rotation, this.scale);
      this._updateTypes = (this._updateTypes & ~TransformUpdate.TRS) | TransformUpdate.Transform;
    }

    if (!!this._parent) {
      if (updateParent && this.parent!.requiresUpdate(TransformUpdate.TRS)) {
        this._parent.updateTransform(true, true, claimUpdate);
      }

      this.transform.mulMatrices(this._parent.transform, this.transform);
      this._updateTypes = (this._updateTypes & ~TransformUpdate.TRS) | TransformUpdate.Transform;
    }

    if (!ignoreChildren && this.autoUpdateChildTransform) {
      const updated = this.requiresUpdate(TransformUpdate.TRS, TransformUpdate.Transform);
      for (let i = 0; i < this._children.length; ++i) {
        if (!updated && !this._children[i].requiresUpdate(TransformUpdate.TRS)) {
          continue;
        }

        this._children[i].updateTransform(false, false, claimUpdate);
      }
    }

    this.transform.toggleDispatcher(true);
    return this;
  }

  /**
   * @note will dispatch the `childrenAdded` event
   *
   * @param {...Transform3d} children the children to add to this transform's hierarchy
   *
   * @returns {this} this transform
   */
  public add(...children: Array<Transform3d>): this {
    const length = children.length;
    if (length > 0) {
      let child!: Transform3d;
      for (let i = 0; i < length; ++i) {
        child = children[i];
        child.parent = this;
        this._children.push(child);
      }

      this.dispatchEvent('childrenAdded');
    }

    return this;
  }

  /**
   * @note will dispatch the `childrenRemoved` event
   *
   * @param {...Transform3d} children the children to remove from this transform's hierarchy
   *
   * @returns {this} this transform
   */
  public remove(...children: Array<Transform3d>): this {
    const length = children.length;
    if (length > 0) {
      let child!: Transform3d;
      for (let i = 0; i < length; ++i) {
        child = children[i];

        const index = this._children.indexOf(child);
        if (index < 0) {
          continue;
        }

        this._children.splice(index, 1);
        child.parent = null;
      }

      this.dispatchEvent('childrenRemoved');
    }

    return this;
  }

  /**
   * @note used to traverse the scene hierarchy
   *
   * @param {Function} callback called on each object within the descending hierarchy, see {@link Transform3dCallback}
   */
  public traverse(callback: Transform3dCallback): void {
    if (callback(this)) {
      return;
    }

    for (let i = 0; i < this._children.length; ++i) {
      this._children[i].traverse(callback);
    }
  }

  /**
   * @desc internal clean up
   */
  protected internalDispose(): void {
    this.dispatchEvent('disposing');
  }

  /**
   * @desc handles TRS component changes
   *
   * @param {string}      prop the TRS property that was modified
   * @param {Vec3 | Quat} obj  the modified TRS value
   */
  private handleTransformChange(prop: 'scale' | 'position' | 'rotation', obj: Vec3 | Quat): void {
    this.toggleUpdateReq(TransformUpdate.TRS, true);
    this.dispatchEvent('transform', prop, obj.clone());

    if (this.autoUpdateTransform) {
      this.updateTransform(!this.autoUpdateChildTransform, true, true);
    }
  }
}
