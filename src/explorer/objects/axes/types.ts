import * as Three from 'three'

import { AlAxisScale, AlDataRange, AxisToggleTarget } from '../../types'

/* Grid Surface */
export interface GridSurfaceSpacingProps {
  Axis?: number,
  Tick?: number,
};

// Grid surface line props
export interface GridSurfaceLineProps {
  Axis?: number,
  Tick?: number,
  Line?: number,
};

// Grid surface props for individual axes
export interface GridSurfaceAxis {
  Scale: AlAxisScale,
  Range: AlDataRange,
  Title: string,
};

// Grid surface axis data props
export interface GridSurfaceAxisData {
  x: GridSurfaceAxis,
  y: GridSurfaceAxis,
  z: GridSurfaceAxis,
};

// Grid Surface constructor props
export interface GridSurfaceOpts {
  Plane: GridSurfaceAxisData,
  Color?: Three.Color,
  AxisColor?: Three.Color,
  Width?: GridSurfaceLineProps,
  Spacing?: GridSurfaceSpacingProps,
  Rotation?: Three.Quaternion,
};

/* Radial Axis */

// Radial axis helper constructor props
export interface RadialAxisHelperOpts {
  Size: number,
  Scale: AlAxisScale,
  Origin: Three.Vector3,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
};

// Radial vertical axis
export interface RadialVerticalAxisOpts {
  Size: number,
  Scale: AlAxisScale,
  Range: AlDataRange,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
};

// Radial axis constructor props
export interface RadialAxisOpts {
  Scale: AlAxisScale,
  Range: AlDataRange,
  Vertical: RadialVerticalAxisOpts,
  Horizontal: RadialAxisHelperOpts,
  Color?: Three.Color,
  Width?: number,
  Height?: number,
  Offset?: number,
  Rotation?: Three.Quaternion,
};

/* Linear Axis */
export interface VerticalAxisOpts {
  Scale: AlAxisScale,
  Range: AlDataRange,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
};

/* Global axes group */
export interface AtlasAxesOpts {
  RadialAxis: RadialAxisOpts,
  GridSurface: GridSurfaceOpts,
};

/* Axis Line */
export interface AxisLineOpts {
  Axis: AxisToggleTarget,
  Color?: Three.Color,
  Width?: number,
  Dashed?: boolean,
  Vertices?: Three.Vector3[],
};

/* Atlas Axes */
export type AxisHoverTarget = {
  Axis: AxisToggleTarget,
  Position: Three.Vector3,
};

export interface AxisObject extends Three.Object3D<Three.Object3DEventMap> {
  axisTarget: AxisToggleTarget;
  dispose: () => void;
};
