import { Const, Disposable, Signal, Variant } from '@engine/common';
import { NumberUtils, Vec2, Vec2Like, Vec3, Vec3Like } from '@engine/math';
import { InputState, InputAction, InputDevice, InputGesture, KeyCode, PointerId, SwipeDirection, InputObject, TouchState } from './types';

/**
 * @desc
 * @see {@link InputState}
 * @type {Record<string, InputState>}
 * @constant
 */
const INPUT_STATE_MAP: Record<string, InputState> = {
  ['pointerup']: InputState.Ended,
  ['pointermove']: InputState.Moved,
  ['pointerdown']: InputState.Began,
  ['pointercancel']: InputState.Cancelled,

  ['touchend']: InputState.Ended,
  ['touchmove']: InputState.Moved,
  ['touchstart']: InputState.Began,
  ['touchcancel']: InputState.Cancelled,

  ['keyup']: InputState.Ended,
  ['keydown']: InputState.Began,
};

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_SWIPE_DURATION: number = 400,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MIN_SWIPE_VELOCITY: number = 10;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MIN_HARDP_PRESSURE: number = 0.75,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MIN_HARDP_DURATION: number = 350,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_HARDP_DURATION: number = 900,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_HARDP_DISTANCE: number = 10;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_TAP_DURATION: number = 300,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_TAP_DISTANCE: number = 10;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  THR_DELTA_PAN: number = 1,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  THR_DELTA_SCALE: number = 1e-2,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  THR_DELTA_ROTATE: number = 1e-1;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_TOUCH_DBL_TIME: number = 300,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_TOUCH_DBL_DIST: number = 50;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_MOUSE_DBL_TIME: number = 300,
  /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_MOUSE_DBL_DIST: number = 50;

const /**
   * @desc
   * @type {number}
   * @constant
   */
  MAX_MOUSE_SGL_DIST: number = 50;

/**
 * Class that processes & dispatches events relating to gestures & other user input
 *
 * @todo need to clean this up when we're ready to build UI/UX and append documentation
 *
 * @class
 * @constructor
 * @extends Disposable
 */
// prettier-ignore
export class InputController extends Disposable {
  /**
   * @desc
   * @type {Signal}
   */
  public readonly eventSignal: Signal = new Signal({ bufferLast: false });

  /**
   * @desc
   * @type {Signal}
   */
  public readonly gestureSignal: Signal = new Signal({ bufferLast: false });

  /**
   * @desc
   * @type {Variant<HTMLElement>}
   */
  public readonly element: Variant<HTMLElement> = new Variant<HTMLElement>({ value: undefined, bufferLast: true });

  /**
   * @desc
   * @type {boolean}
   * @private
   */
  private _enabled: boolean = true;

  /**
   * @desc
   * @type {boolean}
   * @private
   */
  private _windowFocused: boolean = false;

  /**
   * @desc
   * @type {TouchState|undefined}
   * @private
   */
  private _touchState?: TouchState;

  /**
   * @desc
   * @type {InputAction}
   * @private
   */
  private _actionFlags: InputAction = InputAction.Idle;

  /**
   * @desc
   * @type {InputDevice}
   * @private
   */
  private _lastDeviceType: InputDevice = InputDevice.Unknown;

  /**
   * @desc
   * @type {Vec2}
   * @private
   */
  private _lastTargetPos: Vec2 = Vec2.Zero();

  /**
   * @desc
   * @type {number|undefined}
   * @private
   */
  private _lastTargetTime?: number;

  /**
   * @desc
   * @type {Record<KeyCode, boolean>}
   * @private
   */
  private readonly _keyStates: Record<KeyCode, boolean> = {};

  /**
   * @desc
   * @type {Record<PointerId, InputObject>}
   * @private
   */
  private readonly _pointers: Record<PointerId, InputObject> = {};

  /**
   * @param {HTMLElement} [element]
   */
  public constructor(element?: HTMLElement, enabled: boolean = true) {
    super();


    this.element.value = element;
    this._enabled = enabled;
    this._windowFocused = document.visibilityState === 'visible' && ((typeof document?.hidden === 'boolean') && !document.hidden);
    this._disposables.push(this.element, this.gestureSignal, this.eventSignal);

    if (enabled) {
      this.initListeners();
    }
  }

  /**
   * @desc
   *
   * @param rad
   * @param remap
   *
   * @returns {SwipeDirection}
   */
  public static ToSwipeDirection(rad: number, remap: boolean = false): SwipeDirection {
    rad = !remap ? rad : NumberUtils.remapRange(rad, -Math.PI, Math.PI, 0, Const.TAU);
    rad *= Const.RAD2DEG;
    return Math.round(((rad %= 360) < 0 ? rad + 360 : rad) / 45) % 8;
  }

  /**
   * @desc computes the canvas-relative position of some input vector
   * @static
   *
   * @param {T}           vec      some input mouse/touch vector; `Vec2` is constructed if no vector/arr is specified
   * @param {HTMLElement} [canvas] optionally specify the canvas element
   *
   * @returns {T} some Vec2(-like) | Vec3(-like) whose x/y components describe the relative pos of the mouse to the specified canvas
   */
  public static ToCanvasPosition<T extends Vec2Like | Vec3Like>(vec: T, canvas?: Nullable<HTMLElement>): T {
    const { left, top } = !!canvas
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0 };

    if (Vec2.Is(vec) || Vec3.Is(vec)) {
      vec.sub([left, top, 0]);
    } else {
      vec[0] -= left;
      vec[1] -= top;
    }

    return vec;
  }

  /**
   * @desc converts a `Vec2Like|Vec3Like` describing a position in normalised device coordinate (NDC) space to a screen-space position
   * @static
   *
   * @param {T}                            vec      some NDC space coordinate
   * @param {{ clientWidth, clientHeight}} [canvas] some assoc. canvas element
   *
   * @returns {T} the coordinate in screen-space (pixel position)
   */
  public static ToPixelCoordinate<T extends Vec2Like | Vec3Like>(vec: T, canvas?: Nullable<HTMLElement | { clientWidth: number, clientHeight: number }>): T {
    const width = canvas?.clientWidth ?? 1;
    const height = canvas?.clientHeight ?? 1;
    vec[0] = ( NumberUtils.clamp(vec[0]*0.5+0.5, -1, 1))*width;
    vec[1] = (-NumberUtils.clamp(vec[1]*0.5-0.5, -1, 1))*height;
    return vec;
  }

  /**
   * @desc converts a `Vec2Like|Vec3Like` describing a position in screen-space (pixel position) to a normalised device coordinate (NDC) space coordinate
   * @static
   *
   * @param {T}                            vec      some screen-space coordinate
   * @param {{ clientWidth, clientHeight}} [canvas] some assoc. canvas element
   *
   * @returns {T} the coordinate in NDC space
   */
  public static ToNormalDeviceCoordinate<T extends Vec2Like | Vec3Like>(vec: T, canvas?: Nullable<HTMLElement | { clientWidth: number, clientHeight: number }>): T {
    const width = canvas?.clientWidth ?? 1;
    const height = canvas?.clientHeight ?? 1;
    vec[0] = NumberUtils.clamp( (vec[0] / width )*2 - 1, -1, 1);
    vec[1] = NumberUtils.clamp(-(vec[1] / height)*2 + 1, -1, 1);
    return vec;
  }

  /**
   * @returns {boolean}
   */
  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * @param {boolean} value
   */
  public set enabled(value: boolean) {
    if (value === this._enabled) {
      return;
    }

    this._enabled = value;

    if (!value) {
      const listeners = this._namedDisposables.listeners;
      if (listeners !== null && typeof listeners !== 'undefined') {
        delete this._namedDisposables.listeners;
        this.disposeItem(listeners);
      }
    } else {
      this.initListeners();
    }
  }

  /**
   * @desc
   *
   * @returns {this}
   */
  public cancelKeyStates(): this {
    for (const key in this._keyStates) {
      if (this._keyStates[key]) {
        this.eventSignal.fire(InputState.Ended, InputAction.Key, key);
      }
      this._keyStates[key] = false;
    }

    const flag = (this._actionFlags & ~InputAction.Key);
    this._actionFlags = (flag & flag) === 0 ? InputAction.Idle : flag;
    this._touchState = undefined;

    return this;
  }

  /**
   * @desc
   *
   * @param state
   *
   * @returns {this}
   */
  public cancelGestures(state?: { gesture: InputGesture }): this {
    for (const value in InputGesture) {
      if (typeof value !== 'number' || (!!state && (state.gesture & value) !== value)) {
        continue;
      }

      this.gestureSignal.fire(value, InputState.Ended, state);
    }

    const flag = (this._actionFlags & ~InputAction.TouchHold) & ~InputAction.TouchMove;
    this._actionFlags = (flag & flag) === 0 ? InputAction.Idle : flag;
    this._touchState = undefined;
    return this;
  }

  /**
   * @desc
   *
   * @returns {this}
   */
  public cancelActions(): this {
    const flag = this._actionFlags;
    for (const value in InputAction) {
      if (typeof value !== 'number' || (flag & value) !== value) {
        continue;
      }

      this.eventSignal.fire(InputState.Cancelled, value);
    }

    for (const key in this._pointers) {
      delete this._pointers[key];
    }

    this._actionFlags = InputAction.Idle;
    return this;
  }

  /**
   * @desc
   * @protected
   */
  protected initListeners(): void {
    const elemBinding = this.element.changedSignal.connect(this.handleElement, { context: this });
    this.disposeItem(this._namedDisposables.listeners);

    const hndPointer = this.handlePointerEvent.bind(this);
    window.addEventListener('pointerup', hndPointer);
    window.addEventListener('pointermove', hndPointer);
    window.addEventListener('pointerdown', hndPointer);
    window.addEventListener('pointercancel', hndPointer);

    const procWheel = this.processWheelGesture.bind(this);
    window.addEventListener('wheel', procWheel);

    const hndKeyboard = this.handleKeyboardEvent.bind(this);
    window.addEventListener('keyup', hndKeyboard);
    window.addEventListener('keydown', hndKeyboard);

    const hndFocus = this.handleFocusEvent.bind(this);
    window.addEventListener('focuslost', hndFocus);
    document.addEventListener('visibilitychange', hndFocus);

    this._namedDisposables.listeners = () => {
      this.cancelKeyStates();
      this.cancelGestures();
      this.cancelActions();
      elemBinding.dispose();

      window.removeEventListener('wheel', procWheel);
      window.removeEventListener('focuslost', hndFocus);
      window.removeEventListener('pointerup', hndPointer);
      window.removeEventListener('pointermove', hndPointer);
      window.removeEventListener('pointerdown', hndPointer);
      window.removeEventListener('pointercancel', hndPointer);
      document.removeEventListener('visibilitychange', hndFocus);
    };
  }

  /**
   * @desc
   * @protected
   *
   * @param {WheelEvent} input
   */
  protected processWheelGesture(input: WheelEvent): void {
    const target = input.target;
    if (!target || target !== this.element.value) {
      return;
    }

    // Handle possible device change
    const inputDeviceType = InputDevice.MouseKeyboard;
    if (inputDeviceType !== this._lastDeviceType) {
      if (this._touchState) {
        this.cancelGestures(this._touchState);
      }

      this._actionFlags = InputAction.Idle;
      this._lastDeviceType = inputDeviceType;
      this.eventSignal.fire(InputState.Device, inputDeviceType);
    }

    this.gestureSignal.fire(InputGesture.Scrollwheel, InputState.Moved, input);
  }

  /**
   * @desc
   * @protected
   *
   * @param {InputState}   state
   * @param {InputAction}  action
   * @param {PointerEvent} input
   */
  protected processMouseGesture(state: InputState, action: InputAction, input?: InputObject): void {
    if (!input || !state || !action) {
      this.cancelActions();
      return;
    }

    const actionFlags = this._actionFlags;
    if (state === InputState.Ended && (actionFlags & action) === action) {
      switch (action) {
        case InputAction.MouseLeft: {
          // -> Det. whether to dbl click
          const now = performance.now();
          const lastTargetTime = this._lastTargetTime;
          const canDoubleTap = typeof lastTargetTime === 'number' && now - lastTargetTime <= MAX_MOUSE_DBL_TIME;
          if (canDoubleTap && this._lastTargetPos.distance(input.position) <= MAX_MOUSE_DBL_DIST) {
            // -> Double click
            this._lastTargetTime = undefined;
            this.gestureSignal.fire(InputGesture.DoubleClick, InputState.Completed, input);
          } else {
            // -> Single tap
            this._lastTargetTime = now;
            this._lastTargetPos.copy(input.position);

            if (input.initial.distance(input.position) <= MAX_MOUSE_SGL_DIST) {
              this.gestureSignal.fire(InputGesture.LeftClick, InputState.Completed, input);
            }
          }
          this.gestureSignal.fire(InputGesture.LeftDrag, InputState.Ended, input);

          return;
        };

        case InputAction.MouseMiddle:
          this.gestureSignal.fire(InputGesture.MiddleClick, InputState.Completed, input);
          this.gestureSignal.fire(InputGesture.Scrolldrag, InputState.Ended, input);
          return;

        case InputAction.MouseRight:
          if (input.initial.distance(input.position) <= MAX_MOUSE_SGL_DIST) {
            this.gestureSignal.fire(InputGesture.RightClick, InputState.Completed, input);
          }
          this.gestureSignal.fire(InputGesture.RightDrag, InputState.Ended, input);
          return;

        default:
          break;
      }
    }

    if (action === InputAction.MouseMove) {
      if ((actionFlags & InputAction.MouseLeft) == InputAction.MouseLeft) {
        this.gestureSignal.fire(InputGesture.LeftDrag, InputState.Moved, input);
      } else if ((actionFlags & InputAction.MouseMiddle) == InputAction.MouseMiddle) {
        this.gestureSignal.fire(InputGesture.Scrolldrag, InputState.Moved, input);
      } else if ((actionFlags & InputAction.MouseRight) == InputAction.MouseRight) {
        this.gestureSignal.fire(InputGesture.RightDrag, InputState.Moved, input);
      }
    }
  }

  /**
   * @desc
   * @protected
   *
   * @param {InputState}    state
   * @param {InputAction}   action
   * @param {KeyboardEvent} input
   */
  protected processKeyGesture(state: InputState, action: InputAction, input: KeyboardEvent): void {
    if (!input || !state || !action) {
      this.cancelKeyStates();
      return;
    }

    if (state === InputState.Ended && this._keyStates[input.code]) {
      this.gestureSignal.fire(InputGesture.KeyPress, InputState.Completed, input.code);
    }
  }

  /**
   * @desc
   * @protected
   *
   * @param {InputState}  state
   * @param {InputAction} action
   * @param {InputObject} [input]
   */
  protected processTouchGesture(state: InputState, action: InputAction, input?: InputObject): void {
    let touchState = this._touchState;
    if (!input || !state || !action) {
      this._touchState = undefined;
      this.cancelGestures(touchState);
      return;
    }

    const now = performance.now();
    const target = input.target;
    switch (state) {
      case InputState.Began: {
        if (!touchState) {
          touchState = {
            gesture: InputGesture.Unknown,
            touch0: input,

            midpoint: Vec2.Zero(),
            deltaPan: Vec2.Zero(),

            direction: SwipeDirection.Unknown,
            pressure: target.pressure,

            distance: 0,
            scaleFactor: 0,
            deltaScale: 0,

            rotation: 0,
            deltaRotation: 0,

            initTime: now,
            initAngle: 0,
            initLength: 0,

            failedTap: false,
            failedDrag: false,
            failedPress: false,
            failedSwipe: false,
          }
          this._touchState = touchState;
        } else if (!touchState.touch1) {
          const t0 = touchState.touch0;
          // Send signal to inform client that we've cancelled the touch0 states????
          touchState.gesture = InputGesture.Unknown;
          touchState.touch1 = input;

          touchState.midpoint = touchState.midpoint.addVectors(t0.position, input.position).mulScalar(0.5);
          touchState.pressure = 0;
          touchState.failedTap = true;
          touchState.failedDrag = true;
          touchState.failedPress = true;
          touchState.failedSwipe = true;

          const dis = Vec2.DistanceBetween(t0.position, input.position);
          touchState.distance = dis;
          touchState.initLength = dis;
          touchState.scaleFactor = 1;

          const rot = Vec2.UpVector().signedAngleBetween(t0.position.clone().sub(input.position));
          touchState.rotation = rot;
          touchState.initAngle = rot;
          touchState.deltaRotation = 0;

          if ((touchState.gesture & InputGesture.Pan) !== InputGesture.Pan) {
            touchState.gesture &= ~InputGesture.Pan;
            this.gestureSignal.fire(InputGesture.Pan, InputState.Ended, touchState);
          }
        }
      } break;

      case InputState.Moved: {
        if (!touchState) {
          break;
        }

        const { initTime, touch0, touch1, initLength } = touchState;

        const elapsed = now - initTime;
        if (touch0 && touch1) {
          const dis = Vec2.DistanceBetween(touch0.position, touch1.position);
          touchState.distance = dis;

          // -> Pinch
          const scale = dis / initLength;
          if (!NumberUtils.approximately(touchState.scaleFactor, scale, THR_DELTA_SCALE)) {
            const newGesture = (touchState.gesture & InputGesture.Pinch) !== InputGesture.Pinch;
            touchState.gesture |= InputGesture.Pinch;
            touchState.deltaScale = scale - touchState.scaleFactor;

            this.gestureSignal.fire(InputGesture.Pinch, newGesture ? InputState.Began : InputState.Moved, touchState);
          } else if ((touchState.gesture & InputGesture.Pinch) !== InputGesture.Pinch) {
            touchState.gesture &= ~InputGesture.Pinch;
            this.gestureSignal.fire(InputGesture.Pinch, InputState.Ended, touchState);
          }
          touchState.scaleFactor = scale;

          // -> Rotate
          const vec = Vec2.UpVector();
          const rot = vec.signedAngleBetween(touch0.position.clone().sub(touch1.position).normalise());
          if (Number.isFinite(rot) && !NumberUtils.approximately(touchState.rotation, rot, THR_DELTA_ROTATE)) {
            const newGesture = (touchState.gesture & InputGesture.Rotate) !== InputGesture.Rotate;
            touchState.gesture |= InputGesture.Rotate;
            touchState.deltaRotation = rot - touchState.rotation;

            this.gestureSignal.fire(InputGesture.Rotate, newGesture ? InputState.Began : InputState.Moved, touchState);
          } else if ((touchState.gesture & InputGesture.Rotate) !== InputGesture.Rotate) {
            touchState.gesture &= ~InputGesture.Rotate;
            this.gestureSignal.fire(InputGesture.Rotate, InputState.Ended, touchState);
          }
          touchState.rotation = rot;

          vec.addVectors(touch0.position, touch1.position).mulScalar(0.5);

          // -> Pan
          const vel = Vec2.Zero().subVectors(vec, touchState.midpoint);
          if (vel.magnitude() > THR_DELTA_PAN) {
            const newGesture = (touchState.gesture & InputGesture.Pan) !== InputGesture.Pan;
            touchState.gesture |= InputGesture.Pan;
            touchState.deltaPan.copy(vel);
            touchState.midpoint.copy(vec);
            this.gestureSignal.fire(InputGesture.Pan, newGesture ? InputState.Began : InputState.Moved, touchState);
          } else if ((touchState.gesture & InputGesture.Pan) !== InputGesture.Pan) {
            touchState.gesture &= ~InputGesture.Pan;
            touchState.deltaPan.set(0, 0);
            this.gestureSignal.fire(InputGesture.Pan, InputState.Ended, touchState);
          }
        } else if (!touch1) {
          if (touchState.failedTap || touchState.failedPress || touchState.failedSwipe) {
            touchState.failedTap = elapsed > MAX_TAP_DURATION;
            touchState.failedPress = elapsed > MAX_HARDP_DURATION;
            touchState.failedSwipe = elapsed > MAX_SWIPE_DURATION;

            touchState.pressure = Math.max(target.pressure, touchState.pressure);
          }

          if (!touchState.failedDrag && touch0.deltaPosition.magnitude() > THR_DELTA_PAN) {
            // -> Drag
            const newGesture = (touchState.gesture & InputGesture.Drag) !== InputGesture.Drag;
            touchState.gesture |= InputGesture.Drag;
            touchState.deltaPan.copy(touch0.deltaPosition);
            this.gestureSignal.fire(InputGesture.Drag, newGesture ? InputState.Began : InputState.Moved, touchState);
          } else if ((touchState.gesture & InputGesture.Drag) !== InputGesture.Drag) {
            touchState.gesture &= ~InputGesture.Drag;
            this.gestureSignal.fire(InputGesture.Drag, InputState.Ended, touchState);
          }
        }

      } break;

      case InputState.Ended: {
        if (!touchState) {
          break;
        }

        const passSingle = touchState.failedTap && touchState.failedPress && touchState.failedSwipe;
        if (!passSingle) {
          // i.e. only one finger has been placed on screen before being released
          const { pressure, initTime, touch0, gesture } = touchState;

          // -> Cancel pan if applicable
          const wasPanDragging = (gesture & InputGesture.Drag) === InputGesture.Drag;
          if (wasPanDragging) {
            touchState.gesture &= ~InputGesture.Drag;
            this.gestureSignal.fire(InputGesture.Drag, InputState.Ended, touchState);
          }

          // -> Attempt to tap/press/swipe
          const dist = touch0.position.distance(touch0.initial);
          const elapsed = now - initTime;
          const velocity = dist / (elapsed*0.001);
          if (elapsed <= MAX_SWIPE_DURATION && velocity >= MIN_SWIPE_VELOCITY) {
            // i.e. swipe
            touchState.gesture = InputGesture.Swipe;

            const r = Vec2.UpVector().signedAngleBetween(touch0.initial.clone().sub(touch0.position).normalise());
            const d = InputController.ToSwipeDirection(r, true);
            touchState.direction = d;

            this._lastTargetTime = undefined;
            this.gestureSignal.fire(InputGesture.Swipe, InputState.Completed, touchState);
          } else if ((elapsed >= MIN_HARDP_DURATION && (elapsed <= MAX_HARDP_DURATION || pressure >= MIN_HARDP_PRESSURE)) && dist <= MAX_HARDP_DISTANCE) {
            // i.e. hard press or long press
            touchState.gesture = InputGesture.Press;

            this._lastTargetTime = undefined;
            this.gestureSignal.fire(InputGesture.Press, InputState.Completed, touchState);
          } else if (elapsed <= MAX_TAP_DURATION && dist <= MAX_TAP_DISTANCE) {
            // i.e. quickly tapped screen, potentially a dbl tap
            const lastTargetTime = this._lastTargetTime;
            const canDoubleTap = !wasPanDragging && typeof lastTargetTime === 'number' && now - lastTargetTime <= MAX_TOUCH_DBL_TIME;
            if (canDoubleTap && this._lastTargetPos.distance(touch0.position) <= MAX_TOUCH_DBL_DIST) {
              // -> Double tap
              touchState.gesture = InputGesture.DoubleTap;
              this._lastTargetTime = undefined;

              this.gestureSignal.fire(InputGesture.DoubleTap, InputState.Completed, touchState);
            } else {
              // -> Single tap
              this._lastTargetTime = now;
              this._lastTargetPos.copy(touch0.position);

              touchState.gesture = InputGesture.Tap;
              this.gestureSignal.fire(InputGesture.Tap, InputState.Completed, touchState);
            }
          }
        } else {
          // i.e. min. two fingers have been placed on screen at some point
          this.cancelGestures(touchState);
          this._lastTargetTime = undefined;
        }

        this._touchState = undefined
      } break;

      default:
        break;
    }
  }

  /**
   * @desc
   * @protected
   *
   * @param curr
   * @param _prev
   */
  protected handleElement(curr: Nullable<HTMLElement>, _prev: Nullable<HTMLElement>): void {
    if (curr !== null && typeof curr !== 'undefined') {
      return;
    }

    this.cancelGestures(this._touchState);
    this.cancelKeyStates();
    this.cancelActions();

    this._actionFlags = InputAction.Idle;
    this.eventSignal.fire(InputState.Cancelled, InputAction.Unknown, null);
  }

  /**
   * @desc
   * @protected
   *
   * @param {Event} input
   */
  protected handleFocusEvent(input: Event): void {
    const isFocused = document.visibilityState === 'visible' && ((typeof document?.hidden === 'boolean') && !document.hidden);
    if (isFocused === this._windowFocused) {
      return;
    }

    this.cancelGestures(this._touchState);
    this.cancelKeyStates();
    this.cancelActions();

    this._windowFocused = isFocused;
    this._actionFlags = InputAction.Idle;
    this.eventSignal.fire(InputState.Cancelled, InputAction.Unknown, input);
  }

  /**
   * @desc
   * @protected
   *
   * @param {PointerEvent} input
   */
  protected handlePointerEvent(input: PointerEvent): void {
    switch (input.pointerType) {
      case 'pen':
      case 'touch':
        this.handleTouchEvent(input);
        break;

      case 'mouse':
        this.handleMouseEvent(input);
        break;

      default:
        break;
    }
  }

  /**
   * @desc
   * @protected
   *
   * @param input
   *
   * @returns
   */
  protected trackPointer(input: PointerEvent): InputObject {
    let touch = this._pointers?.[input.pointerId];
    if (!touch) {
      const vec = InputController.ToCanvasPosition(new Vec2(input.clientX, input.clientY), this.element.value);
      touch = {
        id: input.pointerId,
        target: input,
        initial: vec.clone(),
        position: vec,
        deltaPosition: Vec2.Zero(),
      };

      this._pointers[input.pointerId] = touch;
      return touch;
    }

    const pos = InputController.ToCanvasPosition([input.clientX, input.clientY], this.element.value);
    touch.deltaPosition.subVectors(touch.position, pos).negateY();
    touch.position.copy(pos);

    return touch;
  }

  /**
   * @desc
   * @protected
   *
   * @param {TouchEvent} input
   */
  protected handleTouchEvent(input: PointerEvent): void {
    const target = input.target;
    const element = this.element.value;
    if (!target || target !== element) {
      return;
    }

    let actionFlags = this._actionFlags,
        inputState  = INPUT_STATE_MAP[input.type] ?? InputState.Moved;

    // Handle possible device change
    const inputDeviceType = InputDevice.Touch;
    if (inputDeviceType !== this._lastDeviceType) {
      this.cancelKeyStates();
      this.cancelActions();

      actionFlags = InputAction.Idle;
      this._actionFlags = actionFlags;

      this._lastDeviceType = inputDeviceType;
      this.eventSignal.fire(InputState.Device, inputDeviceType);
    }

    // Manage cancellation signals
    const touchObject = this.trackPointer(input);
    if (!inputState) {
      // Cancel narrow
      // Broad cancellation if unknown device input
      this._actionFlags = actionFlags & ~(InputAction.MouseMove | InputAction.MouseLeft | InputAction.MouseRight | InputAction.MouseMiddle);

      if (this._touchState) {
        this.cancelGestures(this._touchState);
        this.cancelActions();
      }

      // Signal unknown if broad cancellation
      this.eventSignal.fire(InputState.Cancelled, touchObject);
      this.processTouchGesture(InputState.Cancelled, InputAction.Unknown);
      return
    }

    // Manage action flags
    const touchInputs = this._pointers;
    const inputAction = inputState === InputState.Moved
      ? InputAction.TouchMove
      : InputAction.TouchHold;

    const isActionActive = ((actionFlags & inputAction) === inputAction);
    const hasProcessedAction = isActionActive && inputState === InputState.Ended;

    if (!isActionActive && inputState === InputState.Began) {
      // Touch started
      actionFlags = (actionFlags & ~InputAction.Idle) | inputAction;

      if (this.element.value) {
        this.element.value.setPointerCapture(input.pointerId)
      }
      touchObject.initial.copy(touchObject.position);
    } else if (hasProcessedAction) {
      // Touch ended
      const tmp = actionFlags & ~inputAction;
      actionFlags = (tmp & tmp) === 0
        ? (tmp | InputAction.Idle)
        : tmp;

      if (this.element.value) {
        this.element.value.releasePointerCapture(input.pointerId)
      }
    }

    this.processTouchGesture(inputState, inputAction, touchObject);

    if (hasProcessedAction && touchObject) {
      delete touchInputs?.[input.pointerId];
    }

    this._actionFlags = actionFlags;
    this.eventSignal.fire(inputState, inputAction, touchObject);
  }

  /**
   * @desc
   * @protected
   *
   * @param {PointerEvent} input
   */
  protected handleMouseEvent(input: PointerEvent): void {
    const target = input.target;
    if (input.pointerType === 'touch' || !target || target !== this.element.value) {
      return;
    }

    // Derive state & action type
    let inputState!: InputState,
        inputAction!: InputAction;

    const inputButton = input.button ?? -2;
    switch (inputButton) {
      case -1:
        inputAction = InputAction.MouseMove;
        break;

      case 0:
        inputAction = InputAction.MouseLeft;
        break;

      case 1:
        inputAction = InputAction.MouseMiddle;
        break;

      case 2:
        inputAction = InputAction.MouseRight;
        break;

      default:
        inputAction = InputAction.Unknown;
        break;
    }

    let actionFlags = this._actionFlags;
    inputState = INPUT_STATE_MAP[input.type] ?? InputState.Moved;

    const isActionActive = ((actionFlags & inputAction) === inputAction);
    const hasProcessedAction = isActionActive && inputState === InputState.Ended;

    if (inputButton >= 0 && inputState === InputState.Moved) {
      inputState = isActionActive
        ? InputState.Ended
        : InputState.Began;
    }

    const ubCancellation = ((inputState & inputState) | (inputAction & inputAction)) === 0;
    const inputDeviceType = ubCancellation ? InputDevice.Unknown : InputDevice.MouseKeyboard;

    // Handle possible device change
    if (inputDeviceType !== this._lastDeviceType) {
      if (this._touchState) {
        this.cancelGestures(this._touchState);
      }

      actionFlags = InputAction.Idle;
      this._actionFlags = actionFlags;

      this._lastDeviceType = inputDeviceType;
      this.eventSignal.fire(InputState.Device, inputDeviceType);
    }

    // Handle cancellations
    const pointer = this.trackPointer(input);
    if (ubCancellation || (!inputState || !inputAction)) {
      // Broad cancellation if unknown device input
      if (ubCancellation) {
        this._actionFlags = InputAction.Idle;
        this.cancelKeyStates();
      } else {
        const tmp = (actionFlags & ~(InputAction.MouseMove | InputAction.MouseLeft | InputAction.MouseRight | InputAction.MouseMiddle));
        this._actionFlags = ((tmp & tmp) === 0)
          ? InputAction.Idle
          : tmp;

        this.eventSignal.fire(InputState.Cancelled, pointer);
        this.processMouseGesture(InputState.Cancelled, InputAction.Unknown);
      }

      this.cancelActions();
      return;
    }

    // Manage input
    if (!isActionActive && inputState === InputState.Began) {
      // Mouse button began
      actionFlags = (actionFlags & ~InputAction.Idle) | inputAction;
      if (this.element.value) {
        this.element.value.setPointerCapture(input.pointerId);
      }
      pointer.initial.copy(pointer.position);
    } else if (isActionActive && inputState === InputState.Ended) {
      // Mouse button ended
      if (inputAction === InputAction.MouseRight) {
        actionFlags = InputAction.Idle;
      } else {
        const tmp = actionFlags & ~inputAction;
        actionFlags = (tmp & tmp) === 0
          ? (tmp | InputAction.Idle)
          : tmp;
      }

      if (this.element.value) {
        this.element.value.releasePointerCapture(input.pointerId)
      }
    }

    this.processMouseGesture(inputState, inputAction, pointer);

    if (hasProcessedAction && pointer) {
      delete this._pointers?.[input.pointerId];
    }

    this._actionFlags = actionFlags;
    this.eventSignal.fire(inputState, inputAction, pointer);
  }

  /**
   * @desc
   * @protected
   *
   * @param input
   *
   * @returns
   */
  protected handleKeyboardEvent(input: KeyboardEvent): void {
    const target = input.target;
    if ((!target || target !== this.element.value) && document.activeElement !== document.body) {
      return;
    }

    let actionFlags = this._actionFlags;

    const keyStates = this._keyStates;
    const inputState = INPUT_STATE_MAP[input.type] ?? InputState.Cancelled;
    const inputAction = InputAction.Key;
    const ubCancellation = inputState === InputState.Cancelled;

    // Handle possible device change
    const inputDeviceType = ubCancellation ? InputDevice.Unknown : InputDevice.MouseKeyboard;
    if (inputDeviceType !== this._lastDeviceType) {
      this.cancelGestures(this._touchState);

      actionFlags = InputAction.Idle;
      this._actionFlags = actionFlags;

      this._lastDeviceType = inputDeviceType;
      this.eventSignal.fire(InputState.Device, inputDeviceType);
    }

    // Toggle key state(s)
    const isActionActive = ((actionFlags & inputAction) === inputAction);
    if (!isActionActive && inputState === InputState.Began) {
      // Began
      actionFlags = (actionFlags & ~InputAction.Idle) | inputAction;
    } else if (isActionActive && inputState === InputState.Ended) {
      // Ended
      const tmp = actionFlags & ~inputAction;
      actionFlags = (tmp & tmp) === 0
        ? (tmp | InputAction.Idle)
        : tmp;
    }

    const keyPressed = inputState === InputState.Began;
    const keyStateChanged = (!keyStates?.[input.code] && keyPressed) || (keyStates?.[input.code] && !keyPressed)
    if (!keyStateChanged) {
      return;
    }

    this.processKeyGesture(inputState, inputAction, input);
    keyStates[input.code] = keyPressed;

    this._actionFlags = actionFlags;
    this.eventSignal.fire(inputState, inputAction, input.code, input);
  }
}
