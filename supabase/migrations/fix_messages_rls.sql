-- Corrige RLS na tabela messages: permite qualquer autenticado enviar/receber mensagens
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Remove políticas restritivas antigas (se existirem)
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON messages;

-- Qualquer autenticado pode INSERIR mensagens (sendo ele o sender)
CREATE POLICY "allow_insert_own_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Qualquer autenticado pode LER mensagens onde é sender ou recipient
CREATE POLICY "allow_read_own_messages" ON messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Qualquer autenticado pode ATUALIZAR (marcar como lido) mensagens que recebeu
CREATE POLICY "allow_update_received_messages" ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Garante que a tabela messages tem RLS habilitado
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
