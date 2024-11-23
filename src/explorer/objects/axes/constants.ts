import * as Three from 'three'

import { Const } from '@/explorer/constants';
import { RadialAxisOpts, AxisHelperOpts, VerticalAxisOpts, AxisLineOpts } from './types'

/* Radial Axis */
// Default radial axis color
export const RadialAxisColor = new Three.Color(0.5, 0.5, 0.5);

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
export const AxisHelperDefaults: Partial<AxisHelperOpts> = {
  Color: RadialAxisColor.clone(),
  Width: 1,
  Dashed: false,
};

/* Linear Axis */
// Default radial axis color
export const VerticalAxisColor = new Three.Color(0.5, 0.5, 0.5);

// Default opts to construct radial axis
export const VerticalAxisDefaults: Partial<VerticalAxisOpts> = {
  Color: VerticalAxisColor.clone(),
  Width: 1e-3*4,
  Dashed: false,
};

/* Axis Line */
// Default radial axis color
export const AxisLineColor = new Three.Color(0.5, 0.5, 0.5);

// Default opts to construct radial axis
export const AxisLineDefaults: Partial<AxisLineOpts> = {
  Color: new Three.Color(0.5, 0.5, 0.5),
  Width: 1,
  Dashed: false,
  Vertices: [],
}
