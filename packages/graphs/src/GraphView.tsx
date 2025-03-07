'use client';

import NestedDrawer from '@graph/components/NestedDrawer';
import FloatingLogo from '@graph/components/FloatingLogo';
import FloatingActionBar from '@graph/components/FloatingActionBar';

import { JSX, useMemo } from 'react';
import { useExplorerCtx } from '@graph/context/ExplorerDataContext';
import { Container, Tooltip } from '@mui/material';
import { ExplorerDataContextProvider } from '@graph/context';
import { useEffect, useRef, useState } from 'react';
import { ExplorerViewProps, FilterListItem, SelectedInfo } from '@graph/types';
import { GraphRuntime, GraphTargetNode, INode } from '@atlas-explorer/force-graph';

/**
 * @desc AtlasExplorer component props
 * @see {@link ExplorerViewProps}
 * @see {@link ExplorerCtxProviderProps}
 * @type {ExplorerViewProps}
 * @constant
 */
const DefaultExplorerProps: ExplorerViewProps = {
  atlasUrl: 'https://atlasofhumandisease.org/disease/${target}',
};

/**
 * @desc The inner component of the Explorer graph component
 *
 * @param {ExplorerViewProps} props see defautls {@link ExplorerViewProps}
 *
 * @returns {JSX.Element}
 */
const ExplorerContainer = (props: ExplorerViewProps): JSX.Element => {
  const graphCtx = useExplorerCtx();

  const cntRef = useRef<HTMLDivElement>(null);
  const cnvRef = useRef<HTMLCanvasElement>(null);

  const [graph, setGraph] = useState<GraphRuntime | null>(null);
  const [nodeList, setNodeList] = useState<INode[]>([]);
  const [filterList, setFilterList] = useState<FilterListItem[]>([]);
  const [tooltipInfo, setTooltipInfo] = useState<string>('');
  const [selectedItemInfo, setSelectedItemInfo] = useState<SelectedInfo | null>(null);

  const canvas = useMemo<any>(() => <canvas ref={cnvRef} style={{ width: '100%', height: '100%' }} />, []);

  const handleCameraReset = (): void => {
    if (!graph) {
      return;
    }

    graph.resetCamera();
  };

  const handleFilterToggle = (id: number, state: boolean): void => {
    if (!graph) {
      return;
    }

    graph.toggleFilter(id, state);
  };

  const handleAllFilterToggle = (state: boolean): void => {
    if (!graph) {
      return;
    }

    graph.toggleAllFilters(state);
  };

  const handleSelectItem = (id: number | null): void => {
    if (!graph) {
      return;
    }

    graph.setSelection(id);
  };

  useEffect(() => {
    if (!graphCtx) {
      return;
    }

    const elem = cnvRef.current;
    if (!elem) {
      if (graph) {
        graph.dispose();
      }

      setGraph(null);
      return;
    }

    if (graph) {
      return;
    }

    const runtime = new GraphRuntime({
      graph: graphCtx,
      element: elem,
      attributes: {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
      },
      autoclear: false,
    });

    runtime.pushDisposables(
      runtime.tooltipItem.changedSignal.connect((item: GraphTargetNode | null) => setTooltipInfo(item ? item.target.label : '')),

      runtime.selectedItem.changedSignal.connect((item: INode | null) => {
        if (!item) {
          setSelectedItemInfo(null);
          return;
        }

        const metadata = runtime.graph.metadata;
        const itemInfo: SelectedInfo = {
          Label: item.label,
          Url: new Function('target', `return \`${props.atlasUrl}\`;`)(item.slug),
          Metadata: {
            Sex: metadata.sexId.get(item.sexId) ?? '',
            Type: metadata.typeId.get(item.typeId) ?? '',
            Tag: metadata.tagId.get(item.tagId) ?? '',
            Category: metadata.categoryId.get(item.categoryId) ?? '',
            Organ: metadata.organId.get(item.organId) ?? '',
            Speciality: metadata.specialityId.get(item.specialityId) ?? '',
          },
        };

        setSelectedItemInfo(itemInfo);
      }),

      runtime.filterSignal.connect((filters: number[]) => {
        const filter: FilterListItem[] = [...runtime.graph.metadata.specialityId].map(([key, value]) => {
          return {
            id: key,
            label: value,
            hex: runtime.graph.metadata.palettes.specialityId[key],
            visible: Boolean(filters?.[key] ?? 0),
          };
        });

        setFilterList(filter);
      }),

      runtime.loadingSignal.connect(() => {
        setNodeList(runtime.graph.nodes || []);
      })
    );

    setGraph(runtime);
    return () => runtime.dispose();
  }, [graphCtx]);

  if (!graphCtx) {
    return <></>;
  }

  return (
    <Container disableGutters ref={cntRef} maxWidth={false} sx={{ height: '100%', position: 'relative' }}>
      <FloatingLogo />
      <FloatingActionBar
        resetCameraCallback={handleCameraReset}
        toggleFilterCallback={handleFilterToggle}
        toggleAllFiltersCallback={handleAllFilterToggle}
        selectItem={handleSelectItem}
        searchData={nodeList}
        filterData={filterList}
      />
      <Tooltip title={tooltipInfo} followCursor>
        {canvas}
      </Tooltip>
      <NestedDrawer parentRef={cntRef} setSelection={handleSelectItem} selection={selectedItemInfo} />
    </Container>
  );
};

/**
 * @desc The `ExplorerView` component renders a force-directed graph whose layout is either pre-computed or to be simulated
 * @note styled using `@mui/material`'s {@link ColorScheme}
 *
 * @param {ExplorerViewProps} [props] component props, see {@link ExplorerViewProps}
 *
 * @returns {JSX.Element}
 */
export const ExplorerView = (props?: ExplorerViewProps): JSX.Element => {
  props = { ...DefaultExplorerProps, ...(props ?? {}) };
  return (
    <ExplorerDataContextProvider {...props}>
      <ExplorerContainer atlasUrl={props.atlasUrl} />
    </ExplorerDataContextProvider>
  );
};
