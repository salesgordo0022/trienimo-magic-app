-- Cria função RPC para enviar mensagens (bypassa RLS via SECURITY DEFINER)
-- Execute no Supabase SQL Editor

CREATE OR REPLACE FUNCTION send_message(p_recipient_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO messages (sender_id, recipient_id, body)
  VALUES (auth.uid(), p_recipient_id, p_body)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Permite qualquer autenticado chamar a função
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;

-- Remove políticas antigas restritivas e cria novas corretas
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON messages;

CREATE POLICY "allow_insert_own_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "allow_read_own_messages" ON messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "allow_update_received_messages" ON messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
