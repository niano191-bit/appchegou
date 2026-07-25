# SQL no Supabase (produção)

**Atualizado:** migrations `004` → `018` (cancelamento pelo dono).

Se criar um projeto novo do zero, rode nesta ordem:

1. `001_fase1_schema.sql`
2. `002_fase6_configuracao.sql`
3. `003_fase8_pagamentos.sql`
4. `004_fase12_senha.sql`
5. `005_fase13_gateways.sql`
6. `006_fase14_cancelado.sql`
7. `007_fase15_recusa.sql`
8. `008_fase16_horario.sql`
9. `009_fase17_bairros.sql`
10. `010_fase18_estorno.sql`
11. `011_fase19_eta.sql`
12. `012_fase20_numero_pedido.sql`
13. `013_fase21_dinheiro.sql`
14. `014_fase22_pedido_minimo.sql`
15. `015_fase23_cupons.sql`
16. `016_fase24_avaliacao_obs.sql`
17. `017_fase25_horario_gorjeta.sql`
18. `018_fase26_cancel_dono.sql`

Script local (com `SUPABASE_ACCESS_TOKEN`):

```bash
node scripts/aplicar-migrations.mjs
```
