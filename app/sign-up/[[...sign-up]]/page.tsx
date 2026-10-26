import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/modules/usuarios/components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp forceRedirectUrl="/post-login" />
    </AuthShell>
  );
}
