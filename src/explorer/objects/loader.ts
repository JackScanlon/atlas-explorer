import * as Three from 'three'

import {
  IAtlasData, AtlasRecord, AtlasObject,
  AlLoadedCallback, AlProgressCallback,
  AlErrCallback, AtlasSpeciality, AtlasTarget,
  AtlasBuildOptions, AtlasLoadOptions, AtlasGeom,
  AlScalingOpt, AlAxisScale, AlDataRange
} from '../types'

import { World, Workspace } from '../constants'
import { rotatePointAroundOrigin } from '../common/vecUtils'
import {
  toFixedFloat, packAtlasColRef,
  getScalerFn, packAtlasObject, computeAxisScale
} from '../common/utils'

/**
 * AtlasData
 * @desc An object describing the parsed resultset from the Atlas JSON resource
 */
class AtlasData implements IAtlasData {
  private minBounds: Three.Vector3 = new Three.Vector3( Infinity,  Infinity,  Infinity);
  private maxBounds: Three.Vector3 = new Three.Vector3(-Infinity, -Infinity, -Infinity);

  public xDataRange!: AlDataRange;
  public yDataRange!: AlDataRange;

  public xAxisScale!: AlAxisScale;
  public yAxisScale!: AlAxisScale;

  public specialities!: AtlasSpeciality[];
  public relationships!: Record<string, AtlasTarget>;

  public constructor(
    public records   : AtlasRecord[] = [],
    public vertices  : number[]      = [],
    public scaling   : number[]      = [],
    public reference : number[]      = [],
    public colorMap  : number[]      = []
  ) { }

  public get boundingBox(): { min: Three.Vector3, max: Three.Vector3, origin: Three.Vector3 } {
    return {
      min: this.minBounds.clone(),
      max: this.maxBounds.clone(),
      origin: this.maxBounds.clone().add(this.minBounds).multiplyScalar(0.5)
    };
  }

  public AddRecord(record: AtlasRecord, vert: Three.Vector3, scale: number): AtlasData {
    const { Id, SpecialityId } = record;

    const index = Id*3;
    this.records[Id] = record;
    this.scaling[Id] = scale;
    this.reference[Id] = packAtlasObject(Id, SpecialityId, false);

    this.vertices[index + 0] = vert.x;
    this.vertices[index + 1] = vert.y;
    this.vertices[index + 2] = vert.z;

    this.minBounds.min(vert);
    this.maxBounds.max(vert);

    return this;
  }

  public AddColorMapping(colorValue: number): AtlasData {
    const color = new Three.Color(colorValue);
    this.colorMap.push(color.r, color.g, color.b);
    return this;
  }

  public ResizeToFit(recordLen: number): AtlasData {
    this.records = Array(recordLen);
    this.vertices = Array(recordLen*3).fill(0);
    this.scaling = Array(recordLen).fill(0);
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

      default:
        break;
    }

    return this;
  }

  public Instantiate(opts?: AtlasBuildOptions): AtlasGeom {
    if (!opts) {
      opts = { };
    }

    const vertices = Float32Array.from(this.vertices),
           scaling = Float32Array.from(this.scaling),
              data =  Uint32Array.from(this.reference);

    const material = new Three.ShaderMaterial(opts.ShaderProps);
    const geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(vertices, 3));
    geometry.setAttribute(   'scale', new Three.BufferAttribute( scaling, 1));
    geometry.setAttribute(    'data', new Three.BufferAttribute(    data, 1));

    const object = new Three.Points(geometry, material);
    object.position.setY(-this.yAxisScale.Min);
    return {
      // Attr
      Data: data,
      Scaling: scaling,
      Vertices: vertices,
      // Geom
      Object: object,
      Material: material,
      Geometry: geometry,
      // Disposable
      dispose: (): void => {
        object.removeFromParent();
        geometry.dispose();
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

    let smax: number = 0,        // Standardised Mortality Ratio range
        smin: number = Infinity;

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
            s = toFixedFloat(elem.Mortality, 4);

      const record: AtlasRecord = {
        ...elem,
        ...{
          Id: recordId,
          Age: toFixedFloat(x, 2),
          Frequency: toFixedFloat(y, 2),
          SpecialityId: specId,
          OrganId: trgId,
          Mortality: s,
          x: x,
          y: y,
        },
      };
      records.push(record);

      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);

      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);

      smin = Math.min(smin, s);
      smax = Math.max(smax, s);

      recordId++;
    }

    // Compute branches
    const groups = Object.values(specialities);

    let thetaIncrement = (2*Math.PI) / specialityId,
        startRotation  = 0;

    const xAxisScale = getScalerFn(scaling?.x),
          yAxisScale = getScalerFn(scaling?.y);

    const shouldScaleX = !!xAxisScale,
          shouldScaleY = !!yAxisScale;

    // Resize to shape & set range
    parsedData.ResizeToFit(records.length);
    parsedData.SetAxisRange('x', xmin, xmax);
    parsedData.SetAxisRange('y', ymin, ymax);

    // Generate clustered vertices and assoc. ref fields
    let vert!: Three.Vector3, item!: AtlasRecord;

    let vMinX = Infinity, vMaxX = -Infinity;
    let vMinY = Infinity, vMaxY = -Infinity;
    for (let i = 0; i < groups.length; ++i) {
      const recordIds = groups[i].RecordIds;
      const invRecordLen = 1 / recordIds.length;
      for (let j = 0; j < recordIds.length; ++j) {
        item = records[recordIds[j]];

        let { x, y } = item;
        if (shouldScaleX) {
          x = xAxisScale(x, xmin, xmax);
        };

        if (shouldScaleY) {
          y = yAxisScale(y, ymin, ymax);
        };

        vert = new Three.Vector3(x, y, 0);
        rotatePointAroundOrigin(vert, World.ZeroVector, startRotation + thetaIncrement*j*invRecordLen);

        item.x = x;
        item.y = y;

        vMinX = Math.min(vMinX, x);
        vMaxX = Math.max(vMaxX, x);

        vMinY = Math.min(vMinY, y);
        vMaxY = Math.max(vMaxY, y);

        parsedData.AddRecord(item, vert, Workspace.MortalityBaseSize + Workspace.MortalityScaleSize*(item.Mortality/(smax - smin)));
      }
      startRotation += thetaIncrement;
    }

    // Push references
    parsedData.SetRelationships(targets);
    parsedData.SetSpecialities(specialities);

    // Fit scaled axes
    parsedData.SetAxisScale('x', computeAxisScale(vMinX, vMaxX, Workspace.AtlasDesiredSteps.x));
    parsedData.SetAxisScale('y', computeAxisScale(vMinY, vMaxY, Workspace.AtlasDesiredSteps.y));

    return parsedData;
  }
}

export {
  AtlasLoader,
  AtlasData,
};
