'use client';

import { JSX } from 'react';
import { Close } from '@mui/icons-material';
import { RefObject } from 'react';
import { SelectedInfo } from '../types';
import { Drawer, Box, Typography, Divider, Button, IconButton, Chip, type SxProps, type Theme } from '@mui/material';

/**
 * @desc
 * @type {SxProps<Theme>}
 * @constant
 */
const drawerStyle: SxProps<Theme> = {
  position: 'absolute',
  '& .MuiPaper-root': {
    position: 'absolute',
    transition: 'none !important',
  },
  '& .MuiBackdrop-root': {
    backgroundColor: 'transparent',
  },
};

/**
 * @desc
 *
 * @param param0
 *
 * @returns {JSX.Element}
 */
export default function NestedDrawer({
  parentRef,
  selection,
  setSelection,
}: {
  parentRef: RefObject<HTMLDivElement | null>;
  selection: SelectedInfo | null;
  setSelection: (id: number | null) => void;
}): JSX.Element {
  return (
    <Drawer
      container={parentRef?.current}
      ModalProps={{ container: parentRef?.current }}
      anchor='bottom'
      sx={drawerStyle}
      open={!!selection}
      onClose={() => setSelection(null)}>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', paddingBottom: '0.25rem' }}>
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            {selection?.Label}
          </Typography>
          <Box sx={{ display: 'flex', marginLeft: 'auto' }}>
            <Button {...{ target: '_blank', rel: 'noreferrer' }} href={selection?.Url}>
              View on Atlas
            </Button>
            <IconButton onClick={() => setSelection(null)}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: 'column', marginTop: 2, gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selection ? (
              Object.entries(selection.Metadata).reduce((result, [key, value]) => {
                if (typeof value !== 'string' || !value.length) {
                  return result;
                }

                result.push(<Chip label={`${key}: ${value}`} variant='outlined' key={key} />);
                return result;
              }, [] as JSX.Element[])
            ) : (
              <></>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
