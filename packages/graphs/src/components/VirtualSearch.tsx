'use client';

import Fuse from 'fuse.js';
import VirtualList from '@graph/components/VirtualList';

import { JSX } from 'react';
import { INode } from '@atlas-explorer/force-graph';
import { Container, TextField } from '@mui/material';
import { Dispatch, SetStateAction, FocusEvent, ChangeEvent, useState } from 'react';

/**
 * @desc
 *
 * @param param0
 *
 * @returns {JSX.Element}
 */
export default function VirtualSearch({
  data,
  setFocus,
  selectItem,
}: {
  data: INode[];
  setFocus: Dispatch<SetStateAction<boolean>>;
  selectItem: (id: number | null) => void;
}): JSX.Element {
  const [filteredData, setFilteredData] = useState<INode[]>(data);

  const handleBlur = (event: FocusEvent<HTMLDivElement, Element>) => {
    if (event.relatedTarget) {
      return;
    }

    setFocus(false);
  };

  const handleSelection = (id: number | null) => {
    selectItem(id);
    setFocus(false);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    if (!query.length) {
      setFilteredData(data);
      return;
    }

    const fuse = new Fuse(data, {
      shouldSort: true,
      keys: ['label', 'phecode'],
    });

    const result = fuse.search(event.target.value).map(({ item }) => item);
    setFilteredData(result);
  };

  return (
    <Container onBlur={handleBlur}>
      <TextField
        autoFocus
        autoComplete='off'
        label='Search'
        sx={{
          width: '250px',
          backgroundColor: theme => theme.palette.background.default,
        }}
        onChange={handleSearch}
      />
      <VirtualList width={250} maxHeight={250} data={filteredData} selectItem={handleSelection} />
    </Container>
  );
}
