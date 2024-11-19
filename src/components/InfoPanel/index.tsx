import './InfoPanel.css'

import { AtlasRecord } from '@/explorer/types'
import { createStored } from '@/utils';

import * as rx from 'rxjs'

import { VirtualList } from '@solid-primitives/virtual';
import { BsArrowsAngleContract, BsArrowsAngleExpand, BsXLg, BsFunnel, BsFunnelFill } from 'solid-icons/bs'
import { Component, Accessor, createSignal, createEffect, on, Show, observable, onCleanup } from 'solid-js'

const featureTooltipTimeout = 60 * 60 * 4; // i.e. 4hr
const getSecondsTimestamp = (): number => Math.floor(Date.now() / 1000);

interface FeatureTooltipState {
  IsOpen: boolean,
  ShouldPresent: boolean,
  LastPresented: number,
};

const InfoPanel: Component<{
  data: Accessor<AtlasRecord | null>,
  onClick?: () => void,
  getRelOpts: (organ: string) => AtlasRecord[],
  onSelection: (selection: AtlasRecord | null) => void
}> = ({ data, onClick, getRelOpts, onSelection }) => {
  const [featureTooltip, setFeatureToolip] = createStored<FeatureTooltipState>(
    'showFeatures',
    { ShouldPresent: true, LastPresented: 0, IsOpen: false }
  );

  const [minimised, setMinimised] = createSignal<boolean>(true);
  const [showFilter, setShowFilter] = createSignal<boolean>(false);
  const [relationships, setRelationships] = createSignal<AtlasRecord[]|null>(null);

  createEffect(on(data, () => {
    setShowFilter(false);
    setMinimised(false);

    if (data()) {
      setRelationships(getRelOpts(data()!.OrganRef))
    };
  }));

  const featureWatchdog = rx.combineLatest([
    rx.from(observable(showFilter))
      .pipe(
        rx.startWith(false),
        rx.pairwise(),
        rx.map(([previous, current]) => ({ previous, current }))
      ),
    rx.from(observable(data))
      .pipe(
        rx.startWith(null),
        rx.pairwise(),
        rx.map(([previous, current]) => ({ previous, current }))
      ),
    rx.from(observable(minimised))
      .pipe(
        rx.startWith(true),
        rx.pairwise(),
        rx.map(([previous, current]) => ({ previous, current }))
      ),
  ])
    .subscribe(result => {
      const [filterState, dataState, minimisedState] = result;
      if (!!filterState.current && featureTooltip().ShouldPresent) {
        setFeatureToolip({ ShouldPresent: false, LastPresented: getSecondsTimestamp(), IsOpen: false });
      } else if (!filterState.current && dataState.current && !minimisedState.current) {
        if (!featureTooltip().ShouldPresent && getSecondsTimestamp() - featureTooltip().LastPresented > featureTooltipTimeout) {
          setFeatureToolip((prev: FeatureTooltipState): FeatureTooltipState => {
            return { ...prev, ... { ShouldPresent: true }}
          });
        }
      }

      if (!filterState.current && dataState.current && featureTooltip().ShouldPresent) {
        setFeatureToolip((prev: FeatureTooltipState): FeatureTooltipState => {
          return { ...prev, ... { IsOpen: !minimisedState.current }};
        });
      } else if (!filterState.current && !featureTooltip().ShouldPresent && featureTooltip().IsOpen) {
        setFeatureToolip((prev: FeatureTooltipState): FeatureTooltipState => {
          return { ...prev, ... { IsOpen: false }};
        });
      }
    });

  onCleanup(() => {
    featureWatchdog.unsubscribe();
  });

  const toggleFilter = () => {
    if (minimised()) {
      setMinimised(false);
    }

    setShowFilter(!showFilter());
  }

  const renderFilterData = () => {
    return (
      <>
        <main class='info-card__relationships thin-scrollbar-children'>
          <VirtualList
            each={relationships()}
            fallback={<div> No Related Diseases </div>}
            overscanCount={10}
            rootHeight={350}
            rowHeight={25}>
              {
                item =>
                  <Show when={!data() || item.Id !== data()?.Id}>
                    <button class='related-button' onClick={() => onSelection(item)}>
                      <p>
                        {item.Name}
                      </p>
                    </button>
                  </Show>
              }
          </VirtualList>
        </main>
        <footer class='info-card__footer'>
          <div class='info-card__atlas'>
            <p><strong>View features in Atlas for Health</strong></p>
            <a target='_blank' rel='noopener' href={`https://atlasofhumandisease.org/disease/${data()?.SlugRef}`}>{data()?.Name || data()?.SlugRef}</a>
          </div>
        </footer>
      </>
    )
  }

  const renderCardData = () => {
    return (
      <>
        <main class='info-card__grid thin-scrollbar'>
          <div class='info-card__attribute'>
            <h4>Name</h4>
            <p>{data()?.Name}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Phecode</h4>
            <p>{data()?.Phecode}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Speciality</h4>
            <p>{data()?.SystemSpeciality}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Organ</h4>
            <p>{data()?.OrganTarget}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Category</h4>
            <p>{data()?.Category}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Median age at first record</h4>
            <p>{data()?.Age}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Frequency</h4>
            <p>{data()?.Frequency}</p>
          </div>
          <div class='info-card__attribute'>
            <h4>Excess mortality at one year</h4>
            <p>{data()?.Mortality}</p>
          </div>
        </main>
        <footer class='info-card__footer'>
          <div class='info-card__atlas'>
            <p><strong>View features in Atlas for Health</strong></p>
            <a target='_blank' rel='noopener' href={`https://atlasofhumandisease.org/disease/${data()?.SlugRef}`}>{data()?.Name || data()?.SlugRef}</a>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      <article classList={{
        'info-card': true,
        'info-card--visible': data() !== null,
        'info-card--minimised': minimised()
      }}>
        <header class='info-card__header'>
          {
            !showFilter()
              ? <h3>Disease</h3>
              : <h3>Related Diseases by Organ</h3>
          }
          <div class='info-card__actions'>
            <Show when={!!relationships()}>
              <button
                onClick={() => setFeatureToolip((prev: FeatureTooltipState) => ({ ...prev, ... { IsOpen: false }}))}
                classList={{
                  'feature-tooltip': true,
                  'feature-tooltip--static-filter': true,
                  'feature-tooltip--visible': !minimised() && featureTooltip().IsOpen,
                  'feature-tooltip--seen': !featureTooltip().ShouldPresent,
                  'feature-tooltip--hidden': featureTooltip().ShouldPresent && !featureTooltip().IsOpen,
                }}
              >
                <p>Find related diseases here!</p>
              </button>
              <button class='info-card__close-button' onClick={() => toggleFilter()}>
                {
                  !showFilter()
                    ? <BsFunnel title='View Related Diseases' size={'24px'} />
                    : <BsFunnelFill title='Hide Related Diseases' size={'24px'} />
                }
              </button>
            </Show>
            <button class='info-card__close-button' onClick={() => setMinimised(prev => !prev)}>
              {
                !minimised()
                  ? <BsArrowsAngleContract title='Minimise Panel' size={'24px'} />
                  : <BsArrowsAngleExpand title='Maximise Panel' size={'24px'} />
              }
            </button>
            <button class='info-card__close-button' onClick={onClick}>
              <BsXLg title='Close Panel' size={'24px'} />
            </button>
          </div>
        </header>
        <Show when={data !== null && !showFilter()}>
          { renderCardData() }
        </Show>
        <Show when={data !== null && showFilter()}>
          { renderFilterData() }
        </Show>
      </article>
    </>
  )
};

export default InfoPanel;
