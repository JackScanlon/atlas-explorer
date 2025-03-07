import { ITexture } from '@engine/core';

/**
 * @desc default {@link Texture} constructor props
 * @see {@link GraphDataset.textures}
 * @see {@link IGraphTextures}
 * @type {Partial<ITexture>}
 * @constant
 */
export const DefaultGraphTex: Partial<ITexture> = {
  type: 'float',
  target: 'texture2d',
  format: 'rgba',
  internalFormat: 'rgba32-float',
  flipY: false,
  mipmaps: false,
  minFilter: 'nearest',
  magFilter: 'nearest',
  alignment: 1,
  wrapU: 'repeat',
  wrapV: 'repeat',
  wrapW: 'repeat',
};
