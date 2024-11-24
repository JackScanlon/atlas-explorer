import * as Utils from './utils'

export type SpringTimer = () => number;

export interface SpringOpts {
  /**
   * @desc specifies the speed of the spring, min. of 0
   * @default 1.0
   */
  Speed?: number,
  /**
   * @desc specifies the damping force; underdamped when < 1, critically damped when >= 1 - clamped to [0, 1]
   * @default 1.0
   */
  Damper?: number,
  /**
   * @desc specifies the target position of the spring
   * @default 0
   */
  Target?: number,
  /**
   * @desc specifies the initial position of the spring (defaults to `.Target` if not specified)
   * @default 0
   */
  Initial?: number,
  /**
   * @desc specifies the internal clock used to track the spring's position
   * @default `performance.now`
   */
  Timer?: SpringTimer,
};

const DefaultSpringOpts: Partial<SpringOpts> = {
  Speed: 1,
  Damper: 1,
  Target: 0,
  Timer: performance.now
};

/**
 * Spring
 * @desc Spring-like animation helper; see Hooke's law for reference
 */
export default class Spring {
  private _time: number;
  private _timer: SpringTimer;
  private _speed: number;
  private _damper: number;
  private _target: number;
  private _initial: number;
  private _position: number;
  private _velocity: number;

  public constructor(opts: SpringOpts) {
    opts = { ...DefaultSpringOpts, ...opts };

    let { Target: target, Initial: initial } = opts;
    if (typeof target === 'undefined' && typeof initial === 'undefined') {
      target = 0;
      initial = 0;
    } else if (typeof target !== 'undefined') {
      initial = target;
    } else if (typeof initial !== 'undefined') {
      target = initial;
    }

    this._time = opts.Timer!();
    this._timer = opts.Timer!;
    this._speed = Math.max(opts.Speed!, 0);
    this._damper = Utils.clampValue(opts.Damper!, 0, 1);
    this._target = target!;
    this._initial = initial!;
    this._position = this._initial;
    this._velocity = 0;
  }

  public get speed(): number {
    return this._speed;
  }

  public get damper(): number {
    return this._damper;
  }

  public get target(): number {
    return this._target;
  }

  public get position(): number {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    return this._position;
  }

  public get velocity(): number {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    return this._velocity;
  }

  public get animating(): boolean {
    return this.IsAnimating();
  }

  public set speed(value: number) {
    value = Math.max(value, 0);
    this.reconcile('_speed', value, 2, 0);
  }

  public set damper(value: number) {
    value = Utils.clampValue(value, 0, 1);
    this.reconcile('_damper', value, 2, 0);
  }

  public set target(value: number) {
    this.reconcile('_target', value, 2, 0);
  }

  public set position(value: number) {
    this.reconcile('_initial', value, 1, 1);
  }

  public set velocity(value: number) {
    this.reconcile(null, value, 1, 0);
  }

  public Impulse(vel: number): Spring {
    this.velocity += vel;
    return this;
  }

  public Skip(delta: number): Spring {
    const t = this._timer();
    const [position, velocity] = this.resolve(t + delta);
    this._position = position;
    this._velocity = velocity;
    this._time = t;
    return this;
  }

  public GetPositionAt(t: number): number {
    const v0 = this._initial,
          v1 = this._target;

    t *= ((v1 - v0) / (this._speed * 0.1));
    return this.resolve(this._time + t)[0];
  }

  public IsAnimating(epsilon: number = 1e-6, checkVelocity: boolean = false): boolean {
    const isAnimating = !Utils.approximately(this.position, this._target, epsilon);
    return !checkVelocity ? isAnimating : (isAnimating && Math.abs(this.velocity) > epsilon);
  }

  public IsApproximately(target: number, epsilon: number = 1e-6): boolean {
    return Utils.approximately(this.position, target, epsilon)
  }

  public Update(epsilon: number = 1e-6, checkVelocity: boolean = true): { Position: number, Velocity: number, Animating: boolean } {
    const v = this.resolve(this._timer());
    this._position = v[0];
    this._velocity = v[1];

    const isAnimating = !Utils.approximately(v[0], this._target, epsilon);
    return {
      Position: v[0],
      Velocity: v[1],
      Animating: !checkVelocity ? isAnimating : (isAnimating || Math.abs(v[1]) > epsilon),
    };
  }

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

  private resolve(t: number): number[] {
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
    } else if (Utils.approximately(dmpsqr, 1)) {
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
