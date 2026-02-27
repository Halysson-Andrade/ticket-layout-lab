import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

const EmpresasPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Empresas
        </h1>
        <p className="text-muted-foreground">Gerencie as empresas e integrações</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de gerenciamento de empresas será implementado na próxima fase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresasPage;
