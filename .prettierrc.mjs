// @ts-check

/**
 * @type {import('prettier').Config}
 */
const config = {
  endOfLine: 'lf',
  tabWidth: 2,
  arrowParens: 'avoid',
  singleQuote: true,
  jsxSingleQuote: true,
  semi: true,
  printWidth: 140,
  trailingComma: 'es5',
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: true,

  overrides: [
    {
      files: ['*.html'],
      options: {
        trailingComma: 'none',
        htmlWhitespaceSensitivity: 'css',
        singleAttributePerLine: true,
      },
    },
    {
      files: '*.md',
      options: {
        singleQuote: false,
        quoteProps: 'preserve',
      },
    },
    {
      files: ['./docs/**/*.mdx'],
      options: {
        singleQuote: true,
      },
    },
  ],
};

export default config;
