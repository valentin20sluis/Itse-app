import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/modules/usuarios/components/AuthShell";

export default function CuentaDesactivadaPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tu cuenta está desactivada</CardTitle>
          <CardDescription>
            No puedes usar el sistema por ahora. Comunícate con la oficina de Defensa Civil de tu
            municipalidad si crees que se trata de un error.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton redirectUrl="/">
            <Button variant="outline">Cerrar sesión</Button>
          </SignOutButton>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
