# Tentações da Neuza — Delivery em Salvador

App de delivery (**Tentações da Neuza**) com áreas de **cliente**, **restaurante**, **entregador** e **dono**.

## Rodar no computador

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Sem Supabase, o app usa **modo demonstração** (dados salvos neste PC).

### Contas de teste (senha: `teste123`)

| Conta | E-mail |
|---|---|
| Cliente | `cliente.teste@chegou.local` |
| Restaurante | `loja.acaraje@chegou.local` |
| Entregador | `entregador.teste@chegou.local` |
| Dono | `dono.teste@chegou.local` |

## Publicar (Fase 9)

### 1. Banco no Supabase (produção)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra **SQL Editor** e rode, nesta ordem:
   - `supabase/migrations/001_fase1_schema.sql`
   - `supabase/migrations/002_fase6_configuracao.sql`
   - `supabase/migrations/003_fase8_pagamentos.sql`
3. Em **Project Settings → API**, copie a **URL** e a chave **anon**

### 2. Site na Vercel

1. Entre em [vercel.com](https://vercel.com) com a conta GitHub
2. **Add New Project** → escolha o repositório `appchegou`
3. Em **Environment Variables**, cadastre:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
| `NEXT_PUBLIC_APP_URL` | URL do site na Vercel (ex: `https://seu-app.vercel.app`) |
| `MERCADOPAGO_ACCESS_TOKEN` | (opcional) token de **TESTE** |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | (opcional) chave pública de **TESTE** |

4. Clique em **Deploy**

### 3. Depois do deploy

- Atualize `NEXT_PUBLIC_APP_URL` com a URL real da Vercel e faça **Redeploy**
- No Mercado Pago (quando usar), as URLs de retorno usam esse endereço

## Segredos

Nunca coloque chaves no código. Use só `.env.local` (no PC) ou as variáveis da Vercel.
