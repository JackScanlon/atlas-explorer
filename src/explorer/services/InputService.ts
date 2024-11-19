import * as Three from 'three'

import Signal from '../common/signal/index.ts'

import { InputButton, InputEventLike, InputObject, InputState, InputType } from '../types.ts'

export const InputEvents = {
  [InputState.Cancel]  : 'InputCancel',
  [InputState.Idle]    : 'InputIdle',
  [InputState.Down]    : 'InputDown',
  [InputState.Moved]   : 'InputMoved',
  [InputState.Up]      : 'InputUp',
  [InputState.Changed] : 'InputChanged',
  [InputState.Type]    : 'InputType',
};

/**
 * InputService
 * @desc Responsible for observing input(s) made by the client
 */
export default class InputService extends Signal {
  private targetCanvas?: HTMLCanvasElement;

  private lastInputType: InputType = InputType.Mouse;
  private lastInputObjects: Record<number, InputObject> = {};

  private readonly inputEventHandler = this.OnInputEvent.bind(this);

  public constructor(opts: {
    Canvas?: HTMLCanvasElement
  } | undefined = {}) {
    super();

    this.SetCanvas(opts.Canvas);
  }

  public get inputType(): InputType {
    return this.lastInputType;
  }

  public get canvas(): HTMLCanvasElement | undefined {
    return this.targetCanvas;
  }

  public HasCanvas(): boolean {
    return !!this.targetCanvas;
  }

  public SetCanvas(canvas?: HTMLCanvasElement): InputService {
    this.unbindEvents();
    this.targetCanvas = canvas;
    this.bindEvents();

    return this;
  }

  public dispose(): void {
    this.DisconnectAll();
    this.unbindEvents();
  }

  private unbindEvents(): InputService {
    if (!this.targetCanvas) {
      return this;
    }

    window.removeEventListener('pointerup', this.inputEventHandler);
    window.removeEventListener('pointerdown', this.inputEventHandler);
    window.removeEventListener('pointermove', this.inputEventHandler);
    window.removeEventListener('pointercancel', this.inputEventHandler);

    return this;
  }

  private bindEvents(): InputService {
    if (!this.targetCanvas) {
      return this;
    }

    window.addEventListener('pointerup', this.inputEventHandler);
    window.addEventListener('pointerdown', this.inputEventHandler);
    window.addEventListener('pointermove', this.inputEventHandler);
    window.addEventListener('pointercancel', this.inputEventHandler);

    return this;
  }

  public ToCanvasPosition(input: InputEventLike | Three.Vector2Like): Three.Vector2 {
    const isLikeInput = !!('clientX' in input && 'clientY' in input);

    let x!: number, y!: number, out!: Three.Vector2;
    if (isLikeInput) {
      input = input as InputEventLike;
      x = input.clientX;
      y = input.clientY;
    } else {
      input = input as Three.Vector2Like;
      if (input instanceof Three.Vector2) {
        out = input as Three.Vector2;
      }

      x = input.x;
      y = input.y;
    }

    if (typeof out === 'undefined') {
      out = new Three.Vector2();
    }

    const { left, top } = this.targetCanvas
      ? this.targetCanvas.getBoundingClientRect()
      : { left: 0, top: 0 };

    return out.set(x - left, y - top);
  }

  public GetInputState(target: PointerEvent): InputState {
    let state: InputState = InputState.Idle;
    switch (target.type) {
      case 'pointermove':
        state = InputState.Moved;
        break;

      case 'pointerdown':
        state = InputState.Down;
        break;

      case 'pointerup':
        state = InputState.Up;
        break;

      case 'pointercancel':
        state = InputState.Cancel;
        break;

      default:
        break;
    }

    return state;
  }

  private OnInputEvent(event: PointerEvent): void {
    const state = this.GetInputState(event);
    if (state === InputState.Down && !!this.targetCanvas && event.target !== this.targetCanvas) {
      return;
    }

    const isTouch = event.pointerType === 'touch';
    const deviceType = isTouch
      ? InputType.Touch
      : InputType.Mouse;

    const lastDevice = this.lastInputType;
    if (deviceType !== lastDevice) {
      this.lastInputType = deviceType;
      this.Fire(InputEvents[InputState.Type], deviceType);
    }

    const identifier = event.pointerId;
    const position = this.ToCanvasPosition(event)
    const deltaPosition = new Three.Vector2();

    let lastInput = this.lastInputObjects?.[identifier];
    if (lastInput) {
      deltaPosition.copy(position).sub(lastInput.Position);
      lastInput.Position.copy(position);
    }

    let inputButton: InputButton = InputButton.Unknown;
    if (!isTouch) {
      switch (event.button) {
        case 0:
          inputButton = InputButton.Left;
          break;

        case 1:
          inputButton = InputButton.Middle;
          break;

        case 2:
          inputButton = InputButton.Right;
          break;

        default:
          break;
      }
    }

    const result: InputObject = {
      Id: identifier,
      Type: deviceType,
      State: state,
      Button: inputButton,
      Position: position,
      DeltaPosition: deltaPosition,
    };

    if (!lastInput && (state === InputState.Down || state == InputState.Moved)) {
      lastInput = { ...result, ...{ Position: position.clone(), DeltaPosition: deltaPosition.clone() } };
      this.lastInputObjects[identifier] = lastInput;
    } else if (lastInput && state == InputState.Cancel || state == InputState.Up) {
      delete this.lastInputObjects[identifier];
    }

    this.Fire(InputEvents[result.State], result);
    this.Fire(InputEvents[InputState.Changed], result);
  }
};
