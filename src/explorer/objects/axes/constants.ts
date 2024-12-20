import * as Three from 'three'

import { Const } from '@/explorer/constants'
import {
  RadialAxisOpts, RadialAxisHelperOpts,
  VerticalAxisOpts, AxisLineOpts,
  GridSurfaceLineProps, GridSurfaceOpts, GridSurfaceSpacingProps
} from './types'

/* Grid Surface */
// Default grid surface props for grid spacing
export const GridSurfaceSpacingDefaults: Partial<GridSurfaceSpacingProps> = {
  Axis: 1.00,
  Tick: 0.25,
};

// Default grid surface props for line appearance
export const GridSurfaceLineDefaults: Partial<GridSurfaceLineProps> = {
  Axis: 0.0020,
  Tick: 0.0015,
  Line: 4,
};

// Default grid surface line color
export const GridSurfaceColor = new Three.Color(0.5, 0.5, 0.5);
// Default radial horizontal/vertical axis color
export const GridSurfaceAxisColor = new Three.Color('#AC87C5'); // i.e. 'East Side' purple

// Default grid surface orientation (plane face upwards)
export const GridSurfaceOrientation = new Three.Quaternion().identity();

// Default opts to construct grid surface
export const GridSurfaceDefaults: Partial<GridSurfaceOpts> = {
  Color: GridSurfaceColor.clone(),
  AxisColor: GridSurfaceAxisColor,
  Rotation: GridSurfaceOrientation
};

/* Radial Axis */
// Default radial axis color
export const RadialAxisColor = new Three.Color(0.5, 0.5, 0.5);
// Default radial horizontal/vertical axis color
export const RadialLineAxisColor = new Three.Color('#AC87C5'); // i.e. 'East Side' purple

// Default radial axis orientation (plane face upwards)
export const RadialAxisOrientation = new Three.Quaternion().setFromAxisAngle(Const.RightVector, -Const.PI_HALF);

// Default opts to construct radial axis
export const RadialAxisDefaults: Partial<RadialAxisOpts> = {
  Color: RadialAxisColor.clone(),
  Width: 1e-3,
  Height: 0,
  Offset: 0,
  Rotation: RadialAxisOrientation
};

// Default opts to construct radial axis
export const RadialVerticalAxisDefaults: Partial<VerticalAxisOpts> = {
  Color: RadialLineAxisColor.clone(),
  Width: 4,
  Dashed: true,
};


// Default opts to construct radial axis
export const RadialAxisHelperDefaults: Partial<RadialAxisHelperOpts> = {
  Color: RadialLineAxisColor.clone(),
  Width: 4,
  Dashed: true,
};

/* Vertical Axis */
// Default radial axis color
export const VerticalAxisColor = new Three.Color('#AC87C5'); // i.e. 'East Side' purple

// Default opts to construct radial axis
export const VerticalAxisDefaults: Partial<VerticalAxisOpts> = {
  Color: VerticalAxisColor.clone(),
  Width: 1e-3*4,
  Dashed: true,
};

/* Axis Line */
// Default radial axis color
export const AxisLineColor = new Three.Color('#AC87C5'); // i.e. 'East Side' purple

// Default opts to construct radial axis
export const AxisLineDefaults: Partial<AxisLineOpts> = {
  Color: AxisLineColor.clone(),
  Width: 4,
  Dashed: true,
  Vertices: [],
};
