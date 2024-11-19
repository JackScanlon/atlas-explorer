import * as Three from 'three'

// Input behaviour descriptor for mouse event(s)
export type CameraMouseControls = { Left: Three.MOUSE, Middle: Three.MOUSE, Right: Three.MOUSE };

// Input behaviour descriptor for touch event(s)
export type CameraTouchControls = { One: Three.TOUCH, Two: Three.TOUCH };

// Input behaviour descriptors for touch & mouse event(s)
export type CameraControlBase = {
  mouse?: CameraMouseControls,
  touch?: CameraTouchControls,
}

// CameraController constructor props
export interface CameraControlOpts {
  Camera: Three.PerspectiveCamera,
  Controls?: CameraControlBase,
  DomElement?: HTMLElement,
}
