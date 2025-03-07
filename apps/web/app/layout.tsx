import theme from '@app/common/theme';
import NavBar from '@app/components/NavBar';

import { JSX } from 'react';
import { Roboto } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { Metadata, Viewport } from 'next';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Atlas Explorer',
  description: 'Example Atlas Explorer integration',
  icons: [
    {
      rel: 'icon',
      sizes: '32x32',
      type: 'image/ico',
      url: '/favicon/favicon-32x32.ico',
    },
    {
      rel: 'shortcut icon',
      type: 'image/ico',
      url: '/favicon/favicon-32x32.ico',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      type: 'image/png',
      url: '/favicon/apple-touch-icon.png',
    },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  other: {
    HandheldFriendly: 'True',
    MobileOptimized: '320',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang='en'>
      <body className={roboto.variable} style={{ margin: 0 }}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <NavBar />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
