import ExplorerView from '@atlas-explorer/graph';

import { JSX } from 'react';
import { Container, Box, Card, Typography } from '@mui/material';

export default function Home(): JSX.Element {
  return (
    <Container maxWidth='lg'>
      <Box sx={{ my: 2 }}>
        <Card variant='outlined' sx={{ maxWidth: 'lg', p: 2 }}>
          <Typography variant='h5'>Lorem Ipsum</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Typography>
        </Card>
      </Box>
      <Box sx={{ my: 2 }}>
        <Card variant='outlined' sx={{ maxWidth: 'lg', height: '500px' }}>
          <ExplorerView stateTarget='/data-files/state.explorer.json' />
        </Card>
      </Box>
    </Container>
  );
}
