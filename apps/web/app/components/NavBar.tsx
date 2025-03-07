'use client';

import { JSX } from 'react';
import { Container } from '@mui/material';
import { DarkMode, DarkModeOutlined, LocalLibrary } from '@mui/icons-material';
import { useColorScheme, AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';

export default function NavBar(): JSX.Element | null {
  const { mode, setMode } = useColorScheme();

  return (
    <AppBar position='static'>
      <Container maxWidth='lg'>
        <Toolbar variant='dense' disableGutters>
          <Box sx={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <LocalLibrary sx={{ display: { xs: 'none', sm: 'flex' } }} />
            <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
              Atlas of Human Disease
            </Typography>
          </Box>
          {typeof mode === 'string' ? (
            <IconButton onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} sx={{ marginLeft: 'auto' }}>
              {mode === 'dark' ? <DarkModeOutlined /> : <DarkMode />}
            </IconButton>
          ) : (
            <></>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
