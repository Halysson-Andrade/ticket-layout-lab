import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/Portal/ProtectedRoute";
import PortalLayout from "@/components/Portal/PortalLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import UsuariosPage from "./pages/portal/UsuariosPage";
import EmpresasPage from "./pages/portal/EmpresasPage";
import MapasPage from "./pages/portal/MapasPage";
import SimulacaoPage from "./pages/portal/SimulacaoPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/trocar-senha" element={
              <ProtectedRoute skipPasswordCheck>
                <ChangePassword />
              </ProtectedRoute>
            } />

            {/* Portal */}
            <Route path="/portal" element={
              <ProtectedRoute>
                <PortalLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/portal/mapas" replace />} />
              <Route path="usuarios" element={
                <ProtectedRoute requiredRole="admin">
                  <UsuariosPage />
                </ProtectedRoute>
              } />
              <Route path="empresas" element={
                <ProtectedRoute requiredRole="admin">
                  <EmpresasPage />
                </ProtectedRoute>
              } />
              <Route path="mapas" element={<MapasPage />} />
              <Route path="simulacao" element={
                <ProtectedRoute requiredRole="admin">
                  <SimulacaoPage />
                </ProtectedRoute>
              } />
            </Route>

            {/* MapStudio - funciona independente como antes */}
            <Route path="/" element={<Index />} />
            <Route path="/mapstudio" element={<Index />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
