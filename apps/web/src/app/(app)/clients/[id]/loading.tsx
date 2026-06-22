// Mostrado pelo Next enquanto a próxima rota /clients/[id]/* carrega
// seus dados no servidor (simulate(), queries do Supabase). Sem isso a
// navegação parece travada porque a tela anterior fica visível mas
// "morta" até a nova terminar de renderizar.

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-2 py-8 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-72 bg-slate-200 rounded" />
        <div className="h-3 w-96 bg-slate-100 rounded" />
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-slate-100" />
      <div className="grid sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
