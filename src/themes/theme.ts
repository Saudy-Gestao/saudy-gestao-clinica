import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'darkBlue',
  colors: {
    darkBlue: [
      '#eef3f7',
      '#dce4eb',
      '#b6c8d9',
      '#8daac5',
      '#6b90b4',
      '#5580aa',
      '#4a78a5',
      '#3b6690',
      '#335b81',
      '#264f71',
    ],
  },
  fontFamily: 'Poppins, sans-serif',
  headings: {
    fontFamily: 'Poppins, sans-serif',
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

export const DARK_BLUE = '#001f54'; // Cor aproximada do header e item ativo