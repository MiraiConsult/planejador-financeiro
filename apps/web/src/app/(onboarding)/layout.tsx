import type { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  // sem sidebar — onboarding é fullscreen pra concentrar o foco do usuário
  return <>{children}</>;
}
