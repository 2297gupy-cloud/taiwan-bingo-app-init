import { Router, Route } from 'wouter';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainPage } from './pages/MainPage';
import { Home } from './pages/Home';
import { Live } from './pages/Live';
import { History } from './pages/History';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <Route path="/" component={Home} />
        <Route path="/main" component={MainPage} />
        <Route path="/live" component={Live} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Router>
    </ThemeProvider>
  );
}

export default App;
