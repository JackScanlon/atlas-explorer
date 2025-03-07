import { Vec2 } from '@engine/math';

/**
 * @desc describes the event state associated with some event signal
 * @note `uint8`
 *
 * @type {enum}
 */
// prettier-ignore
export enum InputState {
  //                      | Binary   | Decimal | Summary                                                                                 |
  //                      |----------|---------|-----------------------------------------------------------------------------------------|
  Cancelled  =      0, // | 00000000 |  0      | Input action was cancelled; used internally - coerced into ended for consumers          |
  Idle       = 1 << 0, // | 00000001 |  1      | Input action has not changed; used internally                                           |
  Began      = 1 << 1, // | 00000010 |  2      | Input, if coerced as a boolean, is now flagged e.g. some button is being held           |
  Moved      = 1 << 2, // | 00000100 |  4      | Input action's position has moved, e.g. a mouse / touch action has moved                |
  Ended      = 1 << 3, // | 00001000 |  8      | Input, if coerced as a boolean, is no longer flagged e.g. some button has been released |
  Device     = 1 << 5, // | 00010000 | 16      | Input device type has changed, i.e. touch device input after keyboard/mouse input       |
  Completed  = 1 << 5, // | 00100000 | 32      | Some input gesture has completed, e.g. the completion of a mouse down+up event (click)  |
}

/**
 * @desc describes the device assoc. with some input/action
 * @note `uint8`
 *
 * @type {enum}
 */
// prettier-ignore
export enum InputDevice {
  //                         | Binary   | Decimal |
  //                         |----------|---------|
  Unknown       =      0, // | 00000000 | 0       |
  Touch         = 1 << 0, // | 00000001 | 1       |
  MouseKeyboard = 1 << 1, // | 00000010 | 2       |
}

/**
 * @desc describes the btn/action associated with the input
 * @note `uint8`
 *
 * @type {enum}
 */
// prettier-ignore
export enum InputAction {
  //                        | Binary   | Decimal | InputDevice   |
  //                        |----------|---------|---------------|
  Unknown     =       0, // | 00000000 |       0 | Unknown       |
  Idle        = 1 <<  0, // | 00000001 |       1 | All           |
  TouchMove   = 1 <<  1, // | 00000010 |       2 | Touch         |
  TouchHold   = 1 <<  2, // | 00000100 |       4 | Touch         |
  MouseMove   = 1 <<  3, // | 00001000 |       8 | MouseKeyboard |
  MouseLeft   = 1 <<  4, // | 00010000 |      16 | MouseKeyboard |
  MouseRight  = 1 <<  5, // | 00100000 |      32 | MouseKeyboard |
  MouseMiddle = 1 <<  6, // | 01000000 |      64 | MouseKeyboard |
  Key         = 1 <<  7, // | 10000000 |     128 | MouseKeyboard |
}

/**
 * @desc describes some input gesture
 * @note `uint32`
 *
 * @type {enum}
 */
// prettier-ignore
export enum InputGesture {
  //                        | Binary              | Decimal | InputDevice   |
  //                        |---------------------|---------|---------------|
  Unknown     =       0, // | 0 00000000 00000000 |       0 | Unknown       |
  Tap         = 1 <<  0, // | 0 00000000 00000001 |       1 | Touch         |
  DoubleTap   = 1 <<  1, // | 0 00000000 00000010 |       2 | Touch         |
  Press       = 1 <<  2, // | 0 00000000 00000100 |       4 | Touch         | // Note: `Press` will represent both (a) hard press and/or (b) long press
  Swipe       = 1 <<  3, // | 0 00000000 00001000 |       8 | Touch         |
  Pan         = 1 <<  4, // | 0 00000000 00010000 |      16 | Touch         | // i.e. two finger pan
  Drag        = 1 <<  5, // | 0 00000000 00100000 |      32 | Touch         | // i.e. one finger pan
  Pinch       = 1 <<  6, // | 0 00000000 01000000 |      64 | Touch         |
  Rotate      = 1 <<  7, // | 0 00000000 10000000 |     128 | Touch         |
  LeftDrag    = 1 <<  8, // | 0 00000001 00000000 |     256 | MouseKeyboard | // i.e. left mouse held+move
  RightDrag   = 1 <<  9, // | 0 00000010 00000000 |     512 | MouseKeyboard | // i.e. right mouse held+move
  LeftClick   = 1 << 10, // | 0 00000100 00000000 |    1024 | MouseKeyboard |
  RightClick  = 1 << 11, // | 0 00001000 00000000 |    2048 | MouseKeyboard |
  MiddleClick = 1 << 12, // | 0 00010000 00000000 |    4096 | MouseKeyboard |
  DoubleClick = 1 << 13, // | 0 00100000 00000000 |    8192 | MouseKeyboard |
  Scrollwheel = 1 << 14, // | 0 01000000 00000000 |   16384 | MouseKeyboard |
  Scrolldrag  = 1 << 15, // | 0 10000000 00000000 |   32768 | MouseKeyboard | // i.e. middle mouse button drag
  KeyPress    = 1 << 16, // | 1 00000000 00000000 |   65536 | MouseKeyboard |
}

/**
 * @desc typedef of a `KeyboardEvent`'s `code` property
 */
export type KeyCode = string;

/**
 * @desc typedef of a `PointerEvent`'s `identifier` property
 */
export type PointerId = number;

/**
 * @desc describes the direction of a swipe gesture
 * @type {enum}
 */
// prettier-ignore
export enum SwipeDirection {
  Unknown   = -1,
  North     = 0,
  NorthEast = 1,
  East      = 2,
  SouthEast = 3,
  South     = 4,
  SouthWest = 5,
  West      = 6,
  NorthWest = 7,
}

/**
 * @desc specifies some `PointerEvent`-like input (touch / mouse)
 */
export interface InputObject {
  id: PointerId;
  target: PointerEvent;
  initial: Vec2;
  position: Vec2;
  deltaPosition: Vec2;
}

/**
 * @desc specifies the state of the touch gesture being processed
 */
export interface TouchState {
  gesture: InputGesture;
  touch0: InputObject;
  touch1?: InputObject;

  midpoint: Vec2;
  deltaPan: Vec2;

  pressure: number;
  direction: SwipeDirection;

  distance: number;
  scaleFactor: number;
  deltaScale: number;

  rotation: number;
  deltaRotation: number;

  initTime: number;
  initAngle: number;
  initLength: number;

  failedTap: boolean;
  failedDrag: boolean;
  failedPress: boolean;
  failedSwipe: boolean;
}
