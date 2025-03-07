'use client';

import VirtualSearch from '@graph/components/VirtualSearch';

import { JSX } from 'react';
import { INode } from '@atlas-explorer/force-graph';
import { FilterListItem } from '@graph/types';
import { useState, MouseEvent, ChangeEvent } from 'react';
import { Search, CameraAltOutlined, FilterAltOutlined, CheckBoxOutlined, CheckBoxOutlineBlankOutlined } from '@mui/icons-material';
import { Container, Box, IconButton, Menu, MenuItem, FormControlLabel, Checkbox, checkboxClasses, Typography } from '@mui/material';

/**
 * @desc
 *
 * @param param0
 *
 * @returns {JSX.Element}
 */
export default function FloatingActionBar({
  selectItem,
  searchData,
  filterData,
  resetCameraCallback,
  toggleFilterCallback,
  toggleAllFiltersCallback,
}: {
  selectItem: (id: number | null) => void;
  searchData: INode[];
  filterData: FilterListItem[];
  resetCameraCallback: () => void;
  toggleFilterCallback: (id: number, state: boolean) => void;
  toggleAllFiltersCallback: (state: boolean) => void;
}): JSX.Element {
  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
  const [isFocusedSearch, setSearchFocus] = useState<boolean>(false);

  const selectionStatus = filterData.every(e => Boolean(e.visible));

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => setAnchorElement(event.currentTarget);
  const handleClose = (): void => setAnchorElement(null);
  const handleFilterChecked = (event: ChangeEvent<HTMLInputElement>, id: number): void => toggleFilterCallback(id, event.target.checked);
  const handleFilterToggle = (): void => toggleAllFiltersCallback(!selectionStatus);

  return (
    <Container
      disableGutters
      maxWidth={false}
      sx={{
        position: 'absolute',
        width: 'auto',
        right: '0.5rem',
        top: '0.5rem',
      }}>
      <Box
        sx={{
          display: 'flex',
          p: '0.5rem',
          flexDirection: { xs: 'column', sm: 'row' },
        }}>
        {isFocusedSearch ? (
          <VirtualSearch setFocus={setSearchFocus} selectItem={selectItem} data={searchData} />
        ) : (
          <>
            <IconButton onClick={() => setSearchFocus(true)}>
              <Search />
            </IconButton>
            <IconButton onClick={handleClick}>
              <FilterAltOutlined />
            </IconButton>
            <IconButton onClick={resetCameraCallback}>
              <CameraAltOutlined />
            </IconButton>

            <Menu
              id='filter-menu'
              anchorEl={anchorElement}
              open={Boolean(anchorElement)}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{
                paper: {
                  style: {
                    maxHeight: 250,
                  },
                },
              }}>
              <MenuItem sx={{ display: 'flex', flexWrap: 'wrap' }} onClick={handleFilterToggle}>
                <Typography>Specialities</Typography>
                {selectionStatus ? (
                  <CheckBoxOutlined sx={{ marginLeft: 'auto' }} />
                ) : (
                  <CheckBoxOutlineBlankOutlined sx={{ marginLeft: 'auto' }} />
                )}
              </MenuItem>
              {filterData.map(item => {
                return (
                  <MenuItem key={item.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.visible}
                          onChange={event => handleFilterChecked(event, item.id)}
                          sx={{
                            [`&, &.${checkboxClasses.checked}`]: {
                              color: item.hex,
                            },
                          }}
                        />
                      }
                      labelPlacement='end'
                      value={item.label}
                      label={item.label}
                    />
                  </MenuItem>
                );
              })}
            </Menu>
          </>
        )}
      </Box>
    </Container>
  );
}
