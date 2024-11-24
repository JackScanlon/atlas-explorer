import * as Three from 'three'
import { ExplorerOpts } from './types';

type OutputColorSpace = typeof Three.SRGBColorSpace | typeof Three.LinearSRGBColorSpace;

export namespace Const {
  export const
    /* Math */
    // Some tiny floating point value
    EPS = 1e-6,

    // Ratio of circumference & diameter of a circle, i.e. π
    PI = Math.PI,

    // Constant ref to 0.5π
    PI_HALF = Math.PI * 0.5,

    // Ratio between circumference & radius of a circle, i.e. 2π
    TAU = Math.PI * 2,

    // Constant to convert degrees to radians
    DEG2RAD = Math.PI * 2 / 360,

    // Constant to convert radians to degrees
    RAD2DEG = 1 / (Math.PI * 2 / 360),

    /* Translation */
    // Default fill vector
    OneVector = new Three.Vector3(1, 1, 1),

    // Default empty vector
    ZeroVector = new Three.Vector3(0, 0, 0),

    // Default right vector
    RightVector = new Three.Vector3(1, 0, 0),

    // Default world up vector axis
    UpVector = new Three.Vector3(0, 1, 0),

    // Default look vector axis
    LookVector = new Three.Vector3(0, 0, -1);
};

export namespace World {
  export const
    // Fog colour(s) for Dark/Light mode theme(s)
    Theme: Record<string, number> = {
      dark: 0x646464,
      light: 0xFFFFFF,
    },

    // Scene image processing
    Scene = {
      toneMapping: Three.ACESFilmicToneMapping as Three.ToneMapping,
      toneMappingExposure: 1.5,
      outputColorSpace: Three.LinearSRGBColorSpace as OutputColorSpace,
    },

    // Scene camera
    Camera = {
      origin: new Three.Vector3(0.0, 15.0, -200),
      fieldOfView: 70.0,
      nearPlane: 0.1,
      farPlane: 590.0,
    },

    // World fog
    Fog = {
      nearDistance: 100.0,
      farDistance: 450.0,
    },

    // Used to compute an appropriate duration of the focus tween; see `distanceAlpha`
    FocusTweenTravelDistance = 250,

    // Min. duration, in milliseconds, of a focus tween
    FocusTweenMinDuration = 1000,

    // Distance from camera to target when focusing a node
    FocusZoomDistance = 10.0,

    // Focus movement distance before ignoring click events when rotating via left-click
    FocusLossDistance = 25,

    // Touch movement distance before ignoring long press events
    TouchLossDistance = 50,

    // Duration, in ms, before we treat a touch event as a longpress
    TouchLongPressDuration = 250,

    // Threshold (eps) to det. when to update tooltip if offset from projection's expected coord
    TooltipOffsetThreshold = 1e-3,

    // Elapsed time, in milliseconds, between tooltip update frames
    TooltipMinUpdateInterval = (1/30)*1000,

    // Duration of the scene's points tween (in ms)
    ScenePointsTweenAnimation = 2000,

    // Duration of the scene's axes tween (in ms)
    SceneAxesTweenAnimation = 3000,

    // Delay, in ms, before starting the points/banner tween
    ScenePointsTweenDelay = 1000,

    // Duration, in ms, of the banner tween
    SceneBannerTweenAnimation = 1250;
};

export namespace Workspace {
  export const
    // Feature tooltip timeout
    //   - Timeout, in _seconds_, before the feature tooltip will be
    //     presented to the client again
    AtlasFeatureTimeout: number = 60 * 60 * 4, // i.e. 4hr

    // Atlas Phenotype URL target
    //   - interpolated with a record's `SlugRef` property
    AtlasUrlFmt: string = 'https://atlasofhumandisease.org/disease/',

    // Speciality colour mapping
    //   - See @ `./types` and data reference(s)
    AtlasColours: Record<string, HexColorCode> = {
      'CARDIOLOGY': '#5D7FA0',
      'DERMATOLOGY': '#D1041D',
      'ENDOCRINOLOGY': '#EEDF19',
      'GASTROENTEROLOGY': '#6BAF48',
      'GENERAL SURGERY': '#6DC895',
      'GYNAECOLOGY': '#AAF695',
      'HAEMATOLOGY': '#20F7F1',
      'HAEMATOLOGY ONCOLOGY': '#00FFF7',
      'HAEMATOLOGY IMMUNOLOGY': '#752FD1',
      'IMMUNOLOGY': '#C7ABEC',
      'HEPATOLOGY': '#2085C7',
      'INFECTIOUS DISEASE': '#DE8CA9',
      'NEPHROLOGY': '#047167',
      'NEUROLOGY': '#914B96',
      'ONCOLOGY': '#EC99B4',
      'OPHTHALMOLOGY': '#B3D74C',
      'ORTHOPAEDICS': '#9FC947',
      'OTORHINOLARYNGOLOGY': '#374396',
      'PSYCHIATRY': '#E5CF8F',
      'RESPIRATORY': '#DB5711',
      'RHEUMATOLOGY': '#493585',
      'STROKE MEDICINE': '#6C56BC',
      'UROLOGY': '#628A15',
      'VASCULAR SURGERY': '#A00A44',
      'GENERAL PSYCHIATRY': '#F2B3B3',
      'CHILD AND ADOLESCENT PSYCHIATRY': '#F2A2A2',
      'CARDIOLOGY STROKE MEDICINE': '#F67575',
      'MEDICAL OPTHAMOLOGY': '#F75858',
      'AUDIOVESTIBULAR MEDICINE': '#F73C3C',
      'OTOLARYNGOLGY': '#FA2828',
      'ORAL MEDICINE': '#FC1616',
      'ORAL AND MAXILLOFACIAL': '#FF0000',
      'CARDIAC ELECTROPHYSIOLOGY': '#FA8B19',
      'PAEDIATRIC CARDIOLOGY': '#F79735',
      'RESPIRATORY MEDICINE': '#FFBC78',
      'GASTROENTEROLOGY HEPATOLOGY': '#47E100',
      'RENAL': '#248000',
      'GENITOURINARY MEDICINE': '#5F5DFF',
      'OBSTETRICS AND GYNAECOLOGY OBSTETRICS': '#4845FF',
      'OBSTETRICS AND GYNAECOLOGY': '#160DED',
      'OBSTETRICS': '#5B55F2',
      'TRAUMA AND ORTHOPAEDIC SURGERY': '#6FE0DD',
      'PLASTIC SURGERY': '#42EEE9',
      'MULTIPLE': '#84ee91',
    },

    // Desired step(s) for each axes
    AtlasDesiredSteps = {
      x: 10,
      y: 100,
    },

    // Axis tick steps
    AtlasAxisScaling = Array(7).fill(0).map((_, n) => {
      n += 1;
      return (75 - 23*n + 14*Math.pow(n, 2) - 7*Math.pow(n, 3) + Math.pow(n, 4))/(6*(17 - 8*n + Math.pow(n, 2)));
    }),

    // Default atlas explorer constructor opts
    AtlasExplorerDefaults: ExplorerOpts = {
      Appearance: {
        Canvas:  {
          ClassName: 'atlas-explorer-canvas',
          ZIndex: 0
        },
        Drawing: {
          ClassList: [ 'atlas-explorer-drawable', 'no-user-selection' ],
          ZIndex: 1,
          Style: {
            top: '0px',
            position: 'fixed',
            pointerEvents: 'none',
          }
        },
      },
    },

    // SMR scale factor(s)
    MortalityBaseSize = 3,
    MortalityScaleSize = 10;
};
