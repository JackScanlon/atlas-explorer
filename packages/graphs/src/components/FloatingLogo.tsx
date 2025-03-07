'use client';

import AtlasLogoDark from '../content/AtlasLogoDark';
import AtlasLogoLight from '../content/AtlasLogoLight';

import { JSX } from 'react';
import { Container, useColorScheme } from '@mui/material';

/**
 * @desc
 *
 * @returns {JSX.Element}
 */
export default function FloatingLogo({ imgWidth = 85, imgHeight = 54 }: { imgWidth?: number; imgHeight?: number }): JSX.Element {
  const { mode } = useColorScheme();

  return (
    <Container
      disableGutters
      maxWidth={false}
      sx={{
        userSelect: 'none',
        msUserSelect: 'none',
        MozUserSelect: '-moz-none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        pointerEvents: 'none',
        position: 'absolute',
        width: 'auto',
        padding: '1.5rem',
        height: '100%',
        display: 'flex',
        alignItems: { xs: 'flex-end', sm: 'flex-start' },
      }}>
      {mode === 'light' ? <AtlasLogoLight width={imgWidth} height={imgHeight} /> : <AtlasLogoDark width={imgWidth} height={imgHeight} />}
    </Container>
  );
}
