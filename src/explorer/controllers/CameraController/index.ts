// Source:
//  - Ported from `three.js`'s `OrbitControls` class, and extended to allow for more freedom
//  - See original source by MrDoob @ https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/OrbitControls.js
//
// License:
//  - MIT Copyright © 2010-2024 three.js authors
//  - Ported/Extended by Jack Scanlon, 2024
//
// Note:
//  - This implementation forgoes the orthographic camera handling as we were not in need of it;
//  - Changes incl. animation handling & improvements to UX
//

import * as Three from 'three'

import { Const, World } from '@/explorer/constants'
import { BaseControls, CameraState } from './constants'
import { CameraTouchControls, CameraMouseControls, CameraControlOpts } from './types'

import * as Tweener from 'three/examples/jsm/libs/tween.module.js'
import CancellablePromise from '@/explorer/common/cancellablePromise';

/**
 * CameraController
 * @desc A modified `OrbitController`, see ref @ https://threejs.org/docs/?q=orbit#examples/en/controls/OrbitControls
 */
export default class CameraController {
  private object!: Three.PerspectiveCamera;
  private domElement!: HTMLElement;

  public rotateSpeed: number = 1.0;
  public rotateEnabled: boolean = true;

  public zoomMin: number = 5.0;
  public zoomMax: number = Infinity;
  public zoomSpeed: number = 1.0;
  public zoomEnabled: boolean = true;
  public zoomToCursor: boolean = false;

  public panSpeed: number = 1.0;
  public panEnabled: boolean = true;

  public minTargetRadius: number = 0;
  public maxTargetRadius: number = Infinity;

  public minPolarAngle: number = 0;
  public maxPolarAngle: number = Const.PI;

  public minAzimuthAngle: number = -Infinity;
  public maxAzimuthAngle: number =  Infinity;

  public dampingFactor: number = 0.25;
  public dampingEnabled: boolean = false;

  public cursor: Three.Vector3 = new Three.Vector3();
  public target: Three.Vector3 = new Three.Vector3();

  private scale: number = 1;
  private panOffset: Three.Vector3 = new Three.Vector3();
  private spherical: Three.Spherical = new Three.Spherical();
  private sphericalDelta: Three.Spherical = new Three.Spherical();

  private hasUpdate: boolean = false;
  private insideTween: boolean = false;
  private controllable: boolean = false;
  private mouse: Three.Vector2 = new Three.Vector2();
  private state: CameraState = CameraState.None;
  private dollyDirection: Three.Vector3 = new Three.Vector3();
  private performCursorZoom: boolean = false;

  private rotateStart: Three.Vector2 = new Three.Vector2();
  private rotateEnd: Three.Vector2 = new Three.Vector2();
  private rotateDelta: Three.Vector2 = new Three.Vector2();

  private panStart: Three.Vector2 = new Three.Vector2();
  private panEnd: Three.Vector2 = new Three.Vector2();
  private panDelta: Three.Vector2 = new Three.Vector2();

  private dollyStart: Three.Vector2 = new Three.Vector2();
  private dollyEnd: Three.Vector2 = new Three.Vector2();
  private dollyDelta: Three.Vector2 = new Three.Vector2();

  private orbitQuat!: Three.Quaternion;
  private orbitQuatInverse!: Three.Quaternion;

  private lastTranslation: Three.Vector3 = new Three.Vector3();
  private lastOrientation: Three.Quaternion = new Three.Quaternion(0, 0, 0, 1);
  private lastTargetOrigin: Three.Vector3 = new Three.Vector3();

  private readonly pointers: number[] = [];
  private readonly pointerPositions: Record<number, Three.Vector2> = {};

  private readonly touchControl!: CameraTouchControls;
  private readonly mouseControl!: CameraMouseControls;

  private readonly pointerUpHandler: (event: PointerEvent) => void = this.onPointerUp.bind(this);
  private readonly pointerDownHandler: (event: PointerEvent) => void = this.onPointerDown.bind(this);
  private readonly pointerMoveHandler: (event: PointerEvent) => void = this.onPointerMove.bind(this);
  private readonly wheelChangeHandler: (event: WheelEvent) => void = this.onWheelChange.bind(this);
  private readonly contextMenuHandler: (event: MouseEvent) => void = this.onContextMenu.bind(this);

  public constructor(opts: CameraControlOpts) {
    this.object = opts.Camera;
    this.domElement = opts.DomElement || document.body;

    this.touchControl = opts?.Controls?.touch || structuredClone(BaseControls.touch!)
    this.mouseControl = opts?.Controls?.mouse || structuredClone(BaseControls.mouse!)

    this.initialise();
  }

  public get camera(): Three.PerspectiveCamera {
    return this.object;
  }

  public get element(): HTMLElement {
    return this.domElement;
  }

  public get enabled(): boolean {
    return this.controllable;
  }

  public set enabled(value: boolean) {
    this.controllable = value;
  }

	public get distance(): number {
		return this.spherical.radius;
	}

	public set distance(distance: number) {
		if (this.spherical.radius === distance) {
      return;
    }

		this.spherical.radius = distance;
		this.Update();
	}

  public ConsumeUpdate(): boolean {
    const hasUpdate = this.hasUpdate;
    this.hasUpdate = false;

    return hasUpdate;
  }

  public IsTweening(): boolean {
    return this.insideTween;
  }

  public TweenToTarget(target: Three.Vector3, distance?: number): CancellablePromise<void> {
    if (typeof distance === 'undefined') {
      distance = this.distance;
    }

    return new CancellablePromise((resolve, reject) => {
      this.insideTween = true;

      this.createTargetFocusTween(target, distance)
        .then(_ => {
          this.insideTween = false;
          resolve();
        })
        .catch((reason: any) => {
          this.insideTween = false;
          reject(reason)
        });
    });
  }

  public ResetState(): CameraController {
    this.scale = 1;
    this.performCursorZoom = false;

    this.panOffset.set(0, 0, 0);
    this.sphericalDelta.set(0, 0, 0);

    this.lastOrientation = this.object.quaternion.clone();
    this.lastTranslation = this.object.position.clone();
    this.lastTargetOrigin = this.target.clone();

    return this;
  }

  public Update(forceChanged: boolean = false): boolean {
		const position = this.object.position;
    const vec = new Three.Vector3().copy(position).sub(this.target);
		vec.applyQuaternion(this.orbitQuat);
    this.spherical.setFromVector3(vec);

		if (this.dampingEnabled) {
			this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
			this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
		} else {
			this.spherical.theta += this.sphericalDelta.theta;
			this.spherical.phi += this.sphericalDelta.phi;
		}
    this.makeSafeSpherical();

		if (this.dampingEnabled) {
			this.target.addScaledVector(this.panOffset, this.dampingFactor);
		} else {
			this.target.add(this.panOffset);
		}

		this.target.sub(this.cursor);
		this.target.clampLength(this.minTargetRadius, this.maxTargetRadius);
		this.target.add(this.cursor);

    const prevRadius = this.spherical.radius;
    this.spherical.radius = this.clampDistance(this.spherical.radius * this.scale);

    let zoomChanged = prevRadius != this.spherical.radius || this.performCursorZoom;
		vec.setFromSpherical(this.spherical);
		vec.applyQuaternion(this.orbitQuatInverse);

		position.copy(this.target).add(vec);
		this.object.lookAt(this.target);

		if (this.dampingEnabled) {
			this.sphericalDelta.theta *= (1 - this.dampingFactor);
			this.sphericalDelta.phi *= (1 - this.dampingFactor);
			this.panOffset.multiplyScalar(1 - this.dampingFactor);
		} else {
			this.sphericalDelta.set(0, 0, 0);
			this.panOffset.set(0, 0, 0);
		}

		if (this.zoomToCursor && this.performCursorZoom) {
      const prevRadius = vec.length();
      const newRadius = this.clampDistance(prevRadius * this.scale);
      const radiusDelta = prevRadius - newRadius;

      this.object.position.addScaledVector(this.dollyDirection, radiusDelta);
      this.object.updateMatrixWorld();
      zoomChanged = !!radiusDelta;

      this.target.set(0, 0, -1)
        .transformDirection(this.object.matrix)
        .multiplyScalar(newRadius)
        .add(this.object.position);
		} else {
			const prevRadius = this.spherical.radius;
			this.spherical.radius = this.clampDistance(this.spherical.radius * this.scale);
			zoomChanged = prevRadius != this.spherical.radius;
    }

		this.scale = 1;
		this.performCursorZoom = false;

    const shouldUpdate = (
      forceChanged
      || this.insideTween
      || zoomChanged
      || this.lastTranslation.distanceToSquared(this.object.position) > Const.EPS
      || 8 * (1 - this.lastOrientation.dot(this.object.quaternion)) > Const.EPS
      || this.lastTargetOrigin.distanceToSquared(this.target) > Const.EPS
    );

		if (shouldUpdate) {
			this.lastTranslation.copy(this.object.position);
			this.lastOrientation.copy(this.object.quaternion);
			this.lastTargetOrigin.copy(this.target);

      this.object.updateMatrixWorld();
      this.object.updateProjectionMatrix();
      this.hasUpdate = true;

			return true;
		}

		return false;
  }

  public dispose(): void {
    this.disconnect();
  }

  private initialise(): void {
    this.orbitQuat = new Three.Quaternion().setFromUnitVectors(this.object.up, Const.UpVector);
    this.orbitQuatInverse = this.orbitQuat.clone().invert();

    this.connect();
  }

  private connect(): void {
    this.domElement.addEventListener(  'pointerdown', this.pointerDownHandler,          undefined);
    this.domElement.addEventListener('pointercancel',   this.pointerUpHandler,          undefined);
    this.domElement.addEventListener(  'contextmenu', this.contextMenuHandler,          undefined);
    this.domElement.addEventListener(        'wheel', this.wheelChangeHandler, { passive: false });
  }

  private disconnect(): void {
    this.domElement.removeEventListener(  'pointerdown', this.pointerDownHandler);
    this.domElement.removeEventListener(  'pointermove', this.pointerMoveHandler);
    this.domElement.removeEventListener(    'pointerup',   this.pointerUpHandler);
    this.domElement.removeEventListener('pointercancel',   this.pointerUpHandler);
    this.domElement.removeEventListener(  'contextmenu', this.contextMenuHandler);
    this.domElement.removeEventListener(        'wheel', this.wheelChangeHandler);
  }

  private createTargetFocusTween(target: Three.Vector3, distance: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const displacement = target.clone()
        .sub(this.object.position);

      const distanceAlpha = Math.pow(displacement.length() / World.FocusTweenTravelDistance, 2);
      const tweenDuration = World.FocusTweenMinDuration*distanceAlpha + World.FocusTweenMinDuration;

      const targetTween = new Tweener.Tween(this.target)
        .to(target, tweenDuration)
        .easing(Tweener.Easing.Exponential.Out)
        .interpolation(Tweener.Interpolation.CatmullRom)
        .start();

      displacement.normalize()
        .multiplyScalar(-distance)
        .add(target);

      const translationTween = new Tweener.Tween(this.object.position)
        .to(displacement, tweenDuration)
        .easing(Tweener.Easing.Exponential.Out)
        .interpolation(Tweener.Interpolation.CatmullRom)
        .start();

      const distanceSrc = { value: this.distance };
      const distanceTween = new Tweener.Tween(distanceSrc)
        .to({ value: distance }, tweenDuration*0.5)
        .easing(Tweener.Easing.Cubic.In)
        .interpolation(Tweener.Interpolation.Bezier)
        .start();

      const updateFrame = () => {
        try {
          if (!targetTween.isPlaying() && !distanceTween.isPlaying() && !translationTween.isPlaying()) {
            resolve();
            return;
          }

          translationTween.update();
          targetTween.update();
          distanceTween.update();

          this.spherical.radius = distanceSrc.value;
          this.Update();
        }
        catch (e) {
          reject(e);
          return;
        }

        requestAnimationFrame(updateFrame);
      };

      requestAnimationFrame(updateFrame);
    })
  }

  private updateZoomParameters(x: number, y: number): void {
    this.performCursorZoom = true;

    const rect = this.domElement.getBoundingClientRect();
    const dx = x - rect.left;
    const dy = y - rect.top;
    const w = rect.width;
    const h = rect.height;

    this.mouse.x =  (dx / w) * 2 - 1;
    this.mouse.y = -(dy / h) * 2 + 1;

    this.dollyDirection.set(this.mouse.x, this.mouse.y, 1)
      .unproject(this.object)
      .sub(this.object.position)
      .normalize();
  }

  private getZoomScale(delta: number): number {
    const normalizedDelta = Math.abs(delta * 0.01);
    return Math.pow(0.95, this.zoomSpeed * normalizedDelta);
  }

  private makeSafeSpherical(): void {
		let min = this.minAzimuthAngle;
		let max = this.maxAzimuthAngle;
		if (isFinite(min) && isFinite(max)) {
			if (min < - Const.PI) {
        min += Const.TAU;
      } else if (min > Const.PI) {
        min -= Const.TAU;
      }

			if (max < - Const.PI) {
        max += Const.TAU;
      } else if (max > Const.PI) {
        max -= Const.TAU;
      }

			if (min <= max) {
				this.spherical.theta = Math.max(min, Math.min(max, this.spherical.theta));
			} else {
				this.spherical.theta = (this.spherical.theta > (min + max) / 2) ?
					Math.max(min, this.spherical.theta) :
					Math.min(max, this.spherical.theta);
			}
		}

		this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
		this.spherical.makeSafe();
  }

  private clampDistance(dist: number): number {
		return Math.max(this.zoomMin, Math.min(this.zoomMax, dist));
	}

  private rotateUp(angle: number): void {
		this.sphericalDelta.phi -= angle;
  }

  private rotateLeft(angle: number): void {
		this.sphericalDelta.theta -= angle;
  }

  private dollyIn(scale: number): void {
    this.scale *= scale;
  }

  private dollyOut(scale: number): void {
    this.scale /= scale;
  }

  private panLeft(distance: number, objectMatrix: Three.Matrix4): void {
    const vec = new Three.Vector3();
    vec.setFromMatrixColumn(objectMatrix, 0);
    vec.multiplyScalar(-distance);

    this.panOffset.add(vec);
  }

  private panUp(distance: number, objectMatrix: Three.Matrix4): void {
    const vec = new Three.Vector3();
    vec.setFromMatrixColumn(objectMatrix, 1);
    vec.multiplyScalar(distance);

    this.panOffset.add(vec);
  }

  private pan(deltaX: number, deltaY: number): void {
    const vec = new Three.Vector3();
    const element = this.domElement;
    const position = this.object.position;
    vec.copy(position).sub(this.target);

    let targetDistance = vec.length();
    targetDistance *= Math.tan((this.object.fov / 2) * Const.PI / 180.0);

    this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);
    this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);
  }

  private isWatchingPointer(event: PointerEvent): boolean {
    const { pointerId } = event;
    for (let i = 0; i < this.pointers.length; ++i) {
      if (this.pointers[i] == pointerId) {
        return true;
      }
    }

    return false;
  }

  private watchPointer(event: PointerEvent): boolean {
    if (this.isWatchingPointer(event)) {
      return false;
    }

    this.pointers.push(event.pointerId);
    return true;
  }

  private unwatchPointer(event: PointerEvent): boolean {
    const { pointerId } = event;
    for (let i = 0; i < this.pointers.length; ++i) {
      if (this.pointers[i] == pointerId) {
        this.pointers.splice(i, 1);
        delete this.pointerPositions?.[pointerId];
        return true;
      }
    }

    return false
  }

  private trackPointer(event: PointerEvent): void {
    let position = this.pointerPositions[event?.pointerId];
    if (position === undefined) {
      position = new Three.Vector2();
      this.pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

  private getSecondPointerPosition(event: PointerEvent): Three.Vector2 {
    const pointerId = (event.pointerId === this.pointers[0])
      ? this.pointers[1]
      : this.pointers[0];

    return this.pointerPositions[pointerId];
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.controllable || event.target !== this.domElement) {
      return;
    }

    if (this.pointers.length === 0) {
      this.domElement.setPointerCapture(event.pointerId);
      this.domElement.addEventListener('pointermove', this.pointerMoveHandler);
      this.domElement.addEventListener(  'pointerup',   this.pointerUpHandler);
    }

    if (!this.watchPointer(event)) {
      return;
    }

    if (event.pointerType === 'touch') {
      this.onTouchStart(event);
      return;
    }
    this.onMouseDown(event);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.controllable) {
      return;
    }

    if (event.pointerType === 'touch') {
      if (this.pointers.length > 1) {
        event.preventDefault();
      }

      this.onTouchMove(event);
      return;
    }

    this.onMouseMove(event);
  }

  private onPointerUp(event: PointerEvent): void {
    this.unwatchPointer(event);

    const len = this.pointers.length;
    if (len === 0) {
      this.domElement.releasePointerCapture(event.pointerId);
      this.domElement.removeEventListener('pointermove', this.pointerMoveHandler);
      this.domElement.removeEventListener(  'pointerup',   this.pointerUpHandler);
      this.state = CameraState.None;
    } else if (len === 1) {
      const pointerId = this.pointers[len - 1];
      const position = this.pointerPositions[pointerId];

      const evt = new PointerEvent('pointerup', { pointerId: pointerId, pointerType: 'touch' });
      Object.defineProperties(evt, {
        pageX   : { value: position.x },
        pageY   : { value: position.y },
        clientX : { value: position.x },
        clientY : { value: position.y },
      });

      this.onTouchStart(evt);
    }
  }

  private onContextMenu(event: MouseEvent): void {
    if (!this.controllable || event.target !== this.domElement) {
      return;
    }

    event.preventDefault();
  }

  private onWheelChange(event: WheelEvent): void {
    if (!this.controllable || event.target !== this.domElement) {
      return;
    }

    if (!this.zoomEnabled || this.state !== CameraState.None) {
      return;
    }

    event.preventDefault();
    this.handleMouseWheel(event);
  }

  private onMouseDown(event: PointerEvent): void {
    let mouseAction!: number;
    switch (event.button) {
      case 0:
        mouseAction = this.mouseControl.Left;
        break;

      case 1:
        mouseAction = this.mouseControl.Middle;
        break;

      case 2:
        mouseAction = this.mouseControl.Right;
        break;

      default:
        mouseAction = -1;
        break;
    }

    switch (mouseAction) {
      case Three.MOUSE.DOLLY: {
        if (!this.zoomEnabled) {
          return;
        }

        this.handleMouseDownDolly(event);
        this.state = CameraState.Dolly;
      } break;

      case Three.MOUSE.ROTATE: {
        if (!this.rotateEnabled) {
          return;
        }

        this.handleMouseDownRotate(event);
        this.state = CameraState.Rotate;
      } break;

      case Three.MOUSE.PAN: {
        if (!this.panEnabled) {
          return;
        }

        this.handleMouseDownPan(event);
        this.state = CameraState.Pan;
      } break;

      default:
        this.state = CameraState.None;
        break;
    }
  }

  private onMouseMove(event: PointerEvent): void {
    switch (this.state) {
      case CameraState.Rotate: {
        if (!this.rotateEnabled) {
          return;
        }

        this.handleMouseMoveRotate(event);
      } break;

      case CameraState.Dolly: {
        if (!this.zoomEnabled) {
          return;
        }
        this.handleMouseMoveDolly(event);
      } break;

      case CameraState.Pan: {
        if (!this.panEnabled) {
          return;
        }

        this.handleMouseMovePan(event);
      } break;

      default:
        break;
    }
  }

  private handleMouseDownDolly(event: PointerEvent): void {
    this.updateZoomParameters(event.clientX, event.clientX);
    this.dollyStart.set(event.clientX, event.clientY);
  }

  private handleMouseDownRotate(event: PointerEvent): void {
    this.rotateStart.set(event.clientX, event.clientY);
  }

  private handleMouseDownPan(event: PointerEvent): void {
    this.panStart.set(event.clientX, event.clientY);
  }

  private handleMouseMoveRotate(event: PointerEvent): void {
    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);

    const element = this.domElement;
    this.rotateLeft(Const.TAU * this.rotateDelta.x / element.clientHeight);
    this.rotateUp(Const.TAU * this.rotateDelta.y / element.clientHeight);

    this.rotateStart.copy(this.rotateEnd);
    this.Update();
  }

  private handleMouseMoveDolly(event: PointerEvent): void {
    this.dollyEnd.set(event.clientX, event.clientY);
    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {
      this.dollyOut(this.getZoomScale(this.dollyDelta.y));
    } else if (this.dollyDelta.y < 0) {
      this.dollyIn(this.getZoomScale(this.dollyDelta.y));
    }

    this.dollyStart.copy(this.dollyEnd);

    this.Update();
  }

  private handleMouseWheel(event: WheelEvent): void {
		const mode = event.deltaMode;
		const wheelTarget = {
			clientX: event.clientX,
			clientY: event.clientY,
			deltaY: event.deltaY,
		};

		switch (mode) {
			case 1:
				wheelTarget.deltaY *= 16;
				break;

			case 2:
				wheelTarget.deltaY *= 100;
				break;

      default:
        break;
		}
		this.updateZoomParameters(wheelTarget.clientX, wheelTarget.clientY);

		if (event.deltaY < 0) {
			this.dollyIn(this.getZoomScale(wheelTarget.deltaY));
		} else if (event.deltaY > 0) {
			this.dollyOut(this.getZoomScale(wheelTarget.deltaY));
		}

		this.Update(true);
  }

  private handleMouseMovePan(event: PointerEvent): void {
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);

    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);

    this.Update();
  }

  private onTouchStart(event: PointerEvent): void {
    this.trackPointer(event);

    const len = this.pointers.length;
    if (len === 1) {
      switch (this.touchControl.One) {
        case Three.TOUCH.ROTATE: {
          if (!this.rotateEnabled) {
            return;
          }

          this.handleTouchStartRotate(event);
          this.state = CameraState.TouchRotate;
        } break;

        case Three.TOUCH.PAN: {
          if (!this.panEnabled) {
            return;
          }
          this.handleTouchStartPan(event);
          this.state = CameraState.TouchPan;
        } break;

        default:
          this.state = CameraState.None;
          break;
      }
    } else if (len === 2) {
      switch (this.touchControl.Two) {
        case Three.TOUCH.DOLLY_PAN: {
          if (!this.zoomEnabled && !this.panEnabled) {
            return;
          }

          this.handleTouchStartDollyPan(event);
          this.state = CameraState.TouchDollyPan;
        } break;

        case Three.TOUCH.DOLLY_ROTATE: {
          if (!this.zoomEnabled && !this.panEnabled) {
            return;
          }

          this.handleTouchStartDollyRotate(event);
          this.state = CameraState.TouchDollyRotate;
        } break;

        default:
          this.state = CameraState.None;
          break;
      }
    } else {
      this.state = CameraState.None;
    }
  }

  private onTouchMove(event: PointerEvent): void {
    this.trackPointer(event);

    switch (this.state) {
      case CameraState.TouchRotate: {
        if (!this.rotateEnabled) {
          return;
        }

        this.handleTouchMoveRotate(event);
        this.Update();
      } break;

      case CameraState.TouchPan: {
        if (!this.panEnabled) {
          return;
        }

        this.handleTouchMovePan(event);
        this.Update();
      } break;

      case CameraState.TouchDollyPan: {
        if (!this.zoomEnabled && !this.panEnabled) {
          return;
        }

        this.handleTouchMoveDollyPan(event);
        this.Update();
      } break;

      case CameraState.TouchDollyRotate: {
        if (!this.zoomEnabled && !this.panEnabled) {
          return;
        }

        this.handleTouchMoveDollyRotate(event);
        this.Update();
      } break;

      default:
        this.state = CameraState.None;
        break;
    }
  }

  private handleTouchStartRotate(event: PointerEvent): void {
    if (this.pointers.length === 1) {
      this.rotateStart.set(event.pageX, event.pageY);
      return;
    }

    const position = this.getSecondPointerPosition(event);
    const x = 0.5 * (event.pageX + position.x);
    const y = 0.5 * (event.pageY + position.y);
    this.rotateStart.set(x, y);
  }

  private handleTouchStartPan(event: PointerEvent): void {
    if (this.pointers.length === 1) {
      this.panStart.set(event.pageX, event.pageY);
      return;
    }

    const position = this.getSecondPointerPosition(event);
    const x = 0.5 * (event.pageX + position.x);
    const y = 0.5 * (event.pageY + position.y);
    this.panStart.set(x, y);
  }

  private handleTouchStartDolly(event: PointerEvent): void {
    const position = this.getSecondPointerPosition(event);
    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.dollyStart.set(0, distance);
  }

  private handleTouchStartDollyPan(event: PointerEvent): void {
    if (this.zoomEnabled) {
      this.handleTouchStartDolly(event);
    }

    if (this.panEnabled) {
      this.handleTouchStartPan(event);
    }
  }

  private handleTouchStartDollyRotate(event: PointerEvent): void {
    if (this.zoomEnabled) {
      this.handleTouchStartDolly(event);
    }

    if (this.panEnabled) {
      this.handleTouchStartPan(event);
    }
  }

  private handleTouchMoveRotate(event: PointerEvent): void {
    if (this.pointers.length == 1) {
      this.rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);

      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.rotateEnd.set(x, y);
    }
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);

    const element = this.domElement;
    this.rotateLeft(Const.TAU * this.rotateDelta.x / element.clientHeight);
    this.rotateUp(Const.TAU * this.rotateDelta.y / element.clientHeight);
    this.rotateStart.copy(this.rotateEnd);
  }

  private handleTouchMovePan(event: PointerEvent): void {
    if (this.pointers.length === 1) {
      this.panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);

      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.panEnd.set(x, y);
    }

    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
  }

  private handleTouchMoveDolly(event: PointerEvent): void {
    const position = this.getSecondPointerPosition(event);

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    this.dollyEnd.set(0, distance);
    this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed));

    this.dollyOut(this.dollyDelta.y);
    this.dollyStart.copy(this.dollyEnd);

    const centerX = (event.pageX + position.x) * 0.5;
    const centerY = (event.pageY + position.y) * 0.5;
    this.updateZoomParameters(centerX, centerY);
  }

  private handleTouchMoveDollyPan(event: PointerEvent): void {
    if (this.zoomEnabled) {
      this.handleTouchMoveDolly(event);
    }

    if (this.panEnabled) {
      this.handleTouchMovePan(event);
    }
  }

  private handleTouchMoveDollyRotate(event: PointerEvent): void {
    if (this.zoomEnabled) {
      this.handleTouchMoveDolly(event);
    }

    if (this.rotateEnabled) {
      this.handleTouchMoveRotate(event);
    }
  }
};
