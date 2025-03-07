'use client';

import { createTheme, type Theme } from '@mui/material/styles';

const theme: Theme = createTheme({
  colorSchemes: { light: true, dark: true },
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  typography: {
    fontFamily: 'var(--font-roboto)',
  },
});

export default theme;
