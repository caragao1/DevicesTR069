import { requireSession } from "@/lib/session";
import { carregarOlt } from "@/lib/olt/paginas";
import { lerOlt } from "@/lib/olt/agente";
import { origensDosCampos } from "@/lib/olt/formulario";
import { ErroAgente, Explicacao } from "@/components/olt/Indicadores";
import { OperacaoFlow } from "@/components/olt/OperacaoFlow";
import type { Opcoes } from "@/components/olt/CampoForm";

export default async function AutorizarPage({ params, searchParams }: PageProps<"/olts/[id]/autorizar">) {
  await requireSession();
  const { id } = await params;
  const sp = await searchParams;
  const { olt, catalogo, driver, erroCatalogo } = await carregarOlt(id);
  if (!driver) return <ErroAgente erro={erroCatalogo} />;

  const campos = driver.schema_autorizacao;
  const { dados, erro } = await lerOlt<{ opcoes: Opcoes }>(olt, "/opcoes", { origens: origensDosCampos(campos) });
  const iniciais = Object.fromEntries(["pon", "sn", "onu_id"].map((k) => [k, typeof sp[k] === "string" ? sp[k] : ""]));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Autorizar ONU</h2>
        <p className="text-sm text-stone-500 dark:text-slate-400">
          Escolha os perfis e o serviço; a prévia mostra exatamente o que será enviado à OLT.
        </p>
      </div>
      <Explicacao texto={catalogo?.textos.onu.pendentes ?? ""} />
      {erro && <ErroAgente erro={`Não foi possível carregar os perfis da OLT: ${erro}`} />}
      <OperacaoFlow
        oltId={id}
        base={{ acao: "autorizar" }}
        voltar={`/olts/${id}/onus`}
        campos={campos}
        opcoes={dados?.opcoes ?? {}}
        valoresIniciais={iniciais}
        demo={olt.driver === "demo"}
      />
    </div>
  );
}
