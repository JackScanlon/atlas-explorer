import { Texture } from '@engine/core';

/**
 * @desc
 *
 * @property {number}  id
 * @property {boolean} static
 * @property {number}  inDegree
 * @property {number}  outDegree
 * @property {string}  slug
 * @property {string}  phecode
 * @property {string}  phenotype
 * @property {number}  sexId
 * @property {number}  tagId
 * @property {number}  typeId
 * @property {number}  organId
 * @property {number}  categoryId
 * @property {number}  specialityId
 */
export interface INode {
  id: number;
  static: boolean;
  inDegree: number;
  outDegree: number;
  slug: string;
  phecode: string;
  label: string;
  sexId: number;
  tagId: number;
  typeId: number;
  organId: number;
  categoryId: number;
  specialityId: number;
}

/**
 * @desc
 *
 * @property {number} id
 * @property {number} source
 * @property {number} target
 * @property {number} weight
 * @property {number} prevRatio
 * @property {number} prevalence
 */
export interface IEdge {
  id: number;
  source: number;
  target: number;
  weight: number;
  prevRatio: number;
  prevalence: number;
}

/**
 * @desc
 *
 * @property {Float32Array} NodePosBuf
 * @property {Float32Array} NodeVelBuf
 * @property {Float32Array} NodeDscBuf
 * @property {Float32Array} EdgeLineBuf
 * @property {Float32Array} EdgeSrcAdjMapBuf
 * @property {Float32Array} EdgeTrgAdjMapBuf
 * @property {Float32Array} EdgeSrcAdjIdxBuf
 * @property {Float32Array} EdgeTrgAdjIdxBuf
 */
export interface IGraphDatapoints {
  NodePosBuf: Float32Array;
  NodeVelBuf: Float32Array;
  NodeDscBuf: Float32Array;
  EdgeLineBuf: Float32Array;
  EdgeSrcAdjMapBuf: Float32Array;
  EdgeTrgAdjMapBuf: Float32Array;
  EdgeSrcAdjIdxBuf: Float32Array;
  EdgeTrgAdjIdxBuf: Float32Array;
}

/**
 * @desc
 *
 * @property {Texture} uTexNodePos
 * @property {Texture} uTexNodeVel
 * @property {Texture} uTexNodeDesc
 * @property {Texture} uTexEdgeLines
 * @property {Texture} uTexEdgeSrcAdjMap
 * @property {Texture} uTexEdgeTrgAdjMap
 * @property {Texture} uTexEdgeSrcAdjIdx
 * @property {Texture} uTexEdgeTrgAdjIdx
 */
export interface IGraphTextures {
  uTexNodePos: Texture;
  uTexNodeVel: Texture;
  uTexNodeDesc: Texture;
  uTexEdgeLines: Texture;
  uTexEdgeSrcAdjMap: Texture;
  uTexEdgeTrgAdjMap: Texture;
  uTexEdgeSrcAdjIdx: Texture;
  uTexEdgeTrgAdjIdx: Texture;
}

/**
 * @desc
 *
 * @property {Map<number, Array<number>>} edgeMap
 * @property {Map<number, Array<number>>} edgeLkup
 * @property {Map<number, string>}        idToPhecode
 * @property {Map<string, number>}        phecodeToId
 */
export interface IGraphMapping {
  edgeMap: Map<number, Array<number>>;
  edgeLkup: Map<number, Array<number>>;
  idToPhecode: Map<number, string>;
  phecodeToId: Map<string, number>;
}

/**
 * @desc
 *
 * @property {Record<string, string>} organId
 * @property {Record<string, string>} specialityId
 */
export interface IMetadataPalettes {
  organId: Record<string, string>;
  specialityId: Record<string, string>;
}

/**
 * @desc
 *
 * @property {Map<number, string>} sexId
 * @property {Map<number, string>} tagId
 * @property {Map<number, string>} typeId
 * @property {Map<number, string>} organId
 * @property {Map<number, string>} categoryId
 * @property {Map<number, string>} specialityId
 * @property {IMetadataPalettes}   palettes
 */
export interface IMetadataLookup {
  sexId: Map<number, string>;
  tagId: Map<number, string>;
  typeId: Map<number, string>;
  organId: Map<number, string>;
  categoryId: Map<number, string>;
  specialityId: Map<number, string>;
  palettes: IMetadataPalettes;
}

/**
 * @desc
 * @see {@link IMetadataLookup}
 *
 * @property {Array<INode>}    nodes
 * @property {Array<IEdge>}    edges
 * @property {IMetadataLookup} metadata
 */
export interface IGraphBase {
  nodes: Array<INode>;
  edges: Array<IEdge>;
  metadata: IMetadataLookup;
}

/**
 * @desc
 * @see {@link IGraphBase}
 * @see {@link IGraphMapping}
 * @see {@link IGraphDatapoints}
 *
 * @property {IGraphMapping}    mapping
 * @property {IGraphDatapoints} dataBuffers
 * @property {number}           nodeDataTexSz
 * @property {number}           edgeLineTexSz
 * @property {number}           edgeDataTexSz
 */
export interface IGraphSavedState extends IGraphBase {
  mapping: IGraphMapping;
  dataBuffers: IGraphDatapoints;
  nodeDataTexSz: number;
  edgeLineTexSz: number;
  edgeDataTexSz: number;
}

/**
 * @desc
 * @see {@link IGraphBase}
 * @see {@link IGraphTextures}
 *
 * @property {IGraphTextures} textures
 */
export interface IGraphDataset extends IGraphSavedState {
  readonly textures: IGraphTextures;
}
