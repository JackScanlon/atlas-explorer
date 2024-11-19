import * as Three from 'three'

import { clampValue } from '../common/utils'
import { ViewportSize, ViewportCallback } from '../types'

/**
 * ViewportService
 * @desc Responsible for observing the client's viewport
 */
export default class ViewportService {
  private target = document.body;
  private width = this.target.offsetWidth;
  private height = this.target.offsetHeight;
  private ratio = this.width / this.height;

  private readonly root = document.documentElement.style;
  private readonly callbacks: Array<ViewportCallback> = [];
  private readonly observer!: ResizeObserver;

  public constructor() {
    this.observer = new ResizeObserver((entries) => entries?.[0] && this.computeSize(entries[0].contentRect));
    this.observer.observe(this.target);

    this.computeSize(this.target.getBoundingClientRect());
  }

  public get size(): ViewportSize {
    return {
      height: this.height,
      width: this.width,
      ratio: this.ratio
    };
  }

  /**
   * ToPixelCoordinate
   * @desc converts a `Vector2` describing a position in normalised device
   *       coordinate (NDC) space to a screen-space position
   *
   * @param {Vector2} vec some NDC space coordinate
   *
   * @returns {Vector2} the coordinate in screen-space (pixel position)
   */
  public ToPixelCoordinate(vec: Three.Vector2): Three.Vector2 {
    return vec.setX(( clampValue(vec.x*0.5+0.5, -1, 1))*this.width)
              .setY((-clampValue(vec.y*0.5-0.5, -1, 1))*this.height);
  }

  /**
   * ToNormalDeviceCoordinate
   * @desc converts a `Vector2` describing a position in screen-space (pixel position)
   *       to a normalised device coordinate (NDC) space coordinate
   *
   * @param {Vector2} vec some screen-space coordinate
   *
   * @returns {Vector2} the coordinate in NDC space
   */
  public ToNormalDeviceCoordinate(vec: Three.Vector2): Three.Vector2 {
    return vec.setX(clampValue( (vec.x / this.width )*2 - 1, -1, 1))
              .setY(clampValue(-(vec.y / this.height)*2 + 1, -1, 1));
  }

  public Connect(callback: ViewportCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      return;
    }

    this.callbacks.push(callback);
  }

  public Disconnect(callback: ViewportCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index < 0) {
      return;
    }

    this.callbacks.splice(index, 1);
  }

  public dispose(): void {
    this.observer.disconnect();
    this.callbacks.length = 0;
  }

  private computeSize(_size: DOMRectReadOnly): void {
    this.width = this.target.offsetWidth;
    this.height = this.target.offsetHeight;
    this.ratio = this.width / this.height;

    this.root.setProperty('--viewport-width', `${this.width}px`);
    this.root.setProperty('--viewport-height', `${this.height}px`);
    this.root.setProperty('--viewport-ratio', `${this.ratio}`);

    for (let i = this.callbacks.length; i--;) {
      this.callbacks[i](this.width, this.height, this.ratio);
    }
  }
}
