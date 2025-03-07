import { ExplorerCtxProviderProps } from '@graph/context/ExplorerDataContextProvider';

/**
 * @desc metadata & variables associated with a disease/medication node
 */
interface SelectedInfoMetadata {
  Sex: string;
  Type: string;
  Tag: string;
  Category: string;
  Organ: string;
  Speciality: string;
}

/**
 * @desc top-level data associated with a disease/medication node
 */
export interface SelectedInfo {
  Label: string;
  Url: string;
  Metadata: SelectedInfoMetadata;
}

/**
 * @desc describes a filterable item, _e.g._ the speciality assoc. with some disease
 */
export interface FilterListItem {
  id: number;
  label: string;
  hex: string | undefined;
  visible: boolean;
}

/**
 * @desc AtlasExplorer component props
 * @see {@link ExplorerCtxProviderProps}
 *
 * @property {string}                 [atlasUrl]    the target URL for a disease/medication on the Atlas website, defaults to `https://atlasofhumandisease.org/disease/${target}`
 * @property {GraphDataset}           [graph]       optionally specify a pre-prepared {@link GraphDataset} wrapping graph data & configs
 * @property {IGraphSavedState}       [state]       optionally specify a pre-prepared {@link IGraphSavedState} describing the node/edge data
 * @property {React.ReactNode}        [children]    the value of the children prop received by your component
 * @property {string}                 [stateTarget] optionally specify the URL target of the saved state output; _i.e._ combined & compressed node/edge data
 * @property {ExplorerCtxDataTargets} [dataTargets] optionally specify individual URL targets assoc. with {@link ExplorerCtxDataTargets}
 */
export type ExplorerViewProps = Omit<ExplorerCtxProviderProps, 'children'> & {
  atlasUrl?: string;
};
