import '../Header.css'

import { AtlasViewState } from '@/explorer/types';

import { BsPieChart, BsFileBarGraph } from 'solid-icons/bs'
import { Switch, Match, Component, Accessor } from 'solid-js'

export const ViewToggle: Component<{
  viewState: Accessor<AtlasViewState>,
  onClick?: () => void
}> = ({ viewState, onClick }) => {
  return (
    <button class='icon-button' onClick={onClick}>
      <Switch>
        <Match when={viewState() === AtlasViewState.RadialView}>
          <BsFileBarGraph title='View to Scatter Plot' size={'24px'} />
        </Match>
        <Match when={viewState() === AtlasViewState.ScatterView}>
          <BsPieChart title='View Categorical Plot' size={'24px'} />
        </Match>
      </Switch>
    </button>
  );
};
