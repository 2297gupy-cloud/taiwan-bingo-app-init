import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TabBar from "./components/TabBar";
import MainPage from "./pages/MainPage";
import Checker from "./pages/Checker";
import Trend from "./pages/Trend";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainPage} />
      <Route path="/checker" component={Checker} />
      <Route path="/trend" component={Trend} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen bg-background text-foreground pb-14">
            <Router />
            <TabBar />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
