import { DeviceProps, TypedArray, TypedArrayBufferContructor, ValueType } from './types';
import { NumberUtils } from '@engine/math';
import { PixelRatioMediaQuery, BrowserType } from '@engine/common';

/**
 * @desc gets or creates an offscreen element used to compute the `devicePixelRatio`
 *       on Safari
 * @note required for Safari browsers as it is not currently supported
 * @see https://bugs.webkit.org/show_bug.cgi?id=124862
 *
 * @param {Window} [targetWindow] optionally specify the target window; defaults to `window`
 *
 * @returns {HTMLDivElement} the zoom element
 */
const getOrCreateZoomElement = (targetWindow?: Window): HTMLDivElement => {
  if (typeof targetWindow === 'undefined') {
    targetWindow = window;
  }

  let element = targetWindow?.explorer__ZoomElement;
  if (typeof element === 'undefined') {
    element = targetWindow.document.createElement('div');
    element.style.top = '-2in';
    element.style.left = '-2in';
    element.style.width = '1in';
    element.style.height = '1in';
    element.style.position = 'absolute';

    const parent = targetWindow.document.createElement('div');
    parent.style.top = '0';
    parent.style.left = '0';
    parent.style.width = '0';
    parent.style.height = '0';
    parent.style.position = 'absolute';

    parent.appendChild(element);
    targetWindow.document.body.appendChild(parent);
  }

  return element as HTMLDivElement;
};

/**
 * @desc attempts to resolve the desired container, otherwise returns a default container
 *
 * @param {string}      selector           a document query selector
 * @param {HTMLElement} [defaultContainer] optionally specify the default container if not found; defaults to `document.body`
 *
 * @returns {HTMLElement} the resolved container element; otherwise the specified default container
 */
export const getBestContainer = (selector: string, defaultContainer?: HTMLElement): HTMLElement => {
  const elem = document.querySelector(selector);
  if (typeof elem !== 'undefined' && elem instanceof HTMLElement) {
    return elem;
  }

  return typeof defaultContainer !== 'undefined' ? defaultContainer : document.body;
};

/**
 * @desc creates a canvas element as specified by the `DeviceProps` object
 *
 * @param {DeviceProps} props          a partial of `DeviceProps`
 * @param {Window}      [targetWindow] optionally specify the target window; defaults to `window`
 *
 * @returns {HTMLCanvasElement} the instantiated element
 */
export const createCanvasElement = (props: Partial<DeviceProps>, targetWindow?: Window): HTMLCanvasElement => {
  if (typeof targetWindow === 'undefined') {
    targetWindow = window;
  }

  const width: number = typeof props?.width === 'number' && Number.isFinite(props.width) ? Math.abs(props.width) : 0;

  const height: number = typeof props?.height === 'number' && Number.isFinite(props.height) ? Math.abs(props.height) : 0;

  let container!: HTMLElement;
  if (typeof props.container === 'string') {
    container = getBestContainer(props.container, targetWindow.document.body);
  } else if (typeof props.container === 'undefined') {
    container = targetWindow.document.body;
  } else if (props.container instanceof HTMLElement) {
    container = props.container;
  }

  const canvas = targetWindow.document.createElement('canvas');
  canvas.width = width || 1;
  canvas.height = height || 1;
  canvas.style.width = width > 0 ? width.toFixed(0) + 'px' : '100%';
  canvas.style.height = height > 0 ? height.toFixed(0) + 'px' : '100%';
  if (props.hidden) {
    canvas.style.visibility = 'hidden';
  }

  container.append(canvas);
  return canvas;
};

/**
 * @desc determine if we're executing within a WebWorker context
 *
 * @returns {boolean} reflecting the environment's context
 */
export const isWebWorkerContext = (): boolean => {
  return (
    typeof self === 'object' &&
    'constructor' in self &&
    typeof self.constructor === 'function' &&
    self.constructor.name === 'DedicatedWorkerGlobalScope'
  );
};

/**
 * @desc determine if we're executing within a NodeJS/Bun/JSDom context
 *
 * @returns {boolean} reflecting the environment's context
 */
export const isNodeContext = (): boolean => {
  let hasJsDom = false,
    hasProcess = false;
  try {
    hasProcess =
      typeof process === 'object' &&
      'versions' in process &&
      typeof process.versions === 'object' &&
      (Boolean(process.versions.node) || Boolean(process.versions.bun));

    hasJsDom =
      (typeof window !== 'undefined' && 'name' in window && window.name === 'nodejs') ||
      (typeof navigator === 'object' &&
        'userAgent' in navigator &&
        typeof navigator.userAgent === 'string' &&
        /node\.js|jsdom/i.test(navigator.userAgent));
  } catch {}

  return hasProcess || hasJsDom;
};

/**
 * @desc determine whether the current env context is a browser
 *
 * @returns {boolean} reflecting the environment's context
 */
export const isBrowserContext = (): boolean => {
  let hasBrowserCtx = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  return hasBrowserCtx && !isNodeContext();
};

/**
 * @desc attempts to resolve the browser engine
 *
 * @param {Window}      [targetWindow]                                   optionally specify the target window
 * @param {BrowserType} [defaultBrowserType=BrowserType.UnknownBrowser'] optionally specify the default browser if unresolvable; defaults to `UnknownBrowser`
 *
 * @returns {BrowserType} the resolved `BrowserType`
 */
export const getBrowserType = (targetWindow?: Window, defaultBrowserType: BrowserType = BrowserType.UnknownBrowser): BrowserType => {
  if (typeof targetWindow === 'undefined' && typeof window !== 'undefined') {
    targetWindow = window;
  }

  if (typeof targetWindow === 'undefined' || !('navigator' in targetWindow) || !('document' in targetWindow)) {
    return BrowserType.NoBrowser;
  }

  const doc = targetWindow.document;
  const agent = targetWindow.navigator.userAgent;

  const hasChromeProp = 'chrome' in targetWindow;
  const isAppleWebkit = (/\b(iPad|iPhone|iPod)\b/.test(agent) && /WebKit/.test(agent)) || /safari|applewebkit/i.test(agent);

  if ('mozGetUserMedia' in navigator || /firefox/i.test(agent)) {
    return BrowserType.Firefox;
  } else if (isAppleWebkit && !('MSStream' in targetWindow && targetWindow.MSStream)) {
    return BrowserType.Safari;
  } else if (/msie/i.test(agent) && 'documentMode' in doc && !!doc.documentMode) {
    return BrowserType.IE;
  } else if (/\bEdge\b/.test(agent) && !hasChromeProp) {
    return BrowserType.Edge;
  } else if (/opera|opr/i.test(agent) && !hasChromeProp) {
    return BrowserType.Opera;
  } else if ('webkitGetUserMedia' in navigator || hasChromeProp) {
    return /chrome/i.test(agent) ? BrowserType.Chrome : BrowserType.Chromium;
  }

  return defaultBrowserType;
};

/**
 * @desc attempts to derive the current `devicePixelRatio`, optionally taking browser limitations
 *       into consideration, e.g. the issues surrounding Zoom on both iOS and AppleWebkit-based
 *       browsers
 *
 * @note see the following references:
 *  1. W3 DPI spec: https://www.w3.org/Style/Examples/007/units.en.html
 *  2. JS matchMedia CSS func: https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
 *  3. JS devicePixelRatio prop: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
 *  4. AppleWebkit/Safari zoom bug: https://bugs.webkit.org/show_bug.cgi?id=124862
 *
 * @param {Object}      param0                                  object specifying params
 * @param {BrowserType} [param0.browser]                        optionally provide the cached browser type (computed if browser limitations aren't ignored)
 * @param {Window}      [param0.targetWindow]                   optionally specify the target window
 * @param {number}      [param0.defaultPixelRatio=1]            optionally specify the resulting device pixel ratio if it can't be resolved; defaults to `1`
 * @param {number}      [param0.defaultDPI=1]                   optionally specify the default expected DPI; defaults to `96` per w3 spec
 * @param {boolean}     [param0.ignoreBrowserLimitations=false] optionally ignore the known browser limitations; defaults to `false`
 * @param {boolean}     [param0.minPixelRatio=1.0]              optionally specify the min pixel ratio value
 * @param {boolean}     [param0.maxPixelRatio=2.0]              optionally specify the max pixel ratio value
 *
 * @returns {number} the device pixel ratio if resovled, otherwise the default pixel ratio
 */
export const getDevicePixelRatio = ({
  browser,
  targetWindow,
  defaultPixelRatio = 1,
  defaultDPI = 96,
  ignoreBrowserLimitations = false,
  minPixelRatio = 1.0,
  maxPixelRatio = 2.0,
}: {
  browser?: BrowserType;
  targetWindow?: Window;
  defaultPixelRatio?: number;
  defaultDPI?: number;
  ignoreBrowserLimitations?: boolean;
  minPixelRatio?: number;
  maxPixelRatio?: number;
}): number => {
  // Early exit if we're not rendering to a browser
  if (typeof targetWindow === 'undefined' && typeof window !== 'undefined') {
    targetWindow = window;
  }

  if (typeof targetWindow === 'undefined' || !('navigator' in targetWindow) || !('document' in targetWindow)) {
    return defaultPixelRatio;
  }

  // Resolve devicePixelRatio with consideration to browser
  // limitations, e.g. Safari's buggy implementation
  const doc = targetWindow.document;
  const hasDevicePixelRatio =
    'devicePixelRatio' in targetWindow && typeof targetWindow.devicePixelRatio === 'number' && targetWindow.devicePixelRatio > 1e-6;

  if (!ignoreBrowserLimitations) {
    if (typeof browser === 'undefined') {
      browser = getBrowserType();
    }

    if (browser === BrowserType.Safari) {
      // NOTE:
      //  Compute the device pixel ratio by measuring an element
      //  on the page, required because Safari does not compute
      //  the device pixel ratio with respect to the current zoom
      const zoomElement = getOrCreateZoomElement(targetWindow);
      return NumberUtils.clamp(zoomElement.offsetWidth / defaultDPI, minPixelRatio, maxPixelRatio);
    }
  }

  if (hasDevicePixelRatio) {
    return NumberUtils.clamp(targetWindow.devicePixelRatio, minPixelRatio, maxPixelRatio);
  } else if ('matchMedia' in targetWindow && typeof targetWindow.matchMedia === 'function') {
    let query!: string;
    let ratio!: number;
    let fixed!: string;
    for (let i = 4; i >= 0; --i) {
      ratio = i * 0.5;
      fixed = ratio.toFixed(1);
      query =
        '(-webkit-min-device-pixel-ratio: ' +
        fixed +
        '),\
              (min--moz-device-pixel-ratio: ' +
        fixed +
        '),\
              (min-resolution: ' +
        fixed +
        'dppx)';

      if (targetWindow.matchMedia(query).matches) {
        return NumberUtils.clamp(NumberUtils.round(ratio, 1), minPixelRatio, maxPixelRatio);
      }
    }
  } else {
    const canComputeRatio =
      'screen' in targetWindow &&
      typeof targetWindow.screen.availWidth === 'number' &&
      'documentElement' in doc &&
      typeof doc.documentElement.clientWidth === 'number';

    if (canComputeRatio) {
      return NumberUtils.clamp(targetWindow.screen.availWidth / doc.documentElement.clientWidth, minPixelRatio, maxPixelRatio);
    }
  }

  return defaultPixelRatio;
};

/**
 * @desc compute the pixel ratio by observing the nearest matching media query
 *
 * @param {PixelRatioMediaQuery} [options]      optionally specify the media query parameters & result obj
 * @param {Window}               [targetWindow] optionally specify the target window
 *
 * @returns {PixelRatioMediaQuery} the device pixel media query results
 */
export const getPixelRatioMediaQuery = (options?: PixelRatioMediaQuery, targetWindow?: Window): PixelRatioMediaQuery => {
  if (typeof targetWindow === 'undefined') {
    targetWindow = window;
  }

  options = options || {};

  let ratio = options?.ratio,
    fixed = options?.fixed;

  const hasRatio = typeof ratio === 'number';
  const hasFixed = typeof fixed === 'number';
  if (!hasRatio && !hasFixed) {
    ratio = 1;
    fixed = '1';
  } else if (hasRatio) {
    fixed = ratio!.toFixed(1);
  } else if (hasFixed) {
    ratio = parseFloat(fixed!);
  }

  return {
    ratio: ratio!,
    fixed: fixed!,
    media: targetWindow.matchMedia(
      '(-webkit-min-device-pixel-ratio: ' +
        fixed +
        '),\
      (min--moz-device-pixel-ratio: ' +
        fixed +
        '),\
      (min-resolution: ' +
        fixed +
        'dppx)'
    ),
  };
};

/**
 * @desc listen to device pixel ratio change(s)
 *
 * @param {Object}      param0                                  object specifying listener options
 * @param {Function}    param0.callback                         listener callback
 * @param {BrowserType} [param0.callback]                       optionally provide the cached browser type (computed if browser limitations aren't ignored)
 * @param {Window}      [param0.targetWindow]                   optionally specify the target window
 * @param {number}      [param0.defaultPixelRatio=1]            optionally specify the default `devicePixelRatio`
 * @param {number}      [param0.defaultDPI=96]                  optionally specify the standard DPI
 * @param {number}      [param0.ignoreBrowserLimitations=false] optionally specify whether to ignore browser limitations
 * @param {number}      [param0.minPixelRatio=1.0]              optionally specify the min pixel ratio value
 * @param {number}      [param0.maxPixelRatio=2.0]              optionally specify the max pixel ratio value
 *
 * @returns {Function} a disposable function used to disconnect listener(s)
 */
export const listenToDevicePixelRatio = ({
  callback,
  browser,
  targetWindow,
  defaultPixelRatio = 1,
  defaultDPI = 96,
  ignoreBrowserLimitations = false,
  minPixelRatio = 1.0,
  maxPixelRatio = 2.0,
}: {
  callback: (pixelRatio: number, lastPixelRatio: number) => void;
  browser?: BrowserType;
  targetWindow?: Window;
  defaultPixelRatio?: number;
  defaultDPI?: number;
  ignoreBrowserLimitations?: boolean;
  minPixelRatio?: number;
  maxPixelRatio?: number;
}): Function => {
  // Early exit if we're not observing a browser
  if (typeof targetWindow === 'undefined' && typeof window !== 'undefined') {
    targetWindow = window;
  }

  if (typeof targetWindow === 'undefined' || !('navigator' in targetWindow) || !('document' in targetWindow)) {
    callback(defaultPixelRatio, defaultPixelRatio);
    return () => {};
  }

  // Resolve & cache browser
  if (typeof browser === 'undefined') {
    browser = getBrowserType();
  }

  // Cache current pixel ratio
  const params = {
    browser,
    targetWindow,
    defaultPixelRatio,
    defaultDPI,
    ignoreBrowserLimitations,
    minPixelRatio,
    maxPixelRatio,
  };

  let lastPixelRatio = getDevicePixelRatio(params);

  // Observe device pixel ratio
  const doc = targetWindow.document;
  const canQueryMedia = 'matchMedia' in targetWindow && typeof targetWindow.matchMedia === 'function',
    canComputeRatio =
      'screen' in targetWindow &&
      typeof targetWindow.screen.availWidth === 'number' &&
      'documentElement' in doc &&
      typeof doc.documentElement.clientWidth === 'number',
    hasDevicePixelRatio =
      'devicePixelRatio' in targetWindow && typeof targetWindow.devicePixelRatio === 'number' && targetWindow.devicePixelRatio > 1e-6;

  if (!ignoreBrowserLimitations && browser === BrowserType.Safari) {
    // Watch by observing zoom element resize event
    const element = getOrCreateZoomElement(targetWindow);
    callback(lastPixelRatio, lastPixelRatio);

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries.find(e => e.target === element);
      if (!entry) {
        return;
      }

      const pixelRatio = getDevicePixelRatio(params);
      if (pixelRatio !== lastPixelRatio) {
        lastPixelRatio = pixelRatio;
        callback(pixelRatio, lastPixelRatio);
      }
    });

    try {
      resizeObserver.observe(element, { box: 'device-pixel-content-box' });
    } catch {
      resizeObserver.observe(element, { box: 'content-box' });
    }

    return () => resizeObserver.disconnect();
  } else if (hasDevicePixelRatio && canComputeRatio) {
    // Watch via observing Screen API
    const observer = () => {
      const pixelRatio = getDevicePixelRatio(params);
      if (pixelRatio !== lastPixelRatio) {
        lastPixelRatio = pixelRatio;
        callback(pixelRatio, lastPixelRatio);
      }
    };

    callback(lastPixelRatio, lastPixelRatio);
    window.addEventListener('resize', observer);

    return () => targetWindow.removeEventListener('resize', observer);
  } else if (canQueryMedia) {
    // Watch via media query
    let query: PixelRatioMediaQuery = {};

    const opts: AddEventListenerOptions = { once: true };
    const listener = () => {
      const pixelRatio = getDevicePixelRatio(params);

      if (pixelRatio !== query.ratio) {
        query.ratio = pixelRatio;
        lastPixelRatio = pixelRatio;

        callback(pixelRatio, lastPixelRatio);
      }

      query = getPixelRatioMediaQuery(query, targetWindow);
      query.media!.addEventListener('change', listener, opts);
    };

    listener();

    return () => {
      if (typeof query.media !== 'undefined') {
        query.media.removeEventListener('change', listener, opts);
      }
    };
  }

  // Fire once if no match
  callback(lastPixelRatio, lastPixelRatio);
  return () => {};
};

/**
 * @desc checks whether the element is contained by, or intersects with, the viewport
 * @note will always return false if not in a browser context
 *
 * @param {HTMLElement} element some HTMLElement
 *
 * @returns {boolean} specifies whether the element is within or intersects with the viewport
 */
export const isElementOnScreen = (element: HTMLElement): boolean => {
  if (!isBrowserContext()) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const height = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return rect.bottom >= 0 && rect.top - height < 0;
};

/**
 * @desc checks whether an element is visible
 * @note will always return false if not in a browser context
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
 *
 * @param {HTMLElement} element some HTMLElement
 *
 * @returns {boolean} specifies whether the element is visible to the observer
 */
export const isElementVisible = (element: HTMLElement, options?: CheckVisibilityOptions): boolean => {
  if (!isBrowserContext()) {
    return false;
  }

  const hasVisibilityFn = 'checkVisibility' in element && typeof element.checkVisibility === 'function';

  if (hasVisibilityFn) {
    return element.checkVisibility(options);
  }

  const style = getComputedStyle(element);
  options = options ?? {};

  const checkOpacity =
    (typeof options.checkOpacity !== 'boolean' || !options.checkOpacity) &&
    (typeof options.opacityProperty !== 'boolean' || !options.opacityProperty);

  const checkVisibility =
    (typeof options.checkVisibilityCSS !== 'boolean' || !options.checkVisibilityCSS) &&
    (typeof options.visibilityProperty !== 'boolean' || !options.visibilityProperty);

  if (!element.offsetParent && style.position !== 'fixed' && !/body|html/i.test(element.nodeName)) {
    return false;
  } else if (style.display === 'none' || (element.nodeName !== 'HTML' && !element.parentElement)) {
    return false;
  } else if (options?.contentVisibilityAuto && style.contentVisibility === 'hidden') {
    return false;
  } else if (checkVisibility && style.visibility !== 'visible') {
    return false;
  } else if (checkOpacity) {
    const opacity = parseFloat(style.opacity);
    if (!isNaN(opacity) && opacity < 1e-4) {
      return false;
    }
  }

  return true;
};

/**
 * @desc derives the {@link ValueType} descriptor of a {@link TypedArray}
 *
 * @param {TypedArray} value some input data to consider
 *
 * @returns {ValueType} data type ref
 */
export const getAttrDataType = (value: TypedArray): ValueType => {
  switch (value.constructor) {
    case Uint8Array:
    case Uint8ClampedArray:
      return 'ubyte';
    case Uint16Array:
      return 'ushort';
    case Uint32Array:
    case BigUint64Array:
      return 'uint';
    case Int8Array:
      return 'byte';
    case Int16Array:
      return 'short';
    case Int32Array:
    case BigInt64Array:
      return 'int';
    default:
      // i.e. Float16Array, Float32Array, Float64Array
      return 'float';
  }
};

/**
 * @desc retrieves the constructor associated with the desired {@link ValueType}
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
 *
 * @param {ValueType} type the desired {@link TypedArray} constructor type
 *
 * @returns {TypedArrayBufferContructor<TypedArray>} a generic constructor contained by the {@link TypedArrayBufferContructor} utility type
 */
export const getArrayBufferConstructor = (type: ValueType): TypedArrayBufferContructor<TypedArray> => {
  let cls: any;
  switch (type) {
    case 'byte':
      cls = Int8Array;
      break;
    case 'ubyte':
      cls = Uint8ClampedArray;
      break;
    case 'short':
      cls = Int16Array;
      break;
    case 'ushort':
      cls = Uint16Array;
      break;
    case 'int':
      cls = Int32Array;
      break;
    case 'uint':
      cls = Uint32Array;
      break;
    case 'float':
    case 'half-float':
      cls = Float32Array;
      break;
  }

  return cls;
};

/**
 * @desc converts one typed array buffer into another array buffer type
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 *
 * @param {ValueType}  type          the desired {@link TypedArray} type described as a {@link ValueType}
 * @param {TypedArray} value         some typed array to convert into another type; note that no conversion will take place if the desired type matches this input
 * @param {Function}   [transformFn] optionally specify a transform function to remap / normalise the array before instantiating the new {@link TypedArray}, e.g. converting RGBA from bytes to normalised floats
 *
 * @returns {TypedArray} either (a) a newly constructed {@link TypedArray} of the desired {@link ValueType}; or (b) if no conversion takes place, the given `value` arg will be returned
 */
export const convertTypedArray = (
  type: ValueType,
  value: TypedArray,
  transformFn?: (value: number, index: number, array: number[]) => number
): TypedArray => {
  const cls = getArrayBufferConstructor(type);
  if (value.constructor !== cls) {
    if (typeof transformFn === 'function' && transformFn instanceof Function && transformFn.constructor === Function) {
      return new cls([...value].map(transformFn)) as TypedArray;
    }

    return new cls([...value]) as TypedArray;
  }

  return value;
};
