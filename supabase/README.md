# Banco de dados (Supabase)

## Como criar as tabelas (Fase 1)

1. Entre em [supabase.com](https://supabase.com) e abra seu projeto (ou crie um novo).
2. No menu lateral, clique em **SQL Editor**.
3. Abra o arquivo `migrations/001_fase1_schema.sql` deste projeto.
4. Cole todo o conteúdo no editor e clique em **Run**.
5. Em **Project Settings → API**, copie a **URL** e a chave **anon**.
6. Na pasta do app, copie `.env.example` para `.env.local` e cole as duas chaves.
7. Reinicie o app com `npm run dev`.

Isso cria as tabelas, libera o acesso temporário para desenvolvimento e insere dados de teste (Loja Demo, Cliente Teste, etc.).
