import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'darkBlue',
  primaryShade: 6,
  colors: {
    dark: [
      '#dfe8ff',
      '#bcccf2',
      '#93a7dc',
      '#6f88c0',
      '#4f699e',
      '#3a4f7b',
      '#273861',
      '#0A1128',
      '#070d1f',
      '#040814',
    ],
    darkBlue: [
      '#e8eeff',
      '#cfdcff',
      '#9fb8ff',
      '#6f93ff',
      '#4674ff',
      '#2c5be8',
      '#1f49bf',
      '#173993',
      '#112a6d',
      '#0b1c48',
    ],
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600',
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
  breakpoints: {
    xs: '30em',
    sm: '800px',
    md: '1280px',
    lg: '1440px',
    xl: '1920px',
  },
});

export const DARK_BLUE = '#0A2568';
