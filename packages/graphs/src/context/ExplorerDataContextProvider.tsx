import { ExplorerDataContext } from '@graph/context/ExplorerDataContext';
import { JSX, useState, useEffect } from 'react';
import { GraphDataset, IGraphSavedState } from '@atlas-explorer/force-graph';

/**
 * @desc describes a set of URL targets, resolving to a file target describing the graph data
 *
 * @param {string} [lkup]  optional; defaults to `/data-files/lkup.json`
 * @param {string} [nodes] optional; defaults to `/data-files/node_combined.json`
 * @param {string} [edges] optional; defaults to `/data-files/edge_map.json`
 */
export type ExplorerCtxDataTargets = {
  lkup: string;
  nodes: string;
  edges: string;
};

/**
 * @desc set of optional explorer context provider properties
 *
 * @property {GraphDataset}           [graph]       optionally specify a pre-prepared {@link GraphDataset} wrapping graph data & configs
 * @property {IGraphSavedState}       [state]       optionally specify a pre-prepared {@link IGraphSavedState} describing the node/edge data
 * @property {React.ReactNode}        [children]    the value of the children prop received by your component
 * @property {string}                 [stateTarget] optionally specify the URL target of the saved state output; _i.e._ combined & compressed node/edge data
 * @property {ExplorerCtxDataTargets} [dataTargets] optionally specify individual URL targets assoc. with {@link ExplorerCtxDataTargets}
 */
export type ExplorerCtxProviderProps = {
  graph?: GraphDataset;
  state?: IGraphSavedState;
  children: React.ReactNode;
  stateTarget?: string;
  dataTargets?: ExplorerCtxDataTargets;
};

/**
 * @desc describes a set of URL targets, resolving to a file target describing the graph data
 * @see {@link ExplorerCtxDataTargets}
 * @type {ExplorerCtxDataTargets}
 * @constant
 */
const DefaultDataTargets: ExplorerCtxDataTargets = {
  lkup: '/data-files/lkup.json',
  edges: '/data-files/edge_map.csv',
  nodes: '/data-files/node_combined.csv',
};

/**
 * @desc context provider to store and provide descendant, consuming components with the assoc. {@link GraphDataset}
 *
 * @param {ExplorerCtxProviderProps} param0 see {@link ExplorerCtxProviderProps}
 *
 * @returns {JSX.Element} a `Context.Provider` describing the assoc. graph data
 */
export const ExplorerDataContextProvider = ({
  graph,
  state,
  stateTarget,
  dataTargets,
  children,
}: ExplorerCtxProviderProps): JSX.Element => {
  const [explorerData, setExplorerData] = useState<GraphDataset | null>(null);
  useEffect(() => {
    if (!!graph) {
      setExplorerData(graph);
      return;
    } else if (!!state) {
      setExplorerData(new GraphDataset(state));
      return;
    }

    if (typeof stateTarget === 'string') {
      GraphDataset.LoadSavedState(stateTarget)
        .then(graph => setExplorerData(graph))
        .catch((e: any) => {
          throw new Error(e);
        });

      return;
    }

    GraphDataset.AsSimulation({ ...DefaultDataTargets, ...(dataTargets ?? {}) })
      .then(graph => setExplorerData(graph))
      .catch((e: any) => {
        throw new Error(e);
      });
  }, []);

  return <ExplorerDataContext.Provider value={explorerData}>{children}</ExplorerDataContext.Provider>;
};
