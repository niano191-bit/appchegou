import fs from "fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "vnbmbcpzmsyafiychxgi";

if (!token) {
  console.error("Falta SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const files = [
  ["001", "supabase/migrations/001_fase1_schema.sql"],
  ["002", "supabase/migrations/002_fase6_configuracao.sql"],
  ["003", "supabase/migrations/003_fase8_pagamentos.sql"],
  ["004", "supabase/migrations/004_fase12_senha.sql"],
  ["005", "supabase/migrations/005_fase13_gateways.sql"],
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

const tabelas = await runQuery(
  "select table_name from information_schema.tables where table_schema = 'public' order by 1",
);
console.log("Tabelas:", tabelas);

const contagem = await runQuery(
  "select (select count(*) from restaurantes) as restaurantes, (select count(*) from usuarios) as usuarios, (select count(*) from pedidos) as pedidos",
);
console.log("Dados de teste:", contagem);
