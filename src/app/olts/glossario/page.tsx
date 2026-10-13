import { tentarCatalogo } from "@/lib/olt/agente";
import { ErroAgente } from "@/components/olt/Indicadores";

const TITULOS: Record<string, string> = {
  dba: "DBA profile",
  line: "Line profile",
  srv: "Service profile",
  traffic: "Traffic profile",
  tr069: "TR-069",
  sip: "SIP (VoIP)",
  service_port: "Service-port",
  vlan: "VLAN",
};

export default async function GlossarioPage() {
  const { catalogo, erro } = await tentarCatalogo();
  const itens = catalogo
    ? [
        ["ONUs autorizadas", catalogo.textos.onu.autorizadas],
        ["Autofind / pendentes", catalogo.textos.onu.pendentes],
        ["Sinal óptico", catalogo.textos.onu.sinal],
        ...Object.entries(catalogo.textos.glossario).map(([chave, texto]) => [TITULOS[chave] ?? chave, texto]),
      ]
    : [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50">Glossário GPON</h1>
        <p className="text-sm text-stone-500 dark:text-slate-400">Os conceitos que aparecem nas telas de OLT, em poucas linhas.</p>
      </div>
      <ErroAgente erro={erro} />
      <div className="grid gap-4 md:grid-cols-2">
        {itens.map(([titulo, texto]) => (
          <section key={titulo} className="rounded-xl border border-stone-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-2 font-semibold text-stone-900 dark:text-stone-50">{titulo}</h2>
            <p className="whitespace-pre-line text-sm text-stone-700 dark:text-slate-300">{texto}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
