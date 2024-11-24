import * as Three from 'three'
import * as rx from 'rxjs'

import InstancedPoints from './instancedPoints'

import {
  IAtlasData, AtlasRecord, AtlasObject,
  AlLoadedCallback, AlProgressCallback,
  AlErrCallback, AtlasSpeciality, AtlasTarget,
  AtlasBuildOptions, AtlasLoadOptions, AtlasGeom,
  AlScalingOpt, AlAxisScale, AlDataRange,
  AtlasViewState
} from '../types'

import { Const, World, Workspace } from '../constants'
import { rotatePointAroundOrigin } from '../common/vecUtils'
import {
  toFixedFloat, packAtlasColRef,
  getScalerFn, packAtlasObject, computeAxisScale
} from '../common/utils'

/**
 * AtlasPlane
 * @desc An object describing the parsed resultset from the Atlas JSON resource
 */
class AtlasData implements IAtlasData {
  private bbox?: Three.Box3;

  private minBounds: Three.Vector3 = new Three.Vector3( Infinity,  Infinity,  Infinity);
  private maxBounds: Three.Vector3 = new Three.Vector3(-Infinity, -Infinity, -Infinity);

  public xDataRange!: AlDataRange;
  public yDataRange!: AlDataRange;
  public zDataRange!: AlDataRange;

  public xAxisScale!: AlAxisScale;
  public yAxisScale!: AlAxisScale;
  public zAxisScale!: AlAxisScale;

  public specialities!: AtlasSpeciality[];
  public relationships!: Record<string, AtlasTarget>;

  private viewState: rx.Subject<AtlasViewState> = new rx.Subject();
  private currentView: AtlasViewState = AtlasViewState.RadialView;

  public constructor(
    public points    : number[]      = [],
    public records   : AtlasRecord[] = [],
    public reference : number[]      = [],
    public colorMap  : number[]      = []
  ) { }

  public get currentViewState(): AtlasViewState {
    return this.currentView;
  }

  public set currentViewState(value: AtlasViewState) {
    if (this.currentView !== value) {
      this.viewState.next(value);
      this.currentView = value;
    }
  }

  public get boundingBox(): Three.Box3 {
    if (!this.bbox) {
      this.bbox = new Three.Box3(this.minBounds.clone(), this.maxBounds.clone())
    }

    return this.bbox!;
  }

  public AddRecord(record: AtlasRecord, radialVert: Three.Vector3, scatterVert: Three.Vector3, scale: number): AtlasData {
    const { Id, SpecialityId } = record;

    const index = Id*7;
    this.records[Id] = record;
    this.reference[Id] = packAtlasObject(Id, SpecialityId, false);

    // Interleaved
    this.points[index + 0] = radialVert.x;
    this.points[index + 1] = radialVert.y;
    this.points[index + 2] = radialVert.z;
    this.points[index + 3] = scatterVert.x;
    this.points[index + 4] = scatterVert.y;
    this.points[index + 5] = scatterVert.z;
    this.points[index + 6] = scale;

    this.minBounds.min(radialVert);
    this.maxBounds.max(radialVert);

    return this;
  }

  public AddColorMapping(colorValue: number): AtlasData {
    const color = new Three.Color(colorValue);
    this.colorMap.push(color.r, color.g, color.b);
    return this;
  }

  public ResizeToFit(recordLen: number): AtlasData {
    this.points = Array(recordLen*7).fill(0);
    this.records = Array(recordLen);
    this.reference = Array(recordLen).fill(0);

    return this;
  }

  public SetSpecialities(specialities: Record<string, AtlasSpeciality>): AtlasData {
    this.specialities = Object.values(specialities);
    return this;
  }

  public SetRelationships(relationships: Record<string, AtlasTarget>): AtlasData {
    this.relationships = relationships;
    return this;
  }

  public SetAxisScale(axis: string, scale: AlAxisScale): AtlasData {
    axis = axis.toLowerCase();

    switch (axis) {
      case 'x':
        this.xAxisScale = scale;
        break;

      case 'y':
        this.yAxisScale = scale;
        break;

      case 'z':
        this.zAxisScale = scale;
        break;

      default:
        break;
    }

    return this;
  }

  public SetAxisRange(axis: string, min: number, max: number): AtlasData {
    axis = axis.toLowerCase();

    switch (axis) {
      case 'x':
        this.xDataRange = { Min: min, Max: max };
        break;

      case 'y':
        this.yDataRange = { Min: min, Max: max };
        break;

      case 'z':
        this.zDataRange = { Min: min, Max: max };
        break;

      default:
        break;
    }

    return this;
  }

  public Observe(): rx.Observable<AtlasViewState> {
    return this.viewState.asObservable();
  }

  public Instantiate(opts?: AtlasBuildOptions): AtlasGeom {
    if (!opts) {
      opts = { };
    }

    const points = Float32Array.from(this.points),
            data = Uint32Array.from(this.reference);

    this.viewState.next(AtlasViewState.RadialView);

    const material = new Three.ShaderMaterial(opts.ShaderProps);
    const object = new InstancedPoints(points, data, material);
    object.position.setY(-this.yAxisScale.Min);
    object.computeBoundingSphere();
    object.frustumCulled = true;

    return {
      // Attr
      Data: data,
      Points: points,
      // Geom
      Object: object,
      Material: material,
      Geometry: object.geometry,
      // Disposable
      dispose: (): void => {
        object.removeFromParent();
        object.geometry.dispose();
        material.dispose();
      },
    };
  }
}

/**
 * AtlasLoader
 * @desc An extension of the `Three.Loader` to load the Atlas JSON resource
 */
class AtlasLoader extends Three.Loader {
  public constructor(manager?: Three.LoadingManager) {
    super(manager);
  }

  public load(url: string, onLoad: AlLoadedCallback, onProgress?: AlProgressCallback, onError?: AlErrCallback): void {
    return this.loadWithOpts({
      url: url,
      onLoad: onLoad,
      onProgress: onProgress,
      onError: onError
    });
  }

  public loadWithOpts(opts: AtlasLoadOptions): void {
    const { url, onLoad, onProgress, onError, scale } = opts;

    const loader = new Three.FileLoader(this.manager);
    loader.setPath('');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(url, (text) => {
      try {
        if (typeof text !== 'string') {
          throw Error(`expected file at URL<${url}> to resolve as 'string' type but got ${typeof text}`);
        }

        const data = this.parse(text, scale);
        onLoad(data);
      }
      catch (err) {
        if (onError) {
          onError(err);
        } else {
          console.error(err);
        }
        this.manager.itemError(url);
      }
    }, onProgress, onError);
  }

  private parse(text: string, scaling?: AlScalingOpt): AtlasData {
    const datapoints = JSON.parse(text) as AtlasRecord[];
    const parsedData = new AtlasData();

    const records: AtlasRecord[] = [];
    const targets: Record<string, AtlasTarget> = {};
    const specialities: Record<string, AtlasSpeciality> = {};

    // Map Atlas speciality & organ targets
    let col: Three.Color = new Three.Color();
    let recordId: number = 0;
    let targetId: number = 0;
    let specialityId: number = 0;

    let xmax: number = 0,        // Age range
        xmin: number = Infinity;

    let ymax: number = 0,        // Frequency range
        ymin: number = Infinity;

    let zmax: number = 0,        // Standardised Mortality Ratio range
        zmin: number = Infinity;

    for (let i = 0; i < datapoints.length; ++i) {
      const elem: AtlasObject = datapoints[i];

      const speciality = elem.SystemSpeciality.toUpperCase();
      const organTarget = elem.OrganRef;

      const colour = Workspace.AtlasColours?.[speciality];
      if (!colour) {
        continue;
      }

      // Map Atlas Speciality
      const isKnownSpec = specialities.hasOwnProperty(speciality);
      const specId = isKnownSpec
        ? specialities[speciality].MapId
        : specialityId++;

      let spec!: AtlasSpeciality;
      if (!isKnownSpec) {
        col.setStyle(colour, World.Scene?.outputColorSpace);

        const hex = col.getHex();
        spec = {
          MapId: specId,
          Hex: hex,
          Name: elem.SystemSpeciality,
          Reference: packAtlasColRef(hex, specId),
          RecordIds: []
        };
        parsedData.AddColorMapping(hex);

        specialities[speciality] = spec;
      } else {
        spec = specialities[speciality];
      }
      spec.RecordIds.push(recordId);

      // Map Atlas Organ target
      const isKnownTrg = targets.hasOwnProperty(organTarget);
      const trgId = isKnownTrg
        ? targets[organTarget].MapId
        : targetId++;

      let trg!: AtlasTarget;
      if (!isKnownTrg) {
        trg = { MapId: trgId, RecordIds: [] };
        targets[organTarget] = trg;
      } else {
        trg = targets[organTarget];
      }
      trg.RecordIds.push(recordId);

      // Push record and cont.
      const x = toFixedFloat(elem.Age),
            y = toFixedFloat(elem.Frequency),
            z = toFixedFloat(elem.Mortality, 4);

      const record: AtlasRecord = {
        ...elem,
        ...{
          Id: recordId,
          Age: toFixedFloat(x, 2),
          Frequency: toFixedFloat(y, 2),
          SpecialityId: specId,
          OrganId: trgId,
          Mortality: z,
          x: x,
          y: y,
          z: z,
        },
      };
      records.push(record);

      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);

      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);

      zmin = Math.min(zmin, z);
      zmax = Math.max(zmax, z);

      recordId++;
    }

    // Compute branches
    const groups = Object.values(specialities);

    let thetaIncrement = (2*Math.PI) / specialityId,
        startRotation  = 0;

    const xAxisScale = getScalerFn(scaling?.x),
          yAxisScale = getScalerFn(scaling?.y),
          zAxisScale = getScalerFn(scaling?.z);

    const shouldScaleX = !!xAxisScale,
          shouldScaleY = !!yAxisScale,
          shouldScaleZ = !!zAxisScale;

    // Resize to shape & set range
    parsedData.ResizeToFit(records.length);
    parsedData.SetAxisRange('x', xmin, xmax);
    parsedData.SetAxisRange('y', ymin, ymax);
    parsedData.SetAxisRange('z', zmin, zmax);

    // Generate clustered vertices and assoc. ref fields
    let item!: AtlasRecord;
    let radialVert = new Three.Vector3(),
        scatterVert = new Three.Vector3();

    let vMinX = Infinity, vMaxX = -Infinity;
    let vMinY = Infinity, vMaxY = -Infinity;
    let vMinZ = Infinity, vMaxZ = -Infinity;
    for (let i = 0; i < groups.length; ++i) {
      const recordIds = groups[i].RecordIds;
      const invRecordLen = 1 / recordIds.length;
      for (let j = 0; j < recordIds.length; ++j) {
        item = records[recordIds[j]];

        let { x, y, z } = item;
        if (shouldScaleX) {
          x = xAxisScale(x, xmin, xmax);
        };

        if (shouldScaleY) {
          y = yAxisScale(y, ymin, ymax);
        };

        if (shouldScaleZ) {
          z = zAxisScale(z, zmin, zmax);
        };

        item.x = x;
        item.y = y;
        item.z = z;

        radialVert.set(x, y, 0);
        rotatePointAroundOrigin(radialVert, Const.ZeroVector, startRotation + thetaIncrement*j*invRecordLen);

        vMinX = Math.min(vMinX, x);
        vMaxX = Math.max(vMaxX, x);

        vMinY = Math.min(vMinY, y);
        vMaxY = Math.max(vMaxY, y);

        vMinZ = Math.min(vMinZ, z);
        vMaxZ = Math.max(vMaxZ, z);

        parsedData.AddRecord(
          item,
          radialVert,
          scatterVert.set(x, y, z),
          Workspace.MortalityBaseSize + Workspace.MortalityScaleSize*(item.Mortality/(zmax - zmin))
        );
      }
      startRotation += thetaIncrement;
    }

    // Push references
    parsedData.SetRelationships(targets);
    parsedData.SetSpecialities(specialities);

    // Fit scaled axes
    parsedData.SetAxisScale('x', computeAxisScale(vMinX, vMaxX, Workspace.AtlasDesiredSteps.x));
    parsedData.SetAxisScale('y', computeAxisScale(vMinY, vMaxY, Workspace.AtlasDesiredSteps.y));
    parsedData.SetAxisScale('z', computeAxisScale(vMinZ, vMaxZ, Workspace.AtlasDesiredSteps.z));

    return parsedData;
  }
}

export {
  AtlasLoader,
  AtlasData,
};
