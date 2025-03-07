'use client';

import { createContext, useContext } from 'react';
import { type GraphDataset } from '@atlas-explorer/force-graph';

export const ExplorerDataContext = createContext<GraphDataset | null>(null);

/**
 * @desc react hook to subscribe to the context provider
 *
 * @returns {GraphDataset|null} a nullable {@link GraphDataset}
 */
export const useExplorerCtx = (): GraphDataset | null => useContext(ExplorerDataContext);
