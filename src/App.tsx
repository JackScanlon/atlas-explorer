import Explorer from '@/explorer'
import Header from '@components/Header'
import Footer from '@components/Footer'
import Tooltip from '@components/Tooltip'
import InfoPanel from '@components/InfoPanel'
import TweenBanner from './components/TweenBanner'

import { CurrentTheme } from './components/ThemeSwitch'
import { CreateSelectValue } from '@thisbeyond/solid-select'
import { AtlasTooltipTarget, AtlasRecord, AtlasSpeciality, FilterType, AtlasViewState } from './explorer/types'
import { onCleanup, Component, createEffect, JSX, createSignal } from 'solid-js'

export const App: Component<{ root: HTMLElement }> = ({ root }): JSX.Element => {
  const [viewState, setViewState] = createSignal<AtlasViewState>(AtlasViewState.RadialView);
  const [targetData, setTargetData] = createSignal<AtlasRecord | null>(null);
  const [tooltipTarget, setTooltipTarget] = createSignal<AtlasTooltipTarget | null>(null);

  // Initialise explorer context
  const explorer = new Explorer({
    Theme: CurrentTheme(),
    Interaction: {
      TargetSetter: setTargetData,
      TooltipSetter: setTooltipTarget,
    },
  });

  // Hook
  createEffect(() => {
    explorer.SetRoot({ Root: root });
    explorer.canvas.focus();
  });

  onCleanup(() => explorer.dispose());

  // Draw overlay
  return (
    <>
      <TweenBanner />
      <Header
        onSelection={(selection: AtlasRecord | null): void => explorer.FocusTarget(selection)}
        getSearchOpts={(_value: string): CreateSelectValue => explorer.records}
        getFilterTargets={(): AtlasSpeciality[] => explorer.specialities}
        onFilterChanged={(filterType: FilterType, ...params: any[]): void => { explorer.SetFilter(filterType, ...params); }}
        onThemeChanged={explorer.SetTheme.bind(explorer)}
        onResetCamera={explorer.ResetCamera.bind(explorer)}
        viewState={viewState}
        onViewToggled={() => setViewState(explorer.ToggleViewState().GetViewState()) }/>
      <Footer />
      <Tooltip target={tooltipTarget} />
      <InfoPanel
        data={targetData}
        onClick={() => setTargetData(null)}
        getRelOpts={explorer.GetRelationships.bind(explorer)}
        onSelection={(selection: AtlasRecord | null): void => explorer.FocusTarget(selection)} />
    </>
  )
}
