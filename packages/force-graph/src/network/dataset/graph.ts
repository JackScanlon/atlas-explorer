import { Texture } from '@engine/core';
import { isValidString } from '@network/common';
import { DefaultGraphTex } from './constants';
import { Vec2, NumberUtils } from '@engine/math';
import { fetchDataset, processNodeRow, processEdgeRow, hex2rgb, jsonStateParser, jsonStateTransformer } from './utils';
import type {
  INode,
  IEdge,
  IGraphDataset,
  IGraphTextures,
  IGraphMapping,
  IMetadataLookup,
  IGraphDatapoints,
  IGraphSavedState,
  IGraphBase,
} from './types';

/**
 * Class wrapping, managing and containing graph-adjacent data, configuration & resources
 *
 * @class
 * @constructor
 */
export class GraphDataset implements IGraphDataset {
  /**
   * @desc
   * @type {number}
   * @readonly
   */
  public readonly nodeCount!: number;

  /**
   * @desc
   * @type {number}
   * @readonly
   */
  public readonly edgeCount!: number;

  /**
   * @desc
   * @type {number}
   * @readonly
   */
  public readonly nodeDataTexSz!: number;

  /**
   * @desc
   * @type {number}
   * @readonly
   */
  public readonly edgeLineTexSz!: number;

  /**
   * @desc
   * @type {number}
   * @readonly
   */
  public readonly edgeDataTexSz!: number;

  /**
   * @desc
   * @type {Array<INode>}
   * @readonly
   */
  public readonly nodes: Array<INode> = [];

  /**
   * @desc
   * @type {Array<IEdge>}
   * @readonly
   */
  public readonly edges: Array<IEdge> = [];

  /**
   * @desc
   * @type {IGraphMapping}
   * @private
   */
  public readonly mapping!: IGraphMapping;

  /**
   * @desc
   * @type {IMetadataLookup}
   * @private
   */
  public readonly metadata!: IMetadataLookup;

  /**
   * @desc
   * @type {IGraphTextures}
   * @private
   */
  private _textures!: IGraphTextures;

  /**
   * @desc
   * @type {IGraphDatapoints}
   * @private
   */
  private _data!: IGraphDatapoints;

  /**
   * @param opts dataset constructor props, see {@link IGraphDataset} & {@link IGraphDataset}
   */
  public constructor(opts: Omit<IGraphDataset, 'textures'> & { textures?: IGraphTextures }) {
    if (opts.textures == null || typeof opts.textures === 'undefined') {
      GraphDataset.BuildTextures(opts);
    }

    this._data = opts.dataBuffers;
    this._textures = opts.textures!;

    this.nodes = opts.nodes;
    this.edges = opts.edges;
    this.mapping = opts.mapping;
    this.metadata = opts.metadata;

    this.nodeCount = opts.nodes.length;
    this.edgeCount = opts.edges.length;

    this.edgeDataTexSz = opts.edgeDataTexSz;
    this.nodeDataTexSz = opts.nodeDataTexSz;
    this.edgeLineTexSz = opts.edgeLineTexSz;
  }

  /**
   * @desc
   * @async
   * @static
   *
   * @param {string} target
   *
   * @returns {Promise<GraphDataset>}
   */
  public static async LoadSavedState(target: string): Promise<GraphDataset> {
    const stateData = await fetch(target, { method: 'get' })
      .then(res => res.text())
      .then(res => JSON.parse(res, jsonStateParser))
      .then(res => {
        if (typeof res !== 'object') {
          throw new Error(`Expected SavedState file to define a JSON obj, got ${typeof res}`);
        }

        return GraphDataset.BuildFromState(res);
      });

    return new GraphDataset(stateData);
  }

  /**
   * @desc
   * @async
   * @static
   *
   * @param {object} targets
   * @param {string} targets.nodes
   * @param {string} targets.edges
   * @param {string} targets.lkup
   *
   * @returns {Promise<GraphDataset>}
   */
  public static async AsSimulation(targets: { nodes: string; edges: string; lkup: string }): Promise<GraphDataset> {
    const idToPhecode = new Map<number, string>();
    const phecodeToId = new Map<string, number>();

    const edgeMap = new Map<number, Array<number>>();
    const edgeLkup = new Map<number, Array<number>>();

    let nodeId: number = 0;
    let edgeId: number = 0;

    const lkupData = await fetch(targets.lkup, { method: 'get' })
      .then(res => res.json())
      .then(res => {
        if (typeof res !== 'object') {
          throw new Error(`Expected MetadataLkup file to define a JSON dict, got ${typeof res}`);
        }

        const lkup: IMetadataLookup = {
          sexId: new Map<number, string>(),
          tagId: new Map<number, string>(),
          typeId: new Map<number, string>(),
          organId: new Map<number, string>(),
          categoryId: new Map<number, string>(),
          specialityId: new Map<number, string>(),
          palettes: res.palettes,
        };

        for (const [key, group] of Object.entries(lkup)) {
          if (!(group instanceof Map)) {
            continue;
          }

          for (const [id, label] of Object.entries(res[key])) {
            group.set(parseInt(id), label);
          }
        }

        return lkup;
      });

    // phecode,phenotype,slug,typeId,sexId,categoryId,tagId,organId,specialityId
    const nodeData = await fetchDataset<INode>(targets.nodes, {
      reqOpts: { method: 'get' },
      rowCallback: (row, headers): Nullable<INode> => {
        const phecode = row?.[headers.phecode];
        if (!isValidString(phecode) || phecodeToId.has(phecode)) {
          return null;
        }

        const node = processNodeRow(nodeId, phecode, row, headers);
        if (!node) {
          return null;
        }

        idToPhecode.set(nodeId, phecode);
        phecodeToId.set(phecode, nodeId);
        nodeId++;

        return node;
      },
    });

    // phecode0,phecode1,prevalence,prev_ratio,weight
    const edgeData = await fetchDataset<IEdge>(targets.edges, {
      reqOpts: { method: 'get' },
      rowCallback: (row, headers): Nullable<IEdge> => {
        const p0 = row?.[headers.phecode0];
        const p1 = row?.[headers.phecode1];
        if (!isValidString(p0) || !isValidString(p1) || p0 === p1) {
          return null;
        }

        const i0 = phecodeToId.get(p0);
        const i1 = phecodeToId.get(p1);
        if (typeof i0 !== 'number' || typeof i1 !== 'number' || i0 === i1) {
          return null;
        }

        const edge = processEdgeRow(edgeId, i0, i1, row, headers);
        if (!edge) {
          return null;
        }

        let mapping = edgeMap.get(i0);
        if (!mapping) {
          mapping = [];
          edgeMap.set(i0, mapping);
        }

        if (mapping.includes(i1) || (edgeMap.get(i1) && edgeMap.get(i1)!.includes(i0))) {
          return null;
        }
        mapping.push(i1);

        mapping = edgeLkup.get(i0);
        if (!mapping) {
          mapping = [];
          edgeLkup.set(i0, mapping);
        }
        nodeData[i0].outDegree++;
        mapping.push(edgeId);

        mapping = edgeLkup.get(i1);
        if (!mapping) {
          mapping = [];
          edgeLkup.set(i1, mapping);
        }
        nodeData[i1].inDegree++;
        mapping.push(edgeId);

        edgeId++;
        return edge;
      },
    });

    const opts = GraphDataset.BuildDataBuffers({
      nodes: nodeData,
      edges: edgeData,
      mapping: { idToPhecode, phecodeToId, edgeLkup, edgeMap },
      metadata: lkupData,
      nodeDataTexSz: NumberUtils.ceilPowerOfTwo(Math.ceil(Math.sqrt(nodeId))),
      edgeLineTexSz: NumberUtils.ceilPowerOfTwo(Math.ceil(Math.sqrt(edgeId))),
      edgeDataTexSz: NumberUtils.ceilPowerOfTwo(Math.ceil(Math.sqrt(edgeId * 2))),
    });

    return new GraphDataset(opts);
  }

  /**
   * @desc
   */
  private static BuildFromState(opts: IGraphBase & { nodePosBuf: Float32Array }): IGraphSavedState {
    const nodes = opts.nodes;
    const edges = opts.edges;

    const phecodeToId = new Map<string, number>();
    const idToPhecode = new Map<number, string>();

    const edgeMap = new Map<number, Array<number>>();
    const edgeLkup = new Map<number, Array<number>>();

    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      phecodeToId.set(node.phecode, node.id);
      idToPhecode.set(node.id, node.phecode);
    }

    let eg!: IEdge;
    let i0!: number;
    let i1!: number;
    for (let i = 0; i < edges.length; ++i) {
      eg = edges[i];

      i0 = eg.source;
      i1 = eg.target;

      if (!nodes[i0] || !nodes[i1]) {
        continue;
      }

      let mapping = edgeMap.get(i0);
      if (!mapping) {
        mapping = [];
        edgeMap.set(i0, mapping);
      }

      if (mapping.includes(i1) || (edgeMap.get(i1) && edgeMap.get(i1)!.includes(i0))) {
        continue;
      }
      mapping.push(i1);

      mapping = edgeLkup.get(i0);
      if (!mapping) {
        mapping = [];
        edgeLkup.set(i0, mapping);
      }
      mapping.push(eg.id);

      mapping = edgeLkup.get(i1);
      if (!mapping) {
        mapping = [];
        edgeLkup.set(i1, mapping);
      }
      mapping.push(eg.id);
    }

    return GraphDataset.BuildDataBuffers({
      ...opts,
      mapping: { edgeMap, edgeLkup, idToPhecode, phecodeToId },
    } as IGraphSavedState & { nodePosBuf: Float32Array });
  }

  /**
   * @desc
   * @static
   * @private
   *
   * @note Edges ...
   *
   * | Edge Texture      | Summary              | Pixel R      | Pixel G   | Pixel B     | Pixel A   |
   * |-------------------|----------------------|--------------|-----------|-------------|-----------|
   * | uTexEdgeLines     | Drawable edge verts  | vert A       | vert B    | vert B      | vert A    |
   * | uTexEdgeSrcAdjMap | edge adjacency map   | start column | start row | elem length | rng dist  |
   * | uTexEdgeTrgAdjMap | inverted adj. map    | start column | start row | elem length | rng dist  |
   * | uTexEdgeSrcAdjIdx | edge adj. index      | trg column   | trg row   | edge weight | edge bias |
   * | uTexEdgeTrgAdjIdx | inverted adj. index  | src column   | src row   | edge weight | edge bias |
   *
   * @note Nodes ...
   * | Node Texture | Summary             | Pixel R      | Pixel G     | Pixel B      | Pixel A     |
   * |--------------|---------------------|--------------|-------------|--------------|-------------|
   * | uTexNodePos  | Node world pos/sz   | pos X        | pos Y       | specialityId | size        |
   * | uTexNodeVel  | Node vel/staticity  | vel X        | vel Y       | vel Z        | staticity   |
   * | uTexNodeDesc | Node colour/opacity | col R        | col G       | col B        | col A       |
   *
   * @param {IGraphSavedState} opts
   *
   * @return {IGraphDataset}
   */
  // prettier-ignore
  private static BuildTextures(opts: IGraphSavedState): IGraphDataset {
    const bufs = opts.dataBuffers;

    const textures: IGraphTextures = {
      uTexNodePos: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.NodePosBuf,
          width: opts.nodeDataTexSz,
          height: opts.nodeDataTexSz,
        })
      }),
      uTexNodeVel: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.NodeVelBuf,
          width: opts.nodeDataTexSz,
          height: opts.nodeDataTexSz,
        })
      }),
      uTexNodeDesc: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.NodeDscBuf,
          width: opts.nodeDataTexSz,
          height: opts.nodeDataTexSz,
        })
      }),
      uTexEdgeLines: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.EdgeLineBuf,
          width: opts.edgeLineTexSz,
          height: opts.edgeLineTexSz,
        })
      }),
      uTexEdgeSrcAdjMap: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.EdgeSrcAdjMapBuf,
          width: opts.nodeDataTexSz,
          height: opts.nodeDataTexSz,
        })
      }),
      uTexEdgeTrgAdjMap: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.EdgeTrgAdjMapBuf,
          width: opts.nodeDataTexSz,
          height: opts.nodeDataTexSz,
        })
      }),
      uTexEdgeSrcAdjIdx: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.EdgeSrcAdjIdxBuf,
          width: opts.edgeDataTexSz,
          height: opts.edgeDataTexSz,
        })
      }),
      uTexEdgeTrgAdjIdx: new Texture({
        ...DefaultGraphTex,
        ...({
          image: bufs.EdgeTrgAdjIdxBuf,
          width: opts.edgeDataTexSz,
          height: opts.edgeDataTexSz,
        })
      }),
    };

    Object.assign(opts, { textures });
    return opts as IGraphDataset;
  }

  /**
   * @desc
   * @static
   * @private
   *
   * @param {Omit<IGraphSavedState, 'dataBuffers'>} opts
   *
   * @returns {IGraphSavedState}
   */
  // prettier-ignore
  private static BuildDataBuffers(opts: Omit<IGraphSavedState, 'dataBuffers'> & { nodePosBuf?: Float32Array }): IGraphSavedState {
    const pos = Vec2.Zero();
    const meta = opts.metadata;
    const nodes = opts.nodes;
    const edges = opts.edges;
    const edgeLkup = opts.mapping.edgeLkup;

    const nodeCount = nodes.length;
    const edgeLineTexSz = opts.edgeLineTexSz;
    const edgeDataTexSz = opts.edgeDataTexSz;
    const nodeDataTexSz = opts.nodeDataTexSz;

    let nodePosBuf!: Float32Array;
    let hasSavedState: boolean = false;
    if (opts.nodePosBuf) {
      nodePosBuf = opts.nodePosBuf;
      hasSavedState = true;
    } else {
      nodePosBuf = new Float32Array(nodeDataTexSz*nodeDataTexSz*4)
    }

    const nodeDscBuf = new Float32Array(nodeDataTexSz*nodeDataTexSz*4);
    const nodeVelBuf = new Float32Array(nodeDataTexSz*nodeDataTexSz*4);
    nodeVelBuf.fill(0);

    const edgeLineBuf = new Float32Array(edgeLineTexSz*edgeLineTexSz*4);
    const edgeSrcAdjMapBuf = new Float32Array(nodeDataTexSz*nodeDataTexSz*4);
    const edgeTrgAdjMapBuf = new Float32Array(nodeDataTexSz*nodeDataTexSz*4);
    const edgeSrcAdjIdxBuf = new Float32Array(edgeDataTexSz*edgeDataTexSz*4);
    const edgeTrgAdjIdxBuf = new Float32Array(edgeDataTexSz*edgeDataTexSz*4);

    const groupColors = new Map<number, number[]>();
    for (const [key, value] of Object.entries(meta.palettes.specialityId)) {
      const col = hex2rgb(value);
      groupColors.set(parseInt(key), [col[0], col[1], col[2], 1.0]);
    }

    let vlCount: number = 0,
        slCount: number = 0,
        tlCount: number = 0,
        mDegSrc: number = 0,
        mDegTrg: number = 0;

    for (let i = 0; i < nodeCount; ++i) {
      const node = nodes[i];
      // pos.randomCircle(0, 1);

      if (!hasSavedState) {
        nodePosBuf[node.id*4 + 0] = pos[0];             // Point X
        nodePosBuf[node.id*4 + 1] = pos[1];             // Point Y
        nodePosBuf[node.id*4 + 2] = node.specialityId;  // Group Id
        nodePosBuf[node.id*4 + 3] = 12.0;               // Point Radius
      }

      nodeVelBuf[node.id*4 + 3] = 0.0;                // Staticity

      const col = groupColors.get(node.specialityId) || [0, 0, 0, 1];
      nodeDscBuf[node.id*4 + 0] = col[0];
      nodeDscBuf[node.id*4 + 1] = col[1];
      nodeDscBuf[node.id*4 + 2] = col[2];
      nodeDscBuf[node.id*4 + 3] = col[3];

      const connections = edgeLkup.get(node.id);
      if (Array.isArray(connections) && connections.length > 0) {
        edgeSrcAdjMapBuf[node.id*4 + 0] = slCount;                    // Edge Id
        edgeSrcAdjMapBuf[node.id*4 + 1] = 0.0;                        // ¿EMPTY
        edgeSrcAdjMapBuf[node.id*4 + 2] = 0.0;                        // Edge count
        edgeSrcAdjMapBuf[node.id*4 + 3] = NumberUtils.randomFloat();  // Rng Distance

        edgeTrgAdjMapBuf[node.id*4 + 0] = tlCount;                    // Edge Id
        edgeTrgAdjMapBuf[node.id*4 + 1] = 0.0;                        // ¿EMPTY?
        edgeTrgAdjMapBuf[node.id*4 + 2] = 0.0;                        // Edge count
        edgeTrgAdjMapBuf[node.id*4 + 3] = NumberUtils.randomFloat();  // Rng Distance

        let srcCnt: number = 0, trgCnt: number = 0;
        for (let j = 0; j < connections.length; ++j) {
          const idnt = connections[j];
          const edge = edges[idnt];

          if (edge.source === node.id) {
            const conn = nodes[edge.target];
            const bias = (node.inDegree + node.outDegree) / (node.inDegree + node.outDegree + conn.inDegree + conn.outDegree);
            srcCnt++;

            edgeSrcAdjIdxBuf[slCount*4 + 0] = edge.target;        // Node Id
            edgeSrcAdjIdxBuf[slCount*4 + 1] = 0.0;                // ¿EMPTY?
            edgeSrcAdjIdxBuf[slCount*4 + 2] = (1 - edge.weight);  // Weight
            edgeSrcAdjIdxBuf[slCount*4 + 3] = bias;               // Bias
            edgeSrcAdjMapBuf[node.id*4 + 2]++;
            slCount++;

            edgeLineBuf[vlCount*4 + 0] = edge.source;   // Start Node Id
            edgeLineBuf[vlCount*4 + 1] = edge.target;   // End Node Id
            edgeLineBuf[vlCount*4 + 2] = 0;             // ¿EMPTY? | Could be used for line-related appr?
            edgeLineBuf[vlCount*4 + 3] = 0;             // ¿EMPTY?
            vlCount++;
          } else {
            const conn = nodes[edge.source];
            const bias = (node.inDegree + node.outDegree) / (node.inDegree + node.outDegree + conn.inDegree + conn.outDegree);
            trgCnt++;

            edgeTrgAdjIdxBuf[tlCount*4 + 0] = edge.source;        // Node Id
            edgeTrgAdjIdxBuf[tlCount*4 + 1] = 0.0;                // ¿EMPTY?
            edgeTrgAdjIdxBuf[tlCount*4 + 2] = (1 - edge.weight);  // Weight
            edgeTrgAdjIdxBuf[tlCount*4 + 3] = bias;               // Bias
            edgeTrgAdjMapBuf[node.id*4 + 2]++;
            tlCount++;
          }
        }
        mDegSrc = Math.max(mDegSrc, srcCnt);
        mDegTrg = Math.max(mDegTrg, trgCnt);
      } else {
        edgeSrcAdjMapBuf[node.id*4 + 0] = slCount;                    // Edge Id
        edgeSrcAdjMapBuf[node.id*4 + 1] = 0.0;                        // ¿EMPTY?
        edgeSrcAdjMapBuf[node.id*4 + 2] = 0.0;                        // Edge count
        edgeSrcAdjMapBuf[node.id*4 + 3] = NumberUtils.randomFloat();  // Rng Distance
        slCount++;

        edgeTrgAdjMapBuf[node.id*4 + 0] = tlCount;                    // Edge Id
        edgeTrgAdjMapBuf[node.id*4 + 1] = 0.0;                        // ¿EMPTY?
        edgeTrgAdjMapBuf[node.id*4 + 2] = 0.0;                        // Edge count
        edgeTrgAdjMapBuf[node.id*4 + 3] = NumberUtils.randomFloat();  // Rng Distance
        tlCount++;
      }
    }

    const dataBuffers: IGraphDatapoints = {
      NodePosBuf: nodePosBuf,
      NodeVelBuf: nodeVelBuf,
      NodeDscBuf: nodeDscBuf,
      EdgeLineBuf: edgeLineBuf,
      EdgeSrcAdjMapBuf: edgeSrcAdjMapBuf,
      EdgeTrgAdjMapBuf: edgeTrgAdjMapBuf,
      EdgeSrcAdjIdxBuf: edgeSrcAdjIdxBuf,
      EdgeTrgAdjIdxBuf: edgeTrgAdjIdxBuf,
    };

    Object.assign(opts, { dataBuffers })
    return opts as IGraphSavedState;
  }

  /**
   * @returns {IGraphTextures}
   */
  public get textures(): IGraphTextures {
    return this._textures;
  }

  /**
   * @returns {IGraphDatapoints}
   */
  public get dataBuffers(): IGraphDatapoints {
    return this._data;
  }

  /**
   * @desc
   *
   * @param {number} id
   *
   * @returns {Nullable<INode>}
   */
  public getNodeById(id: number): Nullable<INode> {
    return this.nodes[id] ?? null;
  }

  /**
   * @desc
   *
   * @param {string} phecode
   *
   * @returns {Nullable<INode>}
   */
  public getNodeByPhecode(phecode: string): Nullable<INode> {
    const id = this.mapping.phecodeToId.get(phecode);
    if (typeof id !== 'undefined') {
      return this.nodes[id] ?? null;
    }

    return null;
  }

  /**
   * @desc
   *
   * @param {number} id
   * @param {string} edgeType
   *
   * @returns {Array<IEdge>}
   */
  public getNodeEdgesById(id: number, edgeType: 'source' | 'target' | 'all' = 'all'): Array<IEdge> {
    const list = [] as Array<IEdge>;
    const node = this.getNodeById(id);
    if (node === null || typeof node === 'undefined') {
      return list;
    }

    switch (edgeType) {
      case 'source':
        {
          const mapped = this.mapping.edgeMap.get(id);
          if (mapped) {
            list.splice(
              0,
              mapped.length,
              ...mapped.reduce((res, x) => {
                const edge = this.edges[x];
                if (edge) {
                  res.push(edge);
                }

                return res;
              }, [] as Array<IEdge>)
            );
          }
        }
        break;

      case 'target':
        {
          const mapped = this.mapping.edgeLkup.get(id);
          if (mapped) {
            list.splice(
              0,
              mapped.length,
              ...mapped.reduce((res, x) => {
                const edge = this.edges[x];
                if (edge && edge.target === id) {
                  res.push(edge);
                }

                return res;
              }, [] as Array<IEdge>)
            );
          }
        }
        break;

      case 'all':
        {
          const mapped = this.mapping.edgeLkup.get(id);
          if (mapped) {
            list.splice(0, mapped.length, ...mapped.map(x => this.edges[x]));
          }
        }
        break;

      default:
        break;
    }

    return list;
  }

  /**
   * @desc
   *
   * @param {string} phecode
   * @param {string} edgeType
   *
   * @returns {Array<IEdge>}
   */
  public getNodeEdgesByPhecode(phecode: string, edgeType: 'source' | 'target' | 'all' = 'all'): Array<IEdge> {
    return this.getNodeEdgesById(this.mapping.phecodeToId.get(phecode) ?? -1, edgeType);
  }

  /**
   * @desc
   *
   * @returns {this}
   */
  public saveState(posFrame?: Float32Array): this {
    const link = document.createElement('a');
    const state = {
      nodes: this.nodes,
      edges: this.edges,
      metadata: this.metadata,
      nodePosBuf: posFrame ?? this._data.NodePosBuf,
      nodeDataTexSz: this.nodeDataTexSz,
      edgeLineTexSz: this.edgeLineTexSz,
      edgeDataTexSz: this.edgeDataTexSz,
      // mapping: this.mapping,
      // dataBuffers: {} as Record<string, ArrayBufferLike>,
    };

    const json = JSON.stringify(state, jsonStateTransformer, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const target = URL.createObjectURL(blob);
    link.setAttribute('href', target);
    link.setAttribute('download', 'state.explorer.json');
    link.click();

    return this;
  }
}
