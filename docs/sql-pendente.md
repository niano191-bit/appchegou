# SQL pendente no Supabase (produção)

Rode no **SQL Editor**, nesta ordem, se ainda não rodou:

1. `supabase/migrations/004_fase12_senha.sql` — senha nos usuários (cadastro)
2. `supabase/migrations/005_fase13_gateways.sql` — Mercado Pago + LucPaguei no financeiro
3. `supabase/migrations/006_fase14_cancelado.sql` — status cancelado
4. `supabase/migrations/007_fase15_recusa.sql` — loja pode recusar pedido (quem cancelou + motivo)
5. `supabase/migrations/008_fase16_horario.sql` — loja pode pausar pedidos
6. `supabase/migrations/009_fase17_bairros.sql` — bairros com taxa por zona

As migrations 001, 002 e 003 já devem estar aplicadas.
