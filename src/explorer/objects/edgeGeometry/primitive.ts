import * as Three from 'three'

import { AxisId, NormalId } from '@/explorer/types'

export interface QuadPrimitive<T extends Three.Vector3 | number[]> {
  id: number,
  index: number,
  point: T,
  normal: T,
  normalId: NormalId,
  perpendicularId: NormalId,
  edgeIndices: number[],
  faceIndices: number[],
};

export interface EdgePrimitive {
  id: number,
  axisId: AxisId,
  index0: number,
  index1: number,
  vertex0: Three.Vector3,
  vertex1: Three.Vector3,
  magnitude: number,
  direction: Three.Vector3,
};

export
  /****************************************************
   * @desc cube face(s)                               *
   *                                                  *
   * | Face   | Point | Normal     | Edges          | *
   * |--------|-------|------------|----------------| *
   * | Right  |    17 |  1,  0,  0 | 20, 22, 19, 17 | *
   * | Top    |    17 |  0,  1,  0 | 17, 19, 18, 16 | *
   * | Back   |    17 |  0,  0,  1 | 17, 16, 21, 20 | *
   * | Left   |    16 | -1,  0,  0 | 16, 18, 23, 21 | *
   * | Bottom |    20 |  0, -1,  0 | 21, 23, 22, 20 | *
   * | Front  |    19 |  0,  0, -1 | 22, 23, 18, 19 | *
   *                                                  *
   ****************************************************/
  const quads = new Map<NormalId, QuadPrimitive<number[]>>([
    [
      NormalId.Right,
      {
        id: 0,
        index: 17,
        point: [0.5, 0.0, 0.0],
        normal: [1, 0, 0],
        normalId: NormalId.Right,
        perpendicularId: NormalId.Front,
        edgeIndices: [20, 22, 19, 17],
        faceIndices: [8, 4, 9, 0],
      }
    ],
    [
      NormalId.Top,
      {
        id: 1,
        index: 17,
        point: [0.0, 0.5, 0.0],
        normal: [0, 1, 0],
        normalId: NormalId.Top,
        perpendicularId: NormalId.Right,
        edgeIndices: [17, 19, 18, 16],
        faceIndices: [0, 1, 2, 3],
      },
    ],
    [
      NormalId.Back,
      {
        id: 2,
        index: 17,
        point: [0.0, 0.0, 0.5],
        normal: [0, 0, 1],
        normalId: NormalId.Back,
        perpendicularId: NormalId.Right,
        edgeIndices: [17, 16, 21, 20],
        faceIndices: [3, 10, 7, 8],
      },
    ],
    [
      NormalId.Left,
      {
        id: 3,
        index: 16,
        point: [-0.5, 0.0, 0.0],
        normal: [-1, 0, 0],
        normalId: NormalId.Left,
        perpendicularId: NormalId.Front,
        edgeIndices: [16, 18, 23, 21],
        faceIndices: [2, 11, 6, 10],
      },
    ],
    [
      NormalId.Bottom,
      {
        id: 4,
        index: 20,
        point: [0.0, -0.5, 0.0],
        normal: [0, -1, 0],
        normalId: NormalId.Bottom,
        perpendicularId: NormalId.Right,
        edgeIndices: [21, 23, 22, 20],
        faceIndices: [4, 5, 6, 7],
      },
    ],
    [
      NormalId.Front,
      {
        id: 5,
        index: 19,
        point: [0.0, 0.0, -0.5],
        normal: [0, 0, -1],
        normalId: NormalId.Front,
        perpendicularId: NormalId.Right,
        edgeIndices: [22, 23, 18, 19],
        faceIndices: [5, 11, 1, 9],
      }
    ],
  ]);

/**
 * @desc cube primitive data
 */
export
  /**
   * @desc buffer containing:
   *  - vertex [vec3]
   *  - normal [vec3]
   *  - uv     [vec2]
   */
  const vertexBuffer = new Float32Array([
  /*----------------------------------*
   | x | y | z | nx | ny | nz | u | v |
   *----------------------------------*/
    -1,  1,  1,   0,   0,  -1,  0,  0, //   0 [Front]
     1,  1,  1,   0,   0,  -1,  1,  0, //   8
    -1, -1,  1,   0,   0,  -1,  0,  1, //  16
     1, -1,  1,   0,   0,  -1,  1,  1, //  24

     1,  1, -1,   0,   0,   1,  1,  0, //  32 [Back]
    -1,  1, -1,   0,   0,   1,  0,  0, //  40
     1, -1, -1,   0,   0,   1,  1,  1, //  48
    -1, -1, -1,   0,   0,   1,  0,  1, //  56

    -1,  1, -1,  -1,   0,   0,  1,  1, //  64 [Left]
    -1,  1,  1,  -1,   0,   0,  1,  0, //  72
    -1, -1, -1,  -1,   0,   0,  0,  1, //  80
    -1, -1,  1,  -1,   0,   0,  0,  0, //  88

     1,  1,  1,   1,   0,   0,  1,  0, //  96 [Right]
     1,  1, -1,   1,   0,   0,  1,  1, // 104
     1, -1,  1,   1,   0,   0,  0,  0, // 112
     1, -1, -1,   1,   0,   0,  0,  1, // 120

    -1,  1,  1,   0,   1,   0,  0,  0, // 128 [Top]
     1,  1,  1,   0,   1,   0,  1,  0, // 136
    -1,  1, -1,   0,   1,   0,  0,  1, // 144
     1,  1, -1,   0,   1,   0,  1,  1, // 152

     1, -1,  1,   0,  -1,   0,  1,  0, // 160 [Bottom]
    -1, -1,  1,   0,  -1,   0,  0,  0, // 168
     1, -1, -1,   0,  -1,   0,  1,  1, // 176
    -1, -1, -1,   0,  -1,   0,  0,  1, // 184
  ]),
  /**
   * @desc primitive's triangle indices
   */
  triIndices = new Uint16Array([
     0,  2,  1, // Front
     2,  3,  1,
     4,  6,  5, // Back
     6,  7,  5,
     8, 10,  9, // Left
    10, 11,  9,
    12, 14, 13, // Right
    14, 15, 13,
    16, 17, 18, // Top
    18, 17, 19,
    20, 21, 22, // Bottom
    22, 21, 23,
  ]),
  /**
   * @desc primitive's edge indices
   */
  edgeIndices = new Uint16Array([
    17, 19, // 4x top
    19, 18,
    18, 16,
    16, 17,

    20, 22, // 4x bottom
    22, 23,
    23, 21,
    21, 20,

    17, 20, // 4x vertical
    19, 22,
    16, 21,
    18, 23,
  ]);
