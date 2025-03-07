import * as NumberUtils from './number';

/**
 * @desc fn that resolves a timestamp
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Performance/now|Performance.now}
 */
export type SpringTimer = () => number;

/**
 * @desc spring constructor props, see {@link Spring}
 *
 * @property {number}      [speed=1.0]   specifies the speed of the spring, min. of 0
 * @property {number}      [damper=1.0]  specifies the damping force; underdamped when < 1, critically damped when >= 1 - clamped to [0, 1]
 * @property {number}      [target=1.0]  specifies the target position of the spring
 * @property {number}      [initial=0.0] specifies the initial position of the spring (defaults to `.Target` if not specified)
 * @property {SpringTimer} [timer]       specifies the internal clock used to track the spring's position; defaults to `performance.now`
 */
export interface SpringOpts {
  speed?: number,
  damper?: number,
  target?: number,
  initial?: number,
  timer?: SpringTimer,
};

/**
 * @desc default {@link Spring} opts
 */
const DefaultSpringOpts: Partial<SpringOpts> = {
  speed: 1,
  damper: 1,
  target: 0,
  timer: performance.now,
};

/**
 * Class describing a Spring-like animation helper; see Hooke's law for reference
 *
 * @class
 * @constructor
 */
export default class Spring {
  /**
   * @desc the time at which this instance began moving towards its target position
   * @type {number}
   * @private
   */
  private _time: number;

  /**
   * @desc this instance's internal clock function
   * @type {SpringTimer}
   * @private
   */
  private _timer: SpringTimer;

  /**
   * @desc this instance's speed
   * @type {number}
   * @private
   */
  private _speed: number;

  /**
   * @desc this instance's damping force
   * @type {number}
   * @private
   */
  private _damper: number;

  /**
   * @desc the desired position of this instance
   * @type {number}
   * @private
   */
  private _target: number;

  /**
   * @desc the initial position of this instance
   * @type {number}
   * @private
   */
  private _initial: number;

  /**
   * @desc this instance's current position
   * @type {number}
   * @private
   */
  private _position: number;

  /**
   * @desc this instance's current velocity
   * @type {number}
   * @private
   */
  private _velocity: number;

  /**
   * @desc Spring constructor
   * @param {SpringOpts} opts see {@link SpringOpts}
   */
  public constructor(opts: SpringOpts) {
    opts = { ...DefaultSpringOpts, ...opts };

    let { target, initial } = opts;
    if (typeof target === 'undefined' && typeof initial === 'undefined') {
      target = 0;
      initial = 0;
    } else if (typeof target !== 'undefined') {
      initial = target;
    } else if (typeof initial !== 'undefined') {
      target = initial;
    }

    this._time = opts.timer!();
    this._timer = opts.timer!;
    this._speed = Math.max(opts.speed!, 0);
    this._damper = NumberUtils.clamp(opts.damper!, 0, 1);
    this._target = target!;
    this._initial = initial!;
    this._position = this._initial;
    this._velocity = 0;
  }

  /**
   * @desc this instance's speed
   * @type {number}
   * @public
   */
  public get speed(): number {
    return this._speed;
  }

  /**
   * @desc this instance's damping force
   * @type {number}
   * @public
   */
  public get damper(): number {
    return this._damper;
  }

  /**
   * @desc the desired position of this instance
   * @type {number}
   * @public
   */
  public get target(): number {
    return this._target;
  }

  /**
   * @desc this instance's current position
   * @type {number}
   * @public
   */
  public get position(): number {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    return this._position;
  }

  /**
   * @desc this instance's current velocity
   * @type {number}
   * @public
   */
  public get velocity(): number {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    return this._velocity;
  }

  /**
   * @desc describes whether this spring is still attempting to move towards its target
   * @type {boolean}
   * @public
   */
  public get animating(): boolean {
    return this.isAnimating();
  }

  /**
   * @param {number} value spring speed value
   */
  public set speed(value: number) {
    value = Math.max(value, 0);
    this.reconcile('_speed', value, 2, 0);
  }

  /**
   * @param {number} value spring damping force value
   */
  public set damper(value: number) {
    value = NumberUtils.clamp(value, 0, 1);
    this.reconcile('_damper', value, 2, 0);
  }

  /**
   * @param {number} value sets the desired position
   */
  public set target(value: number) {
    this.reconcile('_target', value, 2, 0);
  }

  /**
   * @param {number} value sets this spring's initial position
   */
  public set position(value: number) {
    this.reconcile('_initial', value, 1, 1);
  }

  /**
   * @param {number} value sets this spring's velocity
   */
  public set velocity(value: number) {
    this.reconcile(null, value, 1, 0);
  }

  /**
   * @param {number} vel adds an impulse to this spring's velocity
   *
   * @returns {this}
   */
  public impulse(vel: number): Spring {
    this.velocity += vel;
    return this;
  }

  /**
   * @param {number} delta increments/decrements this spring forwards/backwards in time
   *
   * @returns {this}
   */
  public skip(delta: number): Spring {
    const t = this._timer();
    const [position, velocity] = this.resolve(t + delta);
    this._position = position;
    this._velocity = velocity;
    this._time = t;
    return this;
  }

  /**
   * @param {number} t some timepoint `t`
   *
   * @returns {number} gets the position this spring would be at time `t`
   */
  public getPositionAt(t: number): number {
    const v0 = this._initial,
          v1 = this._target;

    t *= ((v1 - v0) / (this._speed * 0.1));
    return this.resolve(this._time + t)[0];
  }

  /**
   * @param {boolean} [epsilon=1e-6]        some threshold value; defaults to `1e-6`
   * @param {boolean} [checkVelocity=false] optionally specify whether to test the spring's velocity as well as its position
   *
   * @returns {boolean} specifying whether this spring is still moving towards its target
   */
  public isAnimating(epsilon: number = 1e-6, checkVelocity: boolean = false): boolean {
    const isAnimating = !NumberUtils.approximately(this.position, this._target, epsilon);
    return !checkVelocity ? isAnimating : (isAnimating && Math.abs(this.velocity) > epsilon);
  }

  /**
   * @param {number} target         some position to compare
   * @param {number} [epsilon=1e-6] some threshold value; defaults to `1e-6`
   *
   * @returns {boolean} describing whether this spring is approximately at the given position
   */
  public isApproximately(target: number, epsilon: number = 1e-6): boolean {
    return NumberUtils.approximately(this.position, target, epsilon)
  }

  /**
   * @desc step this spring's position & velocity
   *
   * @param {number}  [epsilon=1e-6]        some threshold value; defaults to `1e-6`
   * @param {boolean} [checkVelocity=false] optionally specify whether animation tests should test the spring's velocity as well as its position
   *
   * @returns {object} an object describing this spring's position, velocity and whether it is animating
   */
  public update(epsilon: number = 1e-6, checkVelocity: boolean = true): { position: number, velocity: number, animating: boolean } {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    const isAnimating = !NumberUtils.approximately(v[0], this._target, epsilon);
    return {
      position: v[0],
      velocity: v[1],
      animating: !checkVelocity ? isAnimating : (isAnimating || Math.abs(v[1]) > epsilon),
    };
  }

  /**
   * @desc utility function to update the properties of this spring
   *
   * @param {string|null} prop   the name of the property to update
   * @param {number}      value  the new value of the property
   * @param {number}      stride varies how the downstream properties are updated
   * @param {number}      offset varies how the downstream properties are updated when `stride != 1`
   */
  private reconcile(prop: string | null, value: number, stride: number, offset: number): void {
    const t = this._timer(),
          v = this.resolve(t);

    if (stride == 2) {
      this._position = v[0];
      this._velocity = v[1];
    } else {
      const current = [this._position, this._velocity];
      const partner = (offset + 1) % 2;
      current[offset] = value;
      current[partner] = v[partner];

      this._position = current[0];
      this._velocity = current[1];
    }

    if (!!prop && this.hasOwnProperty(prop)) {
      (this as Record<string, any>)[prop] = value;
    }

    this._time = t;
  }

  /**
   * @desc resolves the spring's position and velocity at some time `t`
   *
   * @param {number} t some time `t`
   *
   * @returns {[number, number]} an array describing this spring's position and velocity
   */
  private resolve(t: number): [number, number] {
    const pos = this._position,
          vel = this._velocity,
          trg = this._target,
          dmp = this._damper,
          spd = this._speed;

    const alpha = spd*(t - this._time);
    const dmpsqr = dmp*dmp;

    let h!: number, si!: number, co!: number;
    if (dmpsqr < 1 - 1e-6) {
      h = Math.sqrt(1 - dmpsqr);

      co = Math.exp(-dmp*alpha)/h;
      si = co*Math.sin(h*alpha);
      co = co*Math.cos(h*alpha);
    } else if (NumberUtils.approximately(dmpsqr, 1)) {
      h = 1;

      co = Math.exp(-dmp*alpha)/h;
      si = co*t;
    }

    const a0 = h*co + dmp*si;
    const a1 = 1 - (h*co + dmp*si);
    const a2 = si/spd;

    const b0 = -spd*si;
    const b1 = spd*si;
    const b2 = h*co - dmp*si;

    return [ a0*pos + a1*trg + a2*vel, b0*pos + b1*trg + b2*vel ];
  }
};
