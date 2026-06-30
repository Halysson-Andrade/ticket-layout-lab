import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/Portal/ProtectedRoute";
import PortalLayout from "@/components/Portal/PortalLayout";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const UsuariosPage = lazy(() => import("./pages/portal/UsuariosPage"));
const EmpresasPage = lazy(() => import("./pages/portal/EmpresasPage"));
const MapasPage = lazy(() => import("./pages/portal/MapasPage"));
const SimulacaoPage = lazy(() => import("./pages/portal/SimulacaoPage"));
const ManualPage = lazy(() => import("./pages/portal/ManualPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EventPreview = lazy(() => import("./pages/EventPreview"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
                <Route path="manual" element={<ManualPage />} />
                <Route path="simulacao" element={
                  <ProtectedRoute requiredRole="admin">
                    <SimulacaoPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* MapStudio - funciona independente como antes */}
              <Route path="/" element={<Index />} />
              <Route path="/mapstudio" element={<Index />} />
              <Route path="/preview-evento" element={<EventPreview />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
