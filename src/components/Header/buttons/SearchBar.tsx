import '../Header.css'

import { AtlasRecord } from '@/explorer/types';

import { BsSearch } from 'solid-icons/bs'
import { makeRetrying } from '@solid-primitives/resource'
import { createSignal, Component, Setter, JSX, JSXElement, createResource } from 'solid-js'

import {
  CreateOptionsOption, CreateSelectValue,
  Select, createOptions, fuzzySearch
} from '@thisbeyond/solid-select'

const fuzzySelect = (searchString: string, options: CreateOptionsOption[], valueFields: string[]): { option: CreateOptionsOption }[] => {
  const sorted = [];
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    const fieldResults = valueFields.reduce(
      (map, target) =>
        map.set(target, fuzzySearch(searchString, option.value[target])),
      new Map(),
    );

    let score = 0;
    for (const [, result] of fieldResults) score += result.score;
    if (score) sorted.push({ score, option, index, fieldResults });
  }

  sorted.sort((a, b) => b.score - a.score || a.index - b.index);
  return sorted;
};

const SearchBox: Component<{
  onChanged: (selection: AtlasRecord | null) => void,
  setRef: Setter<HTMLInputElement | null>,
  options: CreateSelectValue[]
}> = ({ onChanged, setRef, options }): JSX.Element => {
  const [initialValue, setInitialValue] = createSignal(null, { equals: false });

  const formatLabel = (
    value: CreateSelectValue,
    _type: 'value' | 'label',
    _meta: { highlight?: JSXElement; prefix?: string; }
  ): JSXElement => {
    return (value as AtlasRecord).Name;
  }

  const filterable = (inputValue: string, options: CreateOptionsOption[]) => fuzzySelect(
    inputValue,
    options,
    ['Name']
  )
    .map((result) => result?.option);

  return (
    <>
      <Select
        ref={setRef}
        class='thin-scrollbar-children'
        initialValue={initialValue()}
        placeholder={'Search...'}
        emptyPlaceholder={'Search Phenotypes...'}
        onChange={(value: CreateSelectValue): void => {
          if (!value) {
            return;
          }

          onChanged(value as AtlasRecord);
          setInitialValue(null);
        }}
        {...createOptions(options, { format: formatLabel, filterable: filterable })}
      />
    </>
  );
};

export const SearchBar: Component<{
  onChanged: (selection: AtlasRecord | null) => void,
  getOpts: (inputValue: string) => CreateSelectValue
}> = ({ onChanged, getOpts }): JSX.Element => {

  const fetcher = makeRetrying((opt: string) => {
    const opts = getOpts(opt);
    if (!opts || !opts.length) {
      throw Error();
    }

    return opts
  }, { retries: Infinity, delay: 250 });

  const [data] = createResource('', fetcher);
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null);

  const tryFocus = (): void => {
    const ref = inputRef();
    if (!ref) {
      return;
    }

    ref.focus();
  };

  const onChangeCallback = (selection: AtlasRecord|null): void => {
    onChanged(selection);

    const ref = inputRef();
    if (ref) {
      ref.blur();
    }
  }

  return (
    <>
    {
      data.loading || data.error
      ? <></>
      : <>
          <section class='search-group'>
            <button
              class='icon-button'
              onClick={tryFocus}
            >
              <BsSearch title='Reset Camera' size={'24px'} />
            </button>
            <SearchBox options={data()} setRef={setInputRef} onChanged={onChangeCallback} />
          </section>
        </>
    }
    </>
  )
};
