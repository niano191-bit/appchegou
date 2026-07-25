# SQL pendente no Supabase (produção)

Rode no **SQL Editor**, nesta ordem, se ainda não rodou:

1. `supabase/migrations/004_fase12_senha.sql` — senha nos usuários (cadastro)
2. `supabase/migrations/005_fase13_gateways.sql` — Mercado Pago + LucPaguei no financeiro
3. `supabase/migrations/006_fase14_cancelado.sql` — status cancelado
4. `supabase/migrations/007_fase15_recusa.sql` — loja pode recusar pedido (quem cancelou + motivo)

As migrations 001, 002 e 003 já devem estar aplicadas.
