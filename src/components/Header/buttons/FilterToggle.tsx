import '../Header.css'

import { eventTargetIsNode } from '@/utils'
import { AtlasSpeciality, AxisFlag, AxisToggleTarget, FilterType } from '@/explorer/types';

import { makeRetrying } from '@solid-primitives/resource'
import { BsCheck2Square, BsSortAlphaDown, BsXSquare } from 'solid-icons/bs'
import { createStore, SetStoreFunction } from 'solid-js/store';
import {
  JSX, Component, createSignal,
  onCleanup, onMount, createRenderEffect,
  createResource, For, Show,
  createEffect, on,
  Setter,
} from 'solid-js'

type PanelOffset = {
  panelRight: number,
  panelTop: number,
  arrowLeft: number
};

type SpecialityFilter = {
  Id: number,
  Name: string,
  Visible: boolean,
}

enum SelectionState {
  AllSelected     = 0,
  AllDeselected   = 1,
  CustomSelection = 2,
}

const recomputeOffset = (
  btn: HTMLButtonElement | undefined,
  panel: HTMLElement | undefined,
  setter: Setter<PanelOffset | undefined>
): void => {
  if (!btn || !panel) {
    setter(undefined);
    return;
  }

  const btnRect = btn.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  const panelTop = btnRect.bottom + btnRect.top;
  const iconRight = window.innerWidth - btnRect.right + btnRect.width*0.5;
  const panelRight = Math.max(iconRight - panelRect.width*0.5, 8);

  const arrowLeft = ((btnRect.left - panelRect.left + 6) / (panelRect.width - btnRect.width*0.5))*100;
  setter({
    panelRight: panelRight,
    panelTop: panelTop,
    arrowLeft: Math.max(Math.min(arrowLeft, 92), 8),
  });
}

export const SpecialityFilterList: Component<{
  targets: SpecialityFilter[],
  setTargets: SetStoreFunction<SpecialityFilter[]>,
}> = ({ targets, setTargets }): JSX.Element => {
  const [selectionState, setSelectionState] = createSignal<SelectionState>(SelectionState.AllSelected);

  const toggleGlobalSelection = (event: MouseEvent) => {
    event.stopImmediatePropagation();

    const state = selectionState();
    switch (state) {
      case SelectionState.AllSelected:
      case SelectionState.CustomSelection:
        setTargets(_ => true, 'Visible', _value => false);
        setSelectionState(SelectionState.AllDeselected);
        break;

      case SelectionState.AllDeselected:
        setTargets(_ => true, 'Visible', _value => true);
        setSelectionState(SelectionState.AllSelected);
        break;

      default:
        break;
    }
  }

  return (
    <Show when={!!targets.length} fallback={<></>}>
      <header class='filter-group__header'>
        <h4 class='filter-group__subtitle'>
          Specialities
        </h4>
        <button class='icon-button' onClick={toggleGlobalSelection}>
          {
            selectionState() !== SelectionState.AllDeselected
              ? <BsXSquare title='Deselect All' size={'1.5em'} />
              : <BsCheck2Square title='Select All' size={'1.5em'} />
          }
        </button>
      </header>
      <For each={targets}>
        {(speciality) =>
          <section class='filter-group__item'>
            <input
              id={`speciality-toggle-${speciality.Id}`}
              type='checkbox'
              onChange={() => {
                setTargets(obj => obj.Id === speciality.Id, 'Visible', value => !value);
              }}
              {...{ 'checked': speciality.Visible }}
            />
            <label for={`speciality-toggle-${speciality.Id}`}>{speciality.Name}</label>
          </section>
        }
      </For>
    </Show>
  )
}

export const AxesFilterList: Component<{
  flags: AxisFlag[],
  setFlags: SetStoreFunction<AxisFlag[]>,
}> = ({ flags, setFlags }): JSX.Element => {
  return (
    <>
      <h4 class='filter-group__subtitle'>
        Axes
      </h4>
      <For each={flags}>
        {(flag: AxisFlag) =>
          <section class='filter-group__item'>
            <input
              id={`toggle-axes-${flag.Target}`}
              type='checkbox'
              class='switch' {...{ 'checked': flag.State }}
              onClick={() => {
                setFlags(obj => obj.Target === flag.Target, 'State', value => !value);
              }}
            />
            <label for={`toggle-axes-${flag.Target}`}>
              {flag?.Toggle ? flag.Toggle[flag.State ? 0 : 1] : ''} {flag.Text}
            </label>
          </section>
        }
      </For>
    </>
  );
}
export const FilterToggle: Component<{
  getFilterTargets: () => AtlasSpeciality[],
  onFilterChanged: (filterType: FilterType, ...params: any[]) => void,
}> = ({ getFilterTargets, onFilterChanged }): JSX.Element => {

  const fetchFilters = makeRetrying(() => {
    const opts = getFilterTargets();
    if (!opts || !opts.length) {
      throw Error();
    }

    return opts.reduce<SpecialityFilter[]>((records: SpecialityFilter[], elem: AtlasSpeciality): SpecialityFilter[] => {
      records.push({ Id: elem.MapId, Name: elem.Name, Visible: true });
      return records;
    }, []);
  }, { retries: Infinity, delay: 250 });

  const [filterTargets] = createResource(fetchFilters);
  const [offset, setOffset] = createSignal<PanelOffset | undefined>(undefined);
  const [active, setActive] = createSignal<boolean>(false);
  const [targets, setTargets] = createStore<SpecialityFilter[]>([]);
  const [axesFlags, setAxesFlags] = createStore<AxisFlag[]>([
    { Text: 'Show Axes Helper', Target: AxisToggleTarget.AxesHelper, State: true },
    { Text: 'Show Axes Labels', Target: AxisToggleTarget.AxesLabels, State: true },
  ]);

  let btnRef: HTMLButtonElement | undefined;
  let panelRef: HTMLElement | undefined;
  let sectionRef: HTMLElement | undefined;

  const resizeHandler = () => {
    recomputeOffset(btnRef, panelRef, setOffset);
  }

  const togglePanel = (event: FocusEvent | MouseEvent): void => {
    if (!eventTargetIsNode(event.target)) {
      return;
    }

    if (btnRef && (btnRef.contains(event.target) || btnRef == event.target)) {
      event.stopImmediatePropagation();
      setActive(prev => !prev);
      recomputeOffset(btnRef, panelRef, setOffset);
    } else if (sectionRef && !sectionRef.contains(event.target) && event.target !== sectionRef) {
      if (event.target.parentNode && event.target.parentElement) {
        setActive(false);
      }
    }
  }

  const setAxesWithEffect: SetStoreFunction<AxisFlag[]> = (...params: any[]): void => {
    (setAxesFlags as any)(...params);

    const visibleTargets = axesFlags.reduce((visible: Record<number, boolean>, obj: AxisFlag): Record<AxisToggleTarget, boolean> => {
      visible[obj.Target] = !!obj.State;
      return visible;
    }, {});

    onFilterChanged(FilterType.AxesToggle, visibleTargets);
  };

  const setTargetsWithEffect: SetStoreFunction<SpecialityFilter[]> = (...params: any[]): void => {
    (setTargets as any)(...params);

    const visibleTargets = targets.reduce((visible: Record<number, boolean>, obj: SpecialityFilter): Record<number, boolean> => {
      visible[obj.Id] = !!obj.Visible;
      return visible;
    }, {});

    onFilterChanged(FilterType.SpecialityFilter, visibleTargets);
  };

  createRenderEffect(() => {
    if (!active()) {
      return;
    }

    setTimeout(() => {
      recomputeOffset(btnRef, panelRef, setOffset);
    }, 0);
  }, {});

  onMount(() => {
    if (!btnRef || !sectionRef) {
      return;
    }

    window.addEventListener('resize', resizeHandler);
    document.addEventListener('click', togglePanel);
    sectionRef.addEventListener('focus', togglePanel);
  });

  createEffect(on(filterTargets, (input: SpecialityFilter[] | undefined) => {
    if (filterTargets.loading || filterTargets.error || !input) {
      return;
    }

    setTargets([...targets, ...input]);
  }));

  onCleanup(() => {
    document.removeEventListener('click', togglePanel);
    window.removeEventListener('resize', resizeHandler);
  });

  return (
    <section class='filter-group' ref={sectionRef}>
      <button class='icon-button' onClick={togglePanel} ref={btnRef}>
        <BsSortAlphaDown title='Toggle Filters' size={'24px'} />
      </button>
      <section
        ref={panelRef}
        style={
          !!offset()
            ? `right: ${offset()!.panelRight}px; top: ${offset()!.panelTop}px;`
            : ''
        }
        classList={{
            'navigation__dropdown': true,
            'navigation__dropdown--active': active(),
        }}
      >
        <div
          class='navigation__dropdown__arrow'
          style={
            !!offset()
              ? `left: ${offset()!.arrowLeft}%;`
              : ''
          }
        />
        <article class='navigation__dropdown__content thin-scrollbar'>
          <AxesFilterList flags={axesFlags} setFlags={setAxesWithEffect} />
          <SpecialityFilterList targets={targets} setTargets={setTargetsWithEffect}/>
        </article>
      </section>
    </section>
  )
};
