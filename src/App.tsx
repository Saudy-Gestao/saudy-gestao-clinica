import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { Notifications } from '@mantine/notifications';
import { theme } from './themes/theme';
import { Dashboard } from './components/Dashboard/Dashboard';

function App() {
  const [colorScheme] = useLocalStorage<'light' | 'dark'>({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
  });

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
