import * as CSV from 'csv-parse';

import type { INode, IEdge } from './types';
import type { TypedArray, TypedArrayBufferContructor } from '@engine/core';
import { NumType, parseSafeNumber, tryParseNumber, isValidString } from '@network/common';

/**
 * @desc
 *
 * @param {TypedArray} value
 *
 * @returns {string}
 */
export const getTypedArrayName = (value: TypedArray): string => {
  switch (value.constructor) {
    case Uint8Array:
      return 'Uint8Array';

    case Uint8ClampedArray:
      return 'Uint8ClampedArray';

    case Uint16Array:
      return 'Uint16Array';

    case Uint32Array:
      return 'Uint32Array';

    case Int8Array:
      return 'Int8Array';

    case Int16Array:
      return 'Int16Array';

    case Int32Array:
      return 'Int32Array';

    case Float32Array:
    default:
      // i.e. Float16Array, Float32Array etc
      return 'Float32Array';
  }
};

/**
 * @desc
 *
 * @param {string} encodedData
 * @param {string} dataType
 *
 * @returns {TypedArray}
 */
export const buildTypedArray = (encodedData: string, dataType: string): TypedArray => {
  let cls: TypedArrayBufferContructor<TypedArray> | undefined;
  switch (dataType) {
    case 'Uint8Array':
      cls = Uint8Array;
      break;

    case 'Uint8ClampedArray':
      cls = Uint8ClampedArray;
      break;

    case 'Uint16Array':
      cls = Uint16Array;
      break;

    case 'Uint32Array':
      cls = Uint32Array;
      break;

    case 'Int8Array':
      cls = Int8Array;
      break;

    case 'Int16Array':
      cls = Int16Array;
      break;

    case 'Int32Array':
      cls = Int32Array;
      break;

    case 'Float32Array':
      cls = Float32Array;
      break;

    default:
      break;
  }

  const bytes = Uint8Array.from(atob(encodedData), c => c.charCodeAt(0));
  if (!cls) {
    return bytes;
  }

  return new cls(bytes.buffer) as TypedArray;
};

/**
 * @desc
 *
 * @param {*} _key
 * @param {*} obj
 *
 * @returns {*}
 */
export const jsonStateTransformer = (_key: any, obj: any): any => {
  if (obj instanceof Map) {
    return { value: Array.from(obj.entries()), dataType: 'Map' };
  } else if (ArrayBuffer.isView(obj)) {
    const data = btoa(new Uint8Array(obj.buffer).reduce((res, x) => res + String.fromCharCode(x), ''));
    return { value: data, dataType: getTypedArrayName(obj as TypedArray) };
  }

  return obj;
};

/**
 * @desc
 *
 * @param {*} _key
 * @param {*} obj
 *
 * @returns {*}
 */
export const jsonStateParser = (_key: any, obj: any): any => {
  if (obj !== null && typeof obj === 'object' && typeof obj.dataType === 'string') {
    if (obj.dataType === 'Map') {
      return new Map(obj.value);
    } else if (obj.dataType.endsWith('Array')) {
      return buildTypedArray(obj.value, obj.dataType);
    }
  }

  return obj;
};

/**
 * @todo we should create a color cls and merge it into some `color.ts` file at some point
 *
 * @param hex
 * @param fallback
 *
 * @returns
 */
export const hex2rgb = (hex: string, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] => {
  const res = hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1)
    .match(/.{2}/g);

  const inv = 1 / 255;
  return res ? (res.map(x => parseInt(x, 16) * inv) as [number, number, number]) : fallback;
};

/**
 *
 * @param target
 * @param opts
 *
 * @returns
 */
export const fetchDataset = async <T extends object = Array<string>>(
  target: string,
  opts?: {
    reqOpts?: RequestInit;
    rowCallback?: (row: Array<string>, headers: Record<string, number>) => T | undefined | null;
  }
): Promise<Array<T>> => {
  const { reqOpts, rowCallback } = opts ?? {};

  return fetch(target, reqOpts).then(response => {
    if (response.body === null || typeof response.body === 'undefined') {
      throw new Error('No response body');
    }

    return new Promise<T[]>(async (resolve, reject) => {
      const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
      const parser = CSV.parse({ delimiter: ',' });

      const records: Array<T> = [];
      parser.on('error', (...args: any[]) => reject(...args));
      parser.on('end', () => resolve(records));

      let headers: Nullable<Record<string, number>> = undefined;
      parser.on('readable', () => {
        let record: Nullable<Array<string>>;
        while (!!(record = parser.read())) {
          if (!Array.isArray(record)) {
            continue;
          }

          if (rowCallback) {
            if (!headers) {
              headers = {};
              for (let i = 0; i < record.length; ++i) {
                headers[record[i]] = i;
              }

              continue;
            }

            const result: Nullable<T> = !!rowCallback ? rowCallback(record, headers) : null;
            if (result) {
              records.push(result);
            }

            continue;
          }

          records.push(record as any);
        }
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          parser.end();
          break;
        }

        parser.write(value);
      }
    });
  });
};

/**
 * @desc
 *
 * @param id
 * @param phecode
 * @param row
 * @param headers
 *
 * @returns
 */
export const processNodeRow = (id: number, phecode: string, row: string[], headers: Record<string, number>): Nullable<INode> => {
  const phenotype = row?.[headers.phenotype];
  if (!isValidString(phenotype)) {
    return null;
  }

  let slug = row?.[headers.slug];
  if (!isValidString(slug)) {
    slug = phenotype.toLocaleLowerCase().replace(/\s/gm, '-');
  }

  return {
    id: id,
    static: false,
    inDegree: 0,
    outDegree: 0,

    slug: slug,
    phecode: phecode,
    label: phenotype,

    sexId: parseSafeNumber(row?.[headers.sexId], NumType.Int, -1),
    tagId: parseSafeNumber(row?.[headers.tagId], NumType.Int, -1),
    typeId: parseSafeNumber(row?.[headers.typeId], NumType.Int, -1),
    organId: parseSafeNumber(row?.[headers.organId], NumType.Int, -1),
    categoryId: parseSafeNumber(row?.[headers.categoryId], NumType.Int, -1),
    specialityId: parseSafeNumber(row?.[headers.specialityId], NumType.Int, -1),
  };
};

/**
 * @desc
 *
 * @param id
 * @param i0
 * @param i1
 * @param row
 * @param headers
 *
 * @returns
 */
export const processEdgeRow = (
  id: number,
  i0: number,
  i1: number,
  row: Array<string>,
  headers: Record<string, number>
): Nullable<IEdge> => {
  const weight = tryParseNumber(row?.[headers.weight], NumType.F64);
  const prevRatio = tryParseNumber(row?.[headers.prevRatio], NumType.F64);
  const prevalence = tryParseNumber(row?.[headers.prevalence], NumType.F64);
  if ([weight, prevRatio, prevalence].some(x => typeof x !== 'number')) {
    return null;
  }

  return {
    id: id,
    source: i0,
    target: i1,
    weight: weight!,
    prevRatio: prevRatio!,
    prevalence: prevalence!,
  };
};
