import './Header.css'

import AtlasLogoDark from '@assets/atlas-logo-dark.svg'
import AtlasLogoLight from '@assets/atlas-logo-light.svg'

import { SearchBar } from './buttons/SearchBar'
import { ResetCamera } from './buttons/ResetCamera'
import { FilterToggle } from './buttons/FilterToggle'
import { CurrentTheme } from '../ThemeSwitch'
import { ThemeSwitch, ThemeCallback } from '../ThemeSwitch'
import { AtlasRecord, AtlasSpeciality, FilterType } from '@/explorer/types'

import { Component, JSX } from 'solid-js'
import { CreateSelectValue } from '@thisbeyond/solid-select'

const Header: Component<{
  onSelection: (selection: AtlasRecord | null) => void,
  getSearchOpts: (inputValue: string) => CreateSelectValue,
  getFilterTargets: () => AtlasSpeciality[],
  onFilterChanged: (filterType: FilterType, ...params: any[]) => void,
  onThemeChanged?: ThemeCallback,
  onResetCamera?: () => void
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
