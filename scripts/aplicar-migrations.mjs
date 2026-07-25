import fs from "fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "vnbmbcpzmsyafiychxgi";

if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

/** SQL pendente / seguro reaplicar (IF NOT EXISTS / ADD VALUE IF NOT EXISTS) */
const files = [
  ["004", "supabase/migrations/004_fase12_senha.sql"],
  ["005", "supabase/migrations/005_fase13_gateways.sql"],
  ["006", "supabase/migrations/006_fase14_cancelado.sql"],
  ["007", "supabase/migrations/007_fase15_recusa.sql"],
  ["008", "supabase/migrations/008_fase16_horario.sql"],
  ["009", "supabase/migrations/009_fase17_bairros.sql"],
  ["010", "supabase/migrations/010_fase18_estorno.sql"],
  ["011", "supabase/migrations/011_fase19_eta.sql"],
  ["012", "supabase/migrations/012_fase20_numero_pedido.sql"],
  ["013", "supabase/migrations/013_fase21_dinheiro.sql"],
  ["014", "supabase/migrations/014_fase22_pedido_minimo.sql"],
  ["015", "supabase/migrations/015_fase23_cupons.sql"],
  ["016", "supabase/migrations/016_fase24_avaliacao_obs.sql"],
  ["017", "supabase/migrations/017_fase25_horario_gorjeta.sql"],
  ["018", "supabase/migrations/018_fase26_cancel_dono.sql"],
  ["019", "supabase/migrations/019_fase27_disponibilidade_entregador.sql"],
  ["020", "supabase/migrations/020_fase28_chave_pix_loja.sql"],
];

async function runQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`);
  }
  return text;
}

for (const [name, path] of files) {
  console.log(`Aplicando ${name}...`);
  await runQuery(fs.readFileSync(path, "utf8"));
  console.log(`${name} OK`);
}

const cols = await runQuery(`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pedidos'
    and column_name in (
      'numero_dia', 'data_pedido',
      'tempo_estimado_minutos', 'previsao_entrega_em',
      'cancelado_por', 'motivo_cancelamento',
      'troco_para',
      'gorjeta'
    )
  order by 1
`);
const colsLoja = await runQuery(`
  select column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'restaurantes'
    and column_name in (
      'pedido_minimo', 'pausado', 'comissao_percentual',
      'horario_abertura', 'horario_fechamento', 'chave_pix'
    )
  order by 1
`);
console.log("Colunas chave em pedidos:", cols);
console.log("Colunas chave em restaurantes:", colsLoja);
