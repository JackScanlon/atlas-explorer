import * as Three from 'three'

import { CameraControlBase } from './types'

// An enum describing the `CameraController`'s current state
export enum CameraState {
  //                            | Binary  | Decimal |
  //                            |---------|---------|
  None             =      0, // | 0000000 |  0      |
  Rotate           = 1 << 0, // | 0000001 |  1      |
  Dolly            = 1 << 1, // | 0000010 |  2      |
  Pan              = 1 << 2, // | 0000100 |  4      |
  TouchRotate      = 1 << 3, // | 0001000 |  8      |
  TouchPan         = 1 << 4, // | 0010000 | 16      |
  TouchDollyPan    = 1 << 5, // | 0100000 | 32      |
  TouchDollyRotate = 1 << 6, // | 1000000 | 64      |
};

// Default input behaviour for touch & mouse event(s)
export const BaseControls: CameraControlBase = {
  mouse: { Left: Three.MOUSE.ROTATE, Middle: Three.MOUSE.DOLLY, Right: Three.MOUSE.PAN },
  touch: { One: Three.TOUCH.ROTATE, Two: Three.TOUCH.DOLLY_PAN },
}
