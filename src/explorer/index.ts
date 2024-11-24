import * as Utils from './common/utils'
import * as VecUtils from './common/vecUtils'
import * as QuatUtils from './common/quatUtils'

import InputService from './services/InputService'
import ViewportService from './services/ViewportService'

import AtlasAxes from './objects/axes'
import CameraController from './controllers/CameraController'

import NodeVertShader from '@/shaders/node/node.vert?raw'
import NodeFragShader from '@/shaders/node/node.frag?raw'

import CancellablePromise from './common/cancellablePromise'

import { AxisObject } from './objects/axes/types'
import { Const, World, Workspace } from './constants'
import { AtlasLoader, AtlasData } from './objects/loader'
import {
  AtlasGeom, AtlasRecord, AtlasSelection,
  AtlasSpeciality, AtlasTooltipTarget, AxisToggleTarget,
  DisposableItem, FilterType, InputButton, InputObject,
  InputState, InputType, ExplorerOpts
} from './types'

import * as Three from 'three'
import * as Tweener from 'three/examples/jsm/libs/tween.module.js'
import * as Css2d from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { Setter } from 'solid-js'

/**
 * Explorer
 * @desc Top-level manager of the Atlas Explorer's renderer, scene & interface
 */
export default class Explorer {
  /* Misc */
  private disposables: DisposableItem[] = [];

  /* Services */
  private viewport!: ViewportService;
  private inputService!: InputService;

  /* Controllers */
  private cameraController!: CameraController;

  /* Renderers */
  private renderer!: Three.WebGLRenderer;
  private labelRenderer!: Css2d.CSS2DRenderer;

  /* Scene */
  private model!: AtlasGeom;
  private dataset!: AtlasData;
  private camera!: Three.PerspectiveCamera;
  private raycaster!: Three.Raycaster;
  private atlasAxes!: AtlasAxes;
  private readonly scene = new Three.Scene();

  /* State */
  private ready: boolean = false;
  private themeColor!: number;

  private pointer: Three.Vector2 = new Three.Vector2();
  private selection?: AtlasSelection;

  private lastMovementInteraction?: number;

  /* Animation */
  private activeFocusTween: CancellablePromise<void> | null = null;

  /* Handlers */
  private targetHandler?: Setter<AtlasRecord | null>;
  private tooltipHandler?: Setter<AtlasTooltipTarget | null>;

  /* Constructor */
  public constructor(opts?: ExplorerOpts) {
    opts = { ...Workspace.AtlasExplorerDefaults, ...opts};
    this.initialise(opts);
  }

  /* Getter(s) */
  public get canvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  public get labelContext(): HTMLElement {
    return this.labelRenderer.domElement;
  }

  public get records(): AtlasRecord[] {
    return this.dataset?.records || [];
  }

  public get specialities(): AtlasSpeciality[] {
    return this.dataset?.specialities || [];
  }

  public GetTarget(outPosition?: Three.Vector3): AtlasRecord | null {
    if (!this.model || !this.dataset) {
      return null;
    }

    let target: AtlasRecord | null = null;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObject(this.model.Object);
    if (intersects.length > 0) {
      const material = this.model.Object.material as Three.ShaderMaterial;
      for (let i = 0; i < intersects.length; ++i) {
        const { index: hitIndex } = intersects[i];
        if (typeof hitIndex === 'undefined') {
          continue;
        }

        const record = this.dataset.records?.[hitIndex];
        if (!record) {
          continue;
        }

        const isVisible = material.uniforms.uVisible.value?.[record.SpecialityId];
        if (isVisible) {
          target = this.dataset.records?.[hitIndex];

          if (outPosition) {
            outPosition.copy(intersects[0].point);
          }

          break;
        }
      }
    }

    return target;
  }

  public GetRelationships(organ: string): AtlasRecord[]  {
    const relationships = this.dataset?.relationships?.[organ];
    if (!relationships) {
      return [];
    }

    const resultset = relationships.RecordIds.reduce<AtlasRecord[]>((res, idx) => {
      const record = this.dataset.records?.[idx];
      if (record) {
        res.push(record);
      }

      return res;
    }, []);

    resultset.sort((a: AtlasRecord, b: AtlasRecord) => {
      return a.Name.toLowerCase().localeCompare(b.Name.toLowerCase());
    });

    return resultset;
  }

  /* Setter(s) */
  public SetRoot(targets: { Root?: HTMLElement, CanvasRoot?: HTMLElement, LabelRoot?: HTMLElement }): Explorer {
    if (targets.Root) {
      this.SetLabelRoot(targets.Root);
      this.SetCanvasRoot(targets.Root);

      return this;
    }

    if (targets.CanvasRoot) {
      this.SetCanvasRoot(targets.CanvasRoot);
    }

    if (targets.LabelRoot) {
      this.SetLabelRoot(targets.LabelRoot);
    }

    return this;
  }

  public SetCanvasRoot(root: HTMLElement): Explorer {
    root.appendChild(this.canvas);
    return this;
  }

  public SetLabelRoot(root: HTMLElement): Explorer {
    root.appendChild(this.labelContext);
    return this;
  }

  public SetTheme(theme: string): Explorer {
    if (World.Theme.hasOwnProperty(theme)) {
      this.themeColor = World.Theme[theme];
    } else {
      this.themeColor = World.Theme.dark;
    }

    if (this?.renderer && this?.scene?.fog) {
      this.scene.fog.color = new Three.Color(this.themeColor);
    }

    return this;
  }

  public SetTargetHandler(handle?: Setter<AtlasRecord | null>): Explorer {
    this.targetHandler = handle;
    return this;
  }

  public SetTooltipHandler(handle?: Setter<AtlasTooltipTarget | null>): Explorer {
    this.tooltipHandler = handle;
    return this;
  }

  public SetFilter(filterType: FilterType, ...params: any[]): Explorer {
    if (!this.model) {
      return this;
    }

    switch (filterType) {
      case FilterType.AxesToggle: {
        if (this.atlasAxes) {
          this.atlasAxes.SetVisibility(params[0] as Record<AxisToggleTarget, boolean>);
        }
      } break;

      case FilterType.SpecialityFilter: {
        const material = this.model.Object.material as Three.ShaderMaterial;
        const visibleMap = params[0] as Record<number, boolean>;
        for (let i = 0; i < material.uniforms.uVisible.value.length; ++i) {
          material.uniforms.uVisible.value[i] = !!visibleMap[i];
        }
        material.needsUpdate = true;

      } break;
    }
    return this;
  }

  public FocusTarget(target: AtlasRecord | null, point?: Three.Vector3): void {
    if (!this.targetHandler || !this.model) {
      return;
    }

    const material = this.model.Object.material as Three.ShaderMaterial;
    material.uniforms.uFocused.value = target ? target.Id : -1;
    material.needsUpdate = true;
    this.targetHandler(target);

    if (target) {
      if (!point) {
        const points = this.model?.Points;
        if (!points) {
          return;
        }

        const index = target.Id*4;
        if (index >= points.length) {
          return;
        }

        const vx = points?.[index + 0],
              vy = points?.[index + 1],
              vz = points?.[index + 2];
        if (typeof vx !== 'number' || typeof vy !== 'number' || typeof vz !== 'number') {
          return;
        }

        point = this.model.Object.localToWorld(new Three.Vector3(vx, vy, vz));
      }

      if (this.activeFocusTween && !this.activeFocusTween.isComplete) {
        this.activeFocusTween.cancel();
      }

      const focusTween = this.cameraController.TweenToTarget(point, World.FocusZoomDistance);
      this.activeFocusTween = focusTween;

      focusTween
        .catch((err) => {
          if (err instanceof Object && err.constructor == Object && err.wasCancelled) {
            return;
          }

          console.error(err);
        })
        .finally(() => {
          if (this.activeFocusTween === focusTween) {
            this.activeFocusTween = null;
          }
        });
    }
  }

  public UpdateTooltipHandle(): Explorer {
    this.updateTooltipCoordinate();
    return this;
  }

  public ResetCamera(): Explorer {
    const offset = new Three.Vector3(0, 0, 0);
    if (this.dataset && this.model) {
      if (!this.model.Object.boundingBox) {
        this.model.Object.computeBoundingBox();
      }

      const bbox = this.model.Object.boundingBox!;
      const origin = bbox.getCenter(new Three.Vector3());
      offset.add(bbox.max)
        .sub(bbox.min);

      offset.set(Math.abs(offset.x), Math.abs(offset.y), Math.abs(offset.z))
        .multiplyScalar(0.5)
        .add(origin);

      const quat = QuatUtils.quatLookAt(offset, origin);
      this.camera.applyQuaternion(quat);
      this.camera.position.set(offset.x, offset.y, offset.z);
      this.cameraController.target = new Three.Vector3(0, this.dataset.yAxisScale.Min, 0);
    } else {
      offset.copy(World.Camera.origin);
    }

    if (this.model) {
      const material = this.model.Object.material as Three.ShaderMaterial;
      material.uniforms.uFocused.value = -1;
      material.needsUpdate = true;
    }

    this.cameraController.Update(true);

    if (this.atlasAxes) {
      this.atlasAxes.Update(this.camera);
    }

    return this;
  }

  /* Cleanup */
  public dispose(): void {
    for (let i = 0; i < this.disposables.length; ++i) {
      try {
        this.disposables[i]();
      }
      catch (e) {
        console.warn(`Disposable failed: ${e}`);
      }
    }

    this.canvas.remove();
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
  }

  /* Initialisers & private methods */
  private initialise(opts: ExplorerOpts): void {
    // Initialise base
    this.SetTheme(opts.Theme || 'dark');
    if (opts.Interaction) {
      this.SetTargetHandler(opts.Interaction.TargetSetter)
        .SetTooltipHandler(opts.Interaction.TooltipSetter);
    }

    // Build scene
    this.createScene();

    // Build renderer context(s)
    this.renderer = new Three.WebGLRenderer({
      canvas: opts?.Canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'default',
      preserveDrawingBuffer: true,
    });

    this.renderer.toneMapping = World.Scene.toneMapping;
    this.renderer.outputColorSpace = World.Scene.outputColorSpace;
    this.renderer.toneMappingExposure = World.Scene.toneMappingExposure;
    this.renderer.shadowMap.type = Three.PCFSoftShadowMap;
    this.renderer.shadowMap.enabled = true;

    this.labelRenderer = new Css2d.CSS2DRenderer();
    this.labelRenderer.setSize(this.viewport.size.width, this.viewport.size.height);

    let labelContainer: HTMLElement
    if (opts.Parent) {
      labelContainer = opts.Parent;
    } else {
      const canvas = opts.Canvas || this.renderer.domElement;
      if (canvas && canvas.parentElement) {
        labelContainer = canvas.parentElement;
      } else {
        labelContainer = document.body;
      }
    }
    labelContainer.appendChild(this.labelRenderer.domElement);

    if (opts.Appearance) {
      Utils.applyAppearance(this.renderer.domElement, opts.Appearance.Canvas);
      Utils.applyAppearance(this.labelRenderer.domElement, opts.Appearance.Drawing);
    }

    this.raycaster = new Three.Raycaster();
    this.raycaster.params.Line.threshold = 0.10;
    this.raycaster.params.Mesh.threshold = 0.05;

    // @ts-ignore
    this.onViewportResize(...Object.values(this.viewport.size));
    this.viewport.Connect(this.onViewportResize.bind(this));

    this.bindControls();
    this.bindInteraction();

    const renderLoop = this.render.bind(this);
    this.renderer.setAnimationLoop((time: number) => renderLoop(time));
  }

  private render(_time?: number, forceUpdate?: boolean): void {
    const needsUpdate = !!forceUpdate || this.cameraController.ConsumeUpdate();
    if (needsUpdate) {
      this.updateTooltipCoordinate(true);
    }

    if (this.atlasAxes) {
      const hasAxisTarget = this.atlasAxes.ConsumeUpdate() || !!this.atlasAxes.HasTarget();
      if (needsUpdate || hasAxisTarget) {
        this.atlasAxes.Update(this.camera);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private createScene(): void {
    // Initialise base
    this.viewport = new ViewportService();
    this.disposables.push(this.viewport.dispose.bind(this.viewport));

    const { Fog: WorldFog, Camera: WorldCamera } = World;
    this.scene.fog = new Three.Fog(this.themeColor, WorldFog.nearDistance, WorldFog.farDistance);

    this.camera = new Three.PerspectiveCamera(WorldCamera.fieldOfView, this.viewport.size.ratio, WorldCamera.nearPlane, WorldCamera.farPlane);
    this.camera.position.copy(WorldCamera.origin);

    // Load dataset & add geometry
    const loader = new AtlasLoader();
    loader.loadWithOpts({
      url: 'data/explorer-data.json',
      onLoad: (data: AtlasData) => {
        // Instantiate atlas data geometry
        const model = data.Instantiate({
          ShaderProps: {
            uniforms: {
              uColors: { value: data.colorMap },
              uVisible: { value: new Uint8Array(data.colorMap.length).fill(1) },
              uFocused: { value: Number(-1.0) }
            },
            defines: {
              MAP_COUNT: data.colorMap.length,
            },
            vertexShader: NodeVertShader,
            fragmentShader: NodeFragShader,
            wireframe: false,
            depthTest: true,
            depthWrite: true,
            side: Three.FrontSide,
          }
        });

        this.model = model;
        this.model.Object.scale.set(0, 0, 0);

        this.dataset = data;
        this.scene.add(this.model.Object);
        this.disposables.push(this.model.dispose);

        // Build axes
        const axes = new AtlasAxes({
          RadialAxis: {
            Range: {
              Min: data.xAxisScale.Min,
              Max: data.xAxisScale.Max,
            },
            Scale: data.xAxisScale,
            Height: data.yAxisScale.Min,
            Offset: 0,
          },
          VerticalAxis: {
            Range: {
              Min: Math.pow(10, data.yAxisScale.Min / 10),
              Max: Math.pow(10, data.yAxisScale.Max / 10),
            },
            Scale: data.yAxisScale,
          },
          AxisHelper: {
            Scale: data.xAxisScale,
            Size: (data.xAxisScale.Max - data.xAxisScale.Min)*2,
            Origin: new Three.Vector3(0, data.yAxisScale.Min, 0),
          },
        });

        this.atlasAxes = axes;
        this.atlasAxes.scale.set(0, 0, 0);
        this.scene.add(axes);
        this.disposables.push(this.atlasAxes.dispose.bind(this.atlasAxes));

        // Reorient client view
        this.ResetCamera();

        // Start animation
        this.animateScene();
      },
      scale: {
        y: (value): number => {
          return Math.log10(value)*10;
        },
      }
    });
  }

  private animateScene(): void {
    const axes = this.atlasAxes;
    const points = this.model.Object;

    const axesTween = new Tweener.Tween(axes.scale)
      .to(new Three.Vector3(1, 1, 1), World.SceneAxesTweenAnimation)
      .easing(Tweener.Easing.Cubic.Out)
      .interpolation(Tweener.Interpolation.Linear)
      .start();

    const pointsTween = new Tweener.Tween(points.scale)
      .to(new Three.Vector3(1, 1, 1), World.ScenePointsTweenAnimation)
      .easing(Tweener.Easing.Elastic.Out)
      .delay(World.ScenePointsTweenDelay)
      .start();

    axesTween.chain(pointsTween).start();

    const updateFrame = () => {
      try {
        if (!axesTween.isPlaying() && !pointsTween.isPlaying()) {
          this.ready = true;
          this.cameraController.enabled = true;

          axes.scale.copy(Const.OneVector);
          points.scale.copy(Const.OneVector);
          return;
        }

        axesTween.update();
        pointsTween.update();
      }
      catch (e) {
        console.error(`Fallback to main render loop after scene animation err: ${e}`);
        this.ready = true;
        this.cameraController.enabled = true;
        return;
      }

      requestAnimationFrame(updateFrame);
    };

    requestAnimationFrame(updateFrame);
  }

  private bindControls(): void {
    this.cameraController = new CameraController({ Camera: this.camera, DomElement: this.renderer.domElement });
    this.cameraController.enabled = false;
    this.cameraController.dampingEnabled = true;
    this.cameraController.maxPolarAngle = 1.5;
    this.cameraController.minPolarAngle = 0.5;
    this.cameraController.zoomEnabled = true;
    this.cameraController.panEnabled = true;
    this.ResetCamera();
  }

  private bindInteraction(): void {
    this.inputService = new InputService({
      Canvas: this.renderer.domElement,
    });

    let lastClickInput: InputObject | null;
    let currentTarget: AtlasRecord | null;
    let touchTimeout: NodeJS.Timeout | null;
    this.inputService.Connect('InputChanged', (_eventName: string, inputObject: InputObject) => {
      if (!this.ready) {
        return;
      }

      const isTouchEvent = inputObject.Type === InputType.Touch;
      if (!isTouchEvent && inputObject.Button === InputButton.Right) {
        return;
      }

      this.pointer.set(inputObject.Position.x, inputObject.Position.y);
      this.viewport.ToNormalDeviceCoordinate(this.pointer);

      switch (inputObject.State) {
        case InputState.Moved: {
          if (!isTouchEvent) {
            this.onMouseMoved();
          }
        } break;

        case InputState.Down: {
          if (this.targetHandler) {
            if (!isTouchEvent) {
              currentTarget = this.GetTarget();
            } else {
              const touchPosition = this.pointer.clone();
              touchTimeout = setTimeout(() => {
                if (this.pointer.distanceToSquared(touchPosition) < World.FocusLossDistance) {
                  currentTarget = this.GetTarget();
                  this.onMouseMoved()
                }
              }, World.TouchLongPressDuration);
            }
          }
          lastClickInput = inputObject;
        } break;

        case InputState.Up: {
          if (touchTimeout) {
            clearTimeout(touchTimeout);
          }
          touchTimeout = null;

          if (this.targetHandler && lastClickInput && inputObject.Id === inputObject.Id) {
            const point = new Three.Vector3();
            if (lastClickInput.Position.distanceToSquared(inputObject.Position) < World.FocusLossDistance && currentTarget === this.GetTarget(point)) {
              this.FocusTarget(currentTarget, point);
            }
          }

          currentTarget = null;
          lastClickInput = null;
        } break;
      }
    });

    this.disposables.push(this.inputService.dispose.bind(this.inputService));
  }

  /* Interaction(s) & Handler(s) */
  private onViewportResize(width: number, height: number, ratio: number): void {
    this.camera.aspect = ratio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.labelRenderer.setSize(width, height);
  }

  private getTooltipTarget(index: number | undefined, point: Three.Vector3): AtlasSelection | undefined {
    if (typeof index !== 'number') {
      return undefined;
    }

    const hitRecord = this.dataset.records?.[index];
    if (hitRecord) {
      const isVisible = (this.model.Object.material as Three.ShaderMaterial).uniforms.uVisible.value?.[hitRecord.SpecialityId];
      if (!isVisible) {
        return undefined;
      }

      const pIndex = index*4;
      const points = this.model.Points;
      const vIndices = [ pIndex + 0, pIndex + 1, pIndex + 2 ];

      const hitPosition = point.clone().set(
        points[vIndices[0]],
        points[vIndices[1]],
        points[vIndices[2]]
      );
      this.model.Object.localToWorld(hitPosition);

      return {
        Index: index,
        Record: hitRecord,
        Origin: hitPosition,
        Indices: vIndices,
        Coordinate: new Three.Vector2(),
      };
    }

    return undefined;
  }

  private onMouseMoved(): void {
    if (!this.model || !this.atlasAxes) {
      return;
    }

    let selectionTarget: AtlasSelection | undefined;
    let radialAxisTarget: Three.Vector3 | undefined;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.lastMovementInteraction = performance.now();

    const atlasAxes    = this.atlasAxes,
          pointsObject = this.model.Object;

    const intersects = this.raycaster.intersectObjects([ pointsObject, ...atlasAxes.GetInteractable() ]);
    if (intersects.length) {
      for (let i = 0; i < intersects.length; ++i) {
        const { object, index, point } = intersects[i];
        switch (object.type) {
          case 'InstancedPoints': {
            selectionTarget = this.getTooltipTarget(index, point);
            if (selectionTarget) {
              if (!this.selection || this.selection.Index !== selectionTarget.Index) {
                const data = pointsObject.geometry.getAttribute('data');
                if (this.selection) {
                  data.array[this.selection.Index] = Utils.packAtlasObject(this.selection.Record.Id, this.selection.Record.SpecialityId, 0);
                }

                if (this.selection != selectionTarget) {
                  data.array[selectionTarget.Index] = Utils.packAtlasObject(selectionTarget.Record.Id, selectionTarget.Record.SpecialityId, 1);
                }
                data.needsUpdate = true;
                this.selection = selectionTarget;

                if (this.tooltipHandler) {
                  VecUtils.toScreenSpace(this.selection.Origin, this.camera, this.viewport.size, this.selection.Coordinate);

                  this.tooltipHandler({
                    Position: this.selection.Coordinate,
                    Selection: this.selection,
                  });
                }
              }
            }
          } break;

          case 'AxisLine': {
            radialAxisTarget = point;
            this.atlasAxes.SetTarget((object as AxisObject).axisTarget, radialAxisTarget);
          } break;

          default:
            break;
        }

        if (!!radialAxisTarget || selectionTarget) {
          break;
        }
      }
    }

    if (!selectionTarget && this.selection) {
      const data = pointsObject.geometry.getAttribute('data');
      data.array[this.selection.Index] = Utils.packAtlasObject(this.selection.Record.Id, this.selection.Record.SpecialityId, 0);
      data.needsUpdate = true;
      this.selection = undefined;

      if (this.tooltipHandler) {
        this.tooltipHandler(null);
      }
    }

    if (!radialAxisTarget) {
      atlasAxes.ResetTarget();
    }
  }

  private updateTooltipCoordinate(isInternalCall: boolean = false): void {
    if (!this.tooltipHandler || !this.model) {
      return;
    }

    const selection = this.selection;
    if (!selection) {
      return;
    }

    if (isInternalCall) {
      const lastInteraction = this.lastMovementInteraction;
      if (lastInteraction && performance.now() - lastInteraction < World.TooltipMinUpdateInterval) {
        return;
      }
    }

    const worldOrigin = selection.Origin;
    const screenCoord = selection.Coordinate;
    const targetCoord = VecUtils.toScreenSpace(worldOrigin, this.camera, this.viewport.size);
    if (targetCoord.distanceToSquared(screenCoord) >= World.TooltipOffsetThreshold) {
      this.tooltipHandler({ Position: { x: targetCoord.x, y: targetCoord.y }, Selection: selection });
      screenCoord.copy(targetCoord);
    }
  }
};
