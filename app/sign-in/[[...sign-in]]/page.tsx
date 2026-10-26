import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/modules/usuarios/components/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn forceRedirectUrl="/post-login" />
    </AuthShell>
  );
}
