-- Fase 18 — Estorno Pix (status de pagamento)
-- Rode no SQL Editor do Supabase após a 009.

alter type status_pagamento add value if not exists 'estornado';
alter type status_pagamento add value if not exists 'reembolso_pendente';
