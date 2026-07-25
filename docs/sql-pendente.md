# SQL pendente no Supabase (produção)

Rode no **SQL Editor**, nesta ordem, se ainda não rodou:

1. `supabase/migrations/004_fase12_senha.sql` — senha nos usuários (cadastro)
2. `supabase/migrations/005_fase13_gateways.sql` — Mercado Pago + LucPaguei no financeiro
3. `supabase/migrations/006_fase14_cancelado.sql` — status cancelado
4. `supabase/migrations/007_fase15_recusa.sql` — loja pode recusar pedido (quem cancelou + motivo)
5. `supabase/migrations/008_fase16_horario.sql` — loja pode pausar pedidos
6. `supabase/migrations/009_fase17_bairros.sql` — bairros com taxa por zona
7. `supabase/migrations/010_fase18_estorno.sql` — status Pix estornado / reembolso pendente
8. `supabase/migrations/011_fase19_eta.sql` — tempo estimado ao aceitar o pedido
9. `supabase/migrations/012_fase20_numero_pedido.sql` — número do pedido do dia (#1, #2…)

As migrations 001, 002 e 003 já devem estar aplicadas.
