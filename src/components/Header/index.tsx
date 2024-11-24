import './Header.css'

import AtlasLogoDark from '@assets/atlas-logo-dark.svg'
import AtlasLogoLight from '@assets/atlas-logo-light.svg'

import { SearchBar } from './buttons/SearchBar'
import { ViewToggle } from './buttons/ViewToggle'
import { ResetCamera } from './buttons/ResetCamera'
import { FilterToggle } from './buttons/FilterToggle'
import { CurrentTheme } from '../ThemeSwitch'
import { ThemeSwitch, ThemeCallback } from '../ThemeSwitch'
import { AtlasRecord, AtlasSpeciality, AtlasViewState, FilterType } from '@/explorer/types'

import { JSX, Accessor, Component } from 'solid-js'
import { CreateSelectValue } from '@thisbeyond/solid-select'

const Header: Component<{
  onSelection: (selection: AtlasRecord | null) => void,
  getSearchOpts: (inputValue: string) => CreateSelectValue,
  getFilterTargets: () => AtlasSpeciality[],
  onFilterChanged: (filterType: FilterType, ...params: any[]) => void,
  onThemeChanged?: ThemeCallback,
  viewState: Accessor<AtlasViewState>,
  onViewToggled: () => void,
  onResetCamera?: () => void,
}> = (props): JSX.Element => {
  return (
    <>
      <header class='app-header'>
        <section class='app-header__row'>
          <img class='app-header__logo no-user-selection'
              alt='HDRUK Atlas Explorer'
              src={CurrentTheme() === 'dark'? AtlasLogoDark : AtlasLogoLight}
          />
          <nav class='navigation'>
            <SearchBar getOpts={props.getSearchOpts} onChanged={props.onSelection} />
            <ViewToggle viewState={props.viewState} onClick={props.onViewToggled} />
            <FilterToggle getFilterTargets={props.getFilterTargets} onFilterChanged={props.onFilterChanged} />
            <ResetCamera onClick={props?.onResetCamera} />
            <ThemeSwitch onChange={props?.onThemeChanged} />
          </nav>
        </section>
      </header>
    </>
  )
}

export default Header;
