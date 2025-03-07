import { Vec2 } from '@engine/math';
import { GraphDataset, INode } from './dataset';
import { Signal, TransformUpdate, Variant } from '@engine/common';
import { Geometry, Material, Mesh, Scene, OrthographicCamera, FullscreenGeometry } from '@engine/objects';
import { Compute, RenderTarget, Runtime, Texture, Uniform, RuntimeProps, type RuntimeFrame, LogLevel } from '@engine/core';
import {
  NodeVertShader,
  NodeFragShader,
  EdgeVertShader,
  EdgeFragShader,
  SimForcesVertShader,
  SimForcesFragShader,
  SimPosFragShader,
  SimPaintFragShader,
  SimPaintVertShader,
} from './shaders';
import {
  OrthoCamControls,
  InputController,
  InputAction,
  InputObject,
  InputState,
  InputGesture,
  TouchState,
  InputDevice,
} from '@engine/controllers';

/**
 * @desc
 */
// prettier-ignore
enum GraphInputAction {
  //                    | Binary   | Decimal |
  //                    |----------|---------|
  None     =      0, // | 00000000 |  0      |
  Build    = 1 << 0, // | 00000001 |  1      |
  Select   = 1 << 1, // | 00000010 |  2      |
  Tooltip  = 1 << 2, // | 00000100 |  4      |
  Retarget = 1 << 3, // | 00001000 |  8      |
}

/**
 * @desc
 */
interface GraphInputTarget {
  action: GraphInputAction;
  device: InputDevice;
  selection: number | null;
  target: InputObject | TouchState | null;
  position: Vec2;
}

/**
 * @desc
 */
export interface GraphTargetNode {
  target: INode;
  position: Vec2;
}

/**
 * @desc
 */
export type GraphRuntimeProps = { graph?: GraphDataset } & RuntimeProps;

/**
 * Class describing the graph applet render loop & behaviour
 *
 * @class
 * @constructor
 * @extends Runtime
 * @extends Disposable
 */
export class GraphRuntime extends Runtime {
  declare public dispose;
  declare public pushDisposables;
  declare public getNamedDisposable;
  declare public setNamedDisposable;

  /**
   * @desc
   * @type {boolean}
   */
  public needsUpdate: boolean = true;

  /**
   * @desc
   * @type {Signal}
   * @readonly
   */
  public readonly loadingSignal: Signal = new Signal({ bufferLast: true });
  /**
   * @desc
   * @type {Signal}
   * @readonly
   */
  public readonly filterSignal: Signal = new Signal({ bufferLast: true });

  /**
   * @desc
   * @type {OrthographicCamera}
   */
  public camera!: OrthographicCamera;

  /**
   * @desc
   * @type {OrthoCamControls}
   */
  public camControls!: OrthoCamControls;

  /**
   * @desc
   * @type {InputController}
   */
  public inputControls!: InputController;

  /**
   * @desc
   * @type {Variant}
   * @readonly
   */
  public readonly selectedItem: Variant<INode> = new Variant<INode>({ value: null, deepCompare: true });

  /**
   * @desc
   * @type {Variant}
   * @readonly
   */
  public readonly tooltipItem: Variant<GraphTargetNode> = new Variant<GraphTargetNode>({ value: null, deepCompare: true });

  /**
   * @desc
   * @type {Scene}
   * @readonly
   */
  public readonly scene: Scene = new Scene();

  /**
   * @desc
   * @type {Float32Array}
   * @readonly
   */
  public readonly pixelPickingTarget: Float32Array = new Float32Array(4);

  /**
   * @desc
   * @type {Float32Array}
   * @readonly
   */
  public pixelPaintTarget!: Float32Array;

  /**
   * @desc
   * @type {Record<string, Uniform>}
   * @readonly
   */
  public readonly uniforms: Record<string, Uniform> = {
    // Base
    uZoom: { value: 0.04 },
    uTimeStep: { value: 1 },
    uTimeDelta: { value: 1 },
    uTimeStamp: { value: 0 },
    uResolution: { value: Vec2.Zero() },
    uAspectRatio: { value: 1 },

    // Behaviour
    uDecay: { value: 0 },
    uCentre: { value: 0.01 },
    uGravity: { value: 0.01 },
    uDistance: { value: 10.0 },
    uFriction: { value: 0.9 },
    uStiffness: { value: 1.0 },
    uRepulsion: { value: 2 },
    uTemperature: { value: 1 },
    uVisible: { value: null },

    // Node props
    uNodeCount: { value: 0 },
    uNodeScale: { value: 10 },
    uNodeRadius: { value: 8 },
    uNodeOpacity: { value: 1 },
    uNodeColor: { value: [1, 1, 1, 1] },
    uNodeUseColors: { value: 1 },
    uNodeSmoothness: { value: 0.92 },

    // Edge props
    uEdgeCount: { value: 0 },
    uEdgeScale: { value: 100 },
    uEdgeOpacity: { value: 0.7 },
    uEdgeColor: { value: [0.94117647058, 0.94117647058, 0.8431372549, 0.3] },
    uEdgeUseColors: { value: 1 },

    // RenderTarget behaviour
    uTexPicker: { value: null },
    uTexPainter: { value: null },
    uNodePicking: { value: 0 },
    uNodeSelected: { value: -1 },
    uNodeHighlighted: { value: -1 },

    // Node / Compute sampler(s)
    uTexNodeSz: { value: -1 },
    uTexNodeInvSz: { value: -1 },
    uTexNodePos: { value: null },
    uTexNodeVel: { value: null },
    uTexNodeDesc: { value: null },

    // Edge / Compute sampler(s)
    uTexEdgeDataSz: { value: -1 },
    uTexEdgeDataInvSz: { value: -1 },
    uTexEdgeSrcAdjMap: { value: null },
    uTexEdgeTrgAdjMap: { value: null },
    uTexEdgeSrcAdjIdx: { value: null },
    uTexEdgeTrgAdjIdx: { value: null },

    // Edge geom. sampler(s)
    uTexEdgeLineSz: { value: -1 },
    uTexEdgeLineInvSz: { value: -1 },
    uTexEdgeLines: { value: null },
  };

  /**
   * @desc
   * @type {GraphDataset}
   * @private
   */
  private _graph!: GraphDataset;

  /**
   * @desc
   * @type {Mesh}
   * @private
   */
  private _pointMesh!: Mesh;

  /**
   * @desc
   * @type {Mesh}
   * @private
   */
  private _paintMesh!: Mesh;

  /**
   * @desc
   * @type {RenderTarget}
   * @private
   */
  private _paintTarget!: RenderTarget;

  /**
   * @desc
   * @type {RenderTarget}
   * @private
   */
  private _pickingTarget!: RenderTarget;

  /**
   * @desc
   * @type {Compute}
   * @private
   */
  private _posCompute!: Compute;

  /**
   * @desc
   * @type {Compute}
   * @private
   */
  private _velCompute!: Compute;

  /**
   * @desc
   * @type {Vec3}
   * @private
   * @readonly
   */
  private readonly _inputTarget: GraphInputTarget = {
    target: null,
    device: InputDevice.Unknown,
    action: GraphInputAction.None,
    position: Vec2.Zero(),
    selection: null,
  };

  /**
   * @param {GraphRuntimeProps} props
   */
  public constructor(props: GraphRuntimeProps) {
    super(props);

    if (props.graph) {
      this._graph = props.graph;
    }
  }

  /**
   * @returns {GraphDataset}
   */
  public get graph(): GraphDataset {
    return this._graph;
  }

  /**
   * @desc
   *
   * @param {number}  targetId
   * @param {boolean} enabled
   *
   * @returns {this}
   */
  public toggleFilter(targetId: number, enabled: boolean): this {
    if (!this.isInitialised()) {
      return this;
    }

    const visibility = this.uniforms.uVisible.value;
    if (targetId > visibility.length) {
      return this;
    }

    visibility[targetId] = Number(enabled);

    this.filterSignal.fire([...visibility]);
    this.needsUpdate = true;
    return this;
  }

  /**
   * @desc
   *
   * @param {boolean} enabled
   *
   * @returns {this}
   */
  public toggleAllFilters(enabled: boolean): this {
    if (!this.isInitialised()) {
      return this;
    }

    const visibility = this.uniforms.uVisible.value;
    for (let i = 0; i < visibility.length; ++i) {
      visibility[i] = Number(enabled);
    }

    this.filterSignal.fire([...visibility]);
    this.needsUpdate = true;
    return this;
  }

  /**
   * @desc
   *
   * @param value
   *
   * @returns {this}
   */
  public setSelection(value: number | null): this {
    if (typeof value !== 'number') {
      this.selectedItem.value = null;
      return this;
    }

    // Force camera to move towards point
    const node = this._graph.getNodeById(value);
    if (node) {
      this.selectedItem.value = node;
      this.needsUpdate = true;
    }

    return this;
  }

  /**
   * @desc
   *
   * @returns {this}
   */
  public resetCamera(): this {
    this.tooltipItem.value = null;
    this.selectedItem.value = null;

    this.camControls.zoomScale = 0.035;
    this.camControls.update();

    this.camControls.panDelta.set(0, 0);
    this.camControls.zoomTarget.set(0, 0);
    this.camControls.camera.position.set(0, 0, 1);
    this.camControls.needsUpdate = true;
    return this;
  }

  /**
   * @desc
   *
   * @param {boolean} _contextRestored
   */
  public onInit(_contextRestored: boolean): void {
    const { device, uniforms, graph } = this;

    // Init device & canvas
    device.expectExtensions('EXT_color_buffer_float');
    device.setClearColor([0, 0, 0, 0]);
    device.setViewport();

    // Init compute
    const velocity = new Compute({ src: graph.textures.uTexNodeVel.image as Float32Array, size: graph.nodeDataTexSz });
    uniforms.uTexNodeVel = velocity.uniform;
    this._velCompute = velocity;

    const position = new Compute({ src: graph.textures.uTexNodePos.image as Float32Array, size: graph.nodeDataTexSz });
    uniforms.uTexNodePos = position.uniform;
    this._posCompute = position;

    position.addComputeUnit({
      vs: Compute.DefaultShaders.webgl.vs,
      fs: SimPosFragShader,
      texName: 'uTexNodePos',
      defines: {
        SHADER_NAME: 'PositionCompute',
      },
      uniforms: {
        // Behaviour
        uTemperature: uniforms.uTemperature,

        // Texture inputs
        uTexNodePos: uniforms.uTexNodePos,
        uTexNodeVel: uniforms.uTexNodeVel,

        // Texture props
        uTexNodeInvSz: uniforms.uTexNodeInvSz,
      },
    });

    velocity.addComputeUnit({
      vs: SimForcesVertShader,
      fs: SimForcesFragShader,
      texName: 'uTexNodeVel',
      defines: {
        SHADER_NAME: 'VelocityCompute',
        EDGE_COUNT: graph.edgeCount.toFixed(2),
        NODE_COUNT: graph.nodeCount.toFixed(2),
      },
      uniforms: {
        // Runtime
        uTimeStep: uniforms.uTimeStep,
        uTimeDelta: uniforms.uTimeDelta,

        // Behaviour
        uCentre: uniforms.uCentre,
        uGravity: uniforms.uGravity,
        uFriction: uniforms.uFriction,
        uDistance: uniforms.uDistance,
        uStiffness: uniforms.uStiffness,
        uRepulsion: uniforms.uRepulsion,
        uTemperature: uniforms.uTemperature,

        // Texture props
        uTexNodeSz: uniforms.uTexNodeSz,
        uTexNodeInvSz: uniforms.uTexNodeInvSz,

        uTexEdgeDataSz: uniforms.uTexEdgeDataSz,
        uTexEdgeDataInvSz: uniforms.uTexEdgeDataInvSz,

        // Texture inputs
        uTexNodePos: uniforms.uTexNodePos,
        uTexNodeVel: uniforms.uTexNodeVel,

        uTexEdgeSrcAdjMap: uniforms.uTexEdgeSrcAdjMap,
        uTexEdgeTrgAdjMap: uniforms.uTexEdgeTrgAdjMap,
        uTexEdgeSrcAdjIdx: uniforms.uTexEdgeSrcAdjIdx,
        uTexEdgeTrgAdjIdx: uniforms.uTexEdgeTrgAdjIdx,
      },
    });

    // Init scene
    const lineGeom = new Geometry({ drawMode: 'lines' });
    lineGeom.drawRangeStart = 0;
    lineGeom.drawRangeLength = graph.edgeCount * 2;

    const lineMat = new Material({
      vs: EdgeVertShader,
      fs: EdgeFragShader,
      depthTest: true,
      depthWrite: true,
      defines: {
        SHADER_NAME: 'EdgeMat',
        GROUP_COUNT: uniforms.uVisible.value.length,
      },
      uniforms: {
        // Edge props
        uEdgeColor: uniforms.uEdgeColor,
        uEdgeOpacity: uniforms.uEdgeOpacity,
        uEdgeUseColors: uniforms.uEdgeUseColors,

        // RenderTarget behaviour
        uVisible: uniforms.uVisible,
        uNodeSelected: uniforms.uNodeSelected,
        uNodeHighlighted: uniforms.uNodeHighlighted,

        // Texture props
        uTexNodeSz: uniforms.uTexNodeSz,
        uTexNodeInvSz: uniforms.uTexNodeInvSz,

        uTexEdgeLineSz: uniforms.uTexEdgeLineSz,
        uTexEdgeLineInvSz: uniforms.uTexEdgeLineInvSz,

        // Texture inputs
        uTexNodePos: uniforms.uTexNodePos,
        uTexNodeDesc: uniforms.uTexNodeDesc,
        uTexEdgeLines: uniforms.uTexEdgeLines,
      },
    });

    const lineMesh = new Mesh(lineGeom, lineMat);
    this.scene.add(lineMesh);

    const pointGeom = new Geometry({ drawMode: 'points' });
    pointGeom.drawRangeStart = 0;
    pointGeom.drawRangeLength = graph.nodeCount;

    const pointMat = new Material({
      vs: NodeVertShader,
      fs: NodeFragShader,
      depthTest: true,
      depthWrite: true,
      defines: {
        SHADER_NAME: 'NodeMat',
        GROUP_COUNT: uniforms.uVisible.value.length,
      },
      uniforms: {
        // Runtime
        uResolution: uniforms.uResolution,
        uAspectRatio: uniforms.uAspectRatio,

        // Node props
        uNodeScale: uniforms.uNodeScale,
        uNodeColor: uniforms.uNodeColor,
        uNodeRadius: uniforms.uNodeRadius,
        uNodeOpacity: uniforms.uNodeOpacity,
        uNodeUseColors: uniforms.uNodeUseColors,
        uNodeSmoothness: uniforms.uNodeSmoothness,

        // RenderTarget behaviour
        uZoom: uniforms.uZoom,
        uVisible: uniforms.uVisible,
        uTexPicker: uniforms.uNodeTexPicker,
        uNodePicking: uniforms.uNodePicking,
        uNodeSelected: uniforms.uNodeSelected,
        uNodeHighlighted: uniforms.uNodeHighlighted,

        // Texture props
        uTexNodeSz: uniforms.uTexNodeSz,
        uTexNodeInvSz: uniforms.uTexNodeInvSz,

        // Texture inputs
        uTexNodePos: uniforms.uTexNodePos,
        uTexNodeVel: uniforms.uTexNodeVel,
        uTexNodeDesc: uniforms.uTexNodeDesc,
      },
    });

    const pointMesh = new Mesh(pointGeom, pointMat);
    this._pointMesh = pointMesh;
    this.scene.add(pointMesh);

    // Init controls
    this.initControls();

    // Paint behaviour
    this.pixelPaintTarget = new Float32Array(graph.nodeDataTexSz * graph.nodeDataTexSz * 4);

    uniforms.uTexPainter.value = new Texture({
      image: new Float32Array(graph.nodeDataTexSz * graph.nodeDataTexSz * 4),
      type: 'float',
      target: 'texture2d',
      format: 'rgba',
      internalFormat: 'rgba32-float',
      width: graph.nodeDataTexSz,
      height: graph.nodeDataTexSz,
      alignment: 1,
      flipY: false,
      mipmaps: false,
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapU: 'repeat',
      wrapV: 'repeat',
      wrapW: 'repeat',
    });

    this._paintMesh = new Mesh(
      new FullscreenGeometry({ shape: 'tri' }),
      new Material({
        vs: SimPaintVertShader,
        fs: SimPaintFragShader,
        defines: {
          SHADER_NAME: 'PaintCompute',
        },
        uniforms: {
          uTexTarget: uniforms.uTexNodePos,
          uTexPainter: uniforms.uTexPainter,
          uTexTrgInvSz: uniforms.uTexNodeInvSz,
        },
        blendSrc: 'one',
        blendSrcAlpha: 'one',
        blendDst: 'one',
        blendDstAlpha: 'one',
      })
    );

    this._paintTarget = new RenderTarget({
      width: graph.nodeDataTexSz,
      height: graph.nodeDataTexSz,
      attachments: 1,
      type: 'float',
      target: 'texture2d',
      format: 'rgba',
      internalFormat: 'rgba16-half-float',
      alignment: 1,
      flipY: false,
      mipmaps: false,
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapU: 'repeat',
      wrapV: 'repeat',
      wrapW: 'repeat',
    });

    // Picking behaviour
    this._pickingTarget = new RenderTarget({
      width: 2,
      height: 2,
      attachments: 1,
      type: 'float',
      target: 'texture2d',
      format: 'rgba',
      internalFormat: 'rgba16-half-float',
      alignment: 1,
      flipY: false,
      mipmaps: false,
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapU: 'repeat',
      wrapV: 'repeat',
      wrapW: 'repeat',
    });

    uniforms.uTexPicker.value = new Texture({
      image: new Float32Array(2 * 4),
      type: 'float',
      target: 'texture2d',
      format: 'rgba',
      internalFormat: 'rgba16-half-float',
      width: 2,
      height: 2,
      alignment: 1,
      flipY: false,
      mipmaps: false,
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapU: 'repeat',
      wrapV: 'repeat',
      wrapW: 'repeat',
    });

    return;
  }

  /**
   * @desc
   * @see {@link CancellablePromise}
   *
   * @param resolve
   * @param _reject
   * @param _onCancel
   */
  public onLoad(resolve: (value: void | PromiseLike<void>) => void): void {
    const { graph, uniforms } = this;

    // Node & Edges
    uniforms.uNodeCount.value = graph.nodeCount;
    uniforms.uEdgeCount.value = graph.edgeCount;

    uniforms.uTexNodeSz.value = graph.nodeDataTexSz;
    uniforms.uTexNodeInvSz.value = 1 / graph.nodeDataTexSz;

    uniforms.uTexEdgeLineSz.value = graph.edgeLineTexSz;
    uniforms.uTexEdgeLineInvSz.value = 1 / graph.edgeLineTexSz;

    uniforms.uTexEdgeDataSz.value = graph.edgeDataTexSz;
    uniforms.uTexEdgeDataInvSz.value = 1 / graph.edgeDataTexSz;

    uniforms.uTexNodePos.value = graph.textures.uTexNodePos;
    uniforms.uTexNodeVel.value = graph.textures.uTexNodeVel;
    uniforms.uTexNodeDesc.value = graph.textures.uTexNodeDesc;

    uniforms.uTexEdgeLines.value = graph.textures.uTexEdgeLines;
    uniforms.uTexEdgeSrcAdjMap.value = graph.textures.uTexEdgeSrcAdjMap;
    uniforms.uTexEdgeTrgAdjMap.value = graph.textures.uTexEdgeTrgAdjMap;
    uniforms.uTexEdgeSrcAdjIdx.value = graph.textures.uTexEdgeSrcAdjIdx;
    uniforms.uTexEdgeTrgAdjIdx.value = graph.textures.uTexEdgeTrgAdjIdx;

    // Filters
    uniforms.uVisible.value = new Float32Array(graph.metadata.specialityId.size);
    uniforms.uVisible.value.fill(1);

    this.loadingSignal.fire();
    this.filterSignal.fire([...uniforms.uVisible.value]);
    resolve();
  }

  /**
   * @desc
   *
   * @param {RuntimeFrame} frame
   */
  public onRender(frame: RuntimeFrame): void {
    const { device, htmlCanvas, uniforms, scene, camControls, tooltipItem, selectedItem } = this;
    uniforms.uTimeStamp.value = frame.runtime;
    uniforms.uTimeDelta.value = frame.deltaTime;

    let needsUpdate: boolean = frame.id <= 2 || this.needsUpdate;
    if (uniforms.uTemperature.value >= 1e-2) {
      uniforms.uTemperature.value *= uniforms.uDecay.value;

      this._velCompute.compute(device);
      this._posCompute.compute(device);
      needsUpdate = true;
    }

    const graph = this._graph;
    const camera = camControls.camera;
    const inputTarget = this._inputTarget;
    needsUpdate = camControls.update() || needsUpdate;
    uniforms.uZoom.value = camControls.zoomScale;

    if ((inputTarget.action & GraphInputAction.Build) === GraphInputAction.Build) {
      inputTarget.action &= ~GraphInputAction.Build;

      device.setRenderTarget(this._paintTarget);
      device.clear();
      device.drawObject(this._paintMesh, camera);

      const texture = this.pixelPaintTarget;
      device.readPixels(0, 0, graph.nodeDataTexSz, graph.nodeDataTexSz, 'rgba', 'float', texture);

      graph.saveState(texture);
    }

    if ((inputTarget.action & GraphInputAction.Retarget) === GraphInputAction.Retarget) {
      if (typeof inputTarget.selection === 'number') {
        device.setRenderTarget(this._paintTarget);
        device.clear();
        device.drawObject(this._paintMesh, camera);

        const texture = this.pixelPaintTarget;
        device.readPixels(0, 0, graph.nodeDataTexSz, graph.nodeDataTexSz, 'rgba', 'float', texture);

        const id = inputTarget.selection * 4;
        camera.position.set(texture[id + 0], texture[id + 1], 1);
        camera.updateTransform();
        needsUpdate = true;
      }

      inputTarget.selection = null;
      inputTarget.action &= ~GraphInputAction.Retarget;
    }

    const reqSelect = !camControls.isPanning && (inputTarget.action & GraphInputAction.Select) === GraphInputAction.Select;
    const reqTooltip =
      (!camControls.isPanning && (inputTarget.action & GraphInputAction.Tooltip) === GraphInputAction.Tooltip) ||
      (uniforms.uNodeHighlighted.value >= 0.0 && needsUpdate);

    if (reqSelect || reqTooltip) {
      const inputPos = inputTarget.position;
      camera.setWindow(inputPos[0], inputPos[1], 1, 1, htmlCanvas.width, htmlCanvas.height).updateTransform();

      uniforms.uNodePicking.value = 1;
      device.setRenderTarget(this._pickingTarget);
      device.clear();
      device.drawObject(this._pointMesh, camera);
      uniforms.uNodePicking.value = 0;

      const data = this.pixelPickingTarget;
      device.readPixels(0, 0, 1, 1, 'rgba', 'float', data);

      camera.viewWindow = null;
      camera.updateTransform();

      if (data[3] > 0.0) {
        const sz = uniforms.uTexNodeSz.value;
        const vId = (data[1] * sz + data[0]) * sz;
        if (reqTooltip) {
          const node = this._graph.getNodeById(vId) ?? null;
          if (tooltipItem.value !== node) {
            tooltipItem.value = node ? { target: node, position: inputPos.clone() } : null;
            needsUpdate = true;
          }
        }

        if (reqSelect) {
          const node = this._graph.getNodeById(vId) ?? null;
          if (selectedItem.value !== node) {
            selectedItem.value = node;
            needsUpdate = true;
          }
        }
      } else {
        if (reqTooltip && tooltipItem.value) {
          tooltipItem.value = null;
          needsUpdate = true;
        }

        if (reqSelect) {
          selectedItem.value = null;
        }
      }
      inputTarget.action = inputTarget.action & ~GraphInputAction.Tooltip & ~GraphInputAction.Select;
    }

    if (needsUpdate) {
      device.setRenderTarget(null);
      device.clear();
      scene.draw(device, camera);
      camera.toggleUpdateReq(TransformUpdate.Rendering, false);
      this.needsUpdate = false;
    }
  }

  /**
   * @desc
   */
  public onDeinit(): void {}

  /**
   * @desc
   *
   * @param {Array<number>} drawBufferSize
   */
  public onViewportChanged(drawBufferSize: [number, number]): void {
    if (!this.isInitialised()) {
      return;
    }

    const res = this.uniforms.uResolution.value as Vec2;
    if (!res.approximately(drawBufferSize)) {
      this.device.copyDrawBufferSize<Vec2>(res);

      const aspect = drawBufferSize[0] / drawBufferSize[1];
      this.uniforms.uAspectRatio.value = aspect;
      this.camera.left = -aspect;
      this.camera.right = aspect;
      this.needsUpdate = true;
    }
  }

  /**
   * @desc
   *
   * @param {any} err
   */
  public onError(err: any): void {
    console.error('[ERR]', err);
  }

  /**
   * @desc
   */
  private initControls(): void {
    // Init input manager
    const device = this.device;
    const canvas = this.canvas as HTMLElement;
    const inputTarget = this._inputTarget;

    const inputs = new InputController(canvas);
    this.inputControls = inputs;

    const ignoreContext = (e: MouseEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    canvas.addEventListener('contextmenu', ignoreContext);
    this._disposables.push(() => canvas.removeEventListener('contextmenu', ignoreContext));

    const gestureBinding = inputs.gestureSignal.connect((gesture: InputGesture, _state: InputState, ...args: any[]): void => {
      switch (gesture) {
        case InputGesture.KeyPress:
          {
            const keyCode = args?.[0] as string;
            if (keyCode === 'Backquote' && (device.props.logLevel & LogLevel.Debug) === LogLevel.Debug) {
              inputTarget.action |= GraphInputAction.Build;
            }
          }
          break;

        // Select/Highlight target
        case InputGesture.LeftClick:
          {
            const input = args?.[0] as InputObject;
            if (typeof input === 'undefined') {
              break;
            }

            if (input != inputTarget.target) {
              inputTarget.target = input;
            }
            inputTarget.device = InputDevice.MouseKeyboard;
            inputTarget.action |= GraphInputAction.Select;
            inputTarget.position.copy(input.position);
          }
          break;

        case InputGesture.Tap:
          {
            const touchState = args?.[0] as TouchState | undefined;
            if (typeof touchState === 'undefined') {
              break;
            }

            const inputObject = touchState?.touch0;
            if (inputObject != inputTarget.target) {
              inputTarget.target = inputObject;
            }
            inputTarget.device = InputDevice.Touch;
            inputTarget.action |= GraphInputAction.Select;
            inputTarget.position.copy(inputObject.position);
          }
          break;

        // Tooltip
        case InputGesture.Press:
          {
            const touchState = args?.[0] as TouchState | undefined;
            if (typeof touchState === 'undefined') {
              break;
            }

            const inputObject = touchState?.touch0;
            if (inputObject != inputTarget.target) {
              inputTarget.target = inputObject;
            }
            inputTarget.device = InputDevice.Touch;
            inputTarget.action |= GraphInputAction.Tooltip;
            inputTarget.position.copy(inputObject.position);
          }
          break;

        default:
          break;
      }
    });

    const eventBinding = inputs.eventSignal.connect((state: InputState, action: InputAction, input?: InputObject) => {
      if (!(input instanceof Object)) {
        return;
      }

      // Mouse handler for hovering nodes
      if (action === InputAction.MouseMove && input.position.isAbsolute() && !input.position.approximately(inputTarget.position, 1)) {
        if (input != inputTarget.target) {
          inputTarget.target = input;
        }

        inputTarget.device = InputDevice.MouseKeyboard;
        inputTarget.action |= GraphInputAction.Tooltip;
        inputTarget.position.copy(input.position);
      } else if (action === InputAction.TouchHold && state === InputState.Began) {
        this.tooltipItem.value = null;
      }
    });
    this._disposables.push(gestureBinding, eventBinding);

    // Init camera controller
    const aspect = this.device.aspectRatio;
    const camCtrls = OrthoCamControls.WithInputControls(inputs, {
      zoom: 0.035,
      minZoom: 1e-2,
      maxZoom: 2,
      left: -aspect,
      right: aspect,
    });
    this.camera = camCtrls.camera;
    this.camControls = camCtrls;

    // Init action handler
    const uniforms = this.uniforms;
    this.selectedItem.changedSignal.connect((value: INode | null) => {
      inputTarget.action |= GraphInputAction.Retarget;
      inputTarget.selection = value ? value.id : null;

      uniforms.uNodeSelected.value = value ? value.id : -1.0;
      this.needsUpdate = true;
    });

    this.tooltipItem.changedSignal.connect((value: GraphTargetNode | null) => {
      uniforms.uNodeHighlighted.value = value ? value.target.id : -1.0;
      this.needsUpdate = true;
    });
  }
}
