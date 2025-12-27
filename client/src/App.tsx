// client/src/App.tsx (ELIMINACIÓN DE WOUTER)

// Importar solo los componentes necesarios para el renderizado
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home"; // Solo importar Home

// Eliminar la función Router y todas las importaciones de wouter

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          {/* Renderizar Home directamente, sin enrutamiento */}
          <Home /> 
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
