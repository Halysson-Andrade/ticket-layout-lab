import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

const MapasPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="h-6 w-6" />
          Mapas
        </h1>
        <p className="text-muted-foreground">Gerencie os mapas de assentos</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de listagem de mapas será implementado na próxima fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapasPage;
