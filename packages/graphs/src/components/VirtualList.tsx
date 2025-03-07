'use client';

import { JSX } from 'react';
import { INode } from '@atlas-explorer/force-graph';
import { VariableSizeList } from 'react-window';
import { CSSProperties, useEffect, useRef } from 'react';
import { Box, MenuItem, Paper, useColorScheme } from '@mui/material';

/**
 * @desc
 * @type {number}
 * @constant
 */
const DEFAULT_HEIGHT: number = 8;

/**
 * @desc
 *
 * @param param0
 *
 * @returns {JSX.Element}
 */
export default function VirtualList({
  data,
  width,
  maxHeight,
  selectItem,
}: {
  data: INode[];
  width: number;
  maxHeight: number;
  selectItem: (id: number | null) => void;
}): JSX.Element {
  const { mode } = useColorScheme();

  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef<{ [current: string]: number }>({});

  const getRowHeight = (index: number): number => {
    return rowHeights.current?.[index] || DEFAULT_HEIGHT;
  };

  const setRowHeight = (index: number, size: number): void => {
    if (!listRef.current) {
      return;
    }

    listRef.current.resetAfterIndex(0);
    rowHeights.current = { ...rowHeights.current, [index]: size };
  };

  const renderRow = ({ index, style }: { index: number; style: CSSProperties }): JSX.Element | null => {
    const item = data[index];
    if (!item) {
      return null;
    }

    const rowRef = useRef<HTMLLIElement>(null);
    useEffect(() => {
      if (rowRef.current) {
        setRowHeight(index, rowRef.current.clientHeight);
      }
    }, [rowRef]);

    return (
      <Box sx={{ ...style, p: 0, m: 0 }}>
        <MenuItem ref={rowRef} sx={{ p: '0.25rem' }} onClick={() => selectItem(item.id)}>
          {item.label}
        </MenuItem>
      </Box>
    );
  };

  return (
    <Paper elevation={mode == 'light' ? 2 : 8}>
      <VariableSizeList
        ref={listRef}
        width={width}
        height={maxHeight}
        itemCount={data.length}
        itemSize={getRowHeight}
        style={{ height: '100%', maxHeight: maxHeight }}>
        {renderRow}
      </VariableSizeList>
    </Paper>
  );
}
