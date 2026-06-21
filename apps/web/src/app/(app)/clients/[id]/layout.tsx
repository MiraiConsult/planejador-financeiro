import type { ReactNode } from 'react';
import { ConsultorWidget } from '@/components/consultor/ConsultorWidget';

type Params = Promise<{ id: string }>;

export default async function ClientIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { id } = await params;
  return (
    <>
      {children}
      <ConsultorWidget clientId={id} />
    </>
  );
}
