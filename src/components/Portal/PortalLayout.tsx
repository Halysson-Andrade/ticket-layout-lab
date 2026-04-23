import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Users, Building2, Map, LogOut, MapPin, ChevronLeft, Play, BookOpen 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PortalLayout: React.FC = () => {
  const { profile, role, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    ...(isAdmin ? [
      { to: '/portal/usuarios', icon: Users, label: 'Usuários' },
      { to: '/portal/empresas', icon: Building2, label: 'Empresas' },
    ] : []),
    { to: '/portal/mapas', icon: Map, label: 'Mapas' },
    { to: '/portal/manual', icon: BookOpen, label: 'Manual' },
    ...(isAdmin ? [
      { to: '/portal/simulacao', icon: Play, label: 'Simulação' },
    ] : []),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Map Studio</h1>
              <p className="text-xs text-muted-foreground">Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-muted-foreground">
              {role === 'admin' ? 'Administrador' : 'Básico'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default PortalLayout;
