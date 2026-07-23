-- Executa no Supabase SQL Editor - uma linha por vez se necessário

-- 1. Cria a função RPC
CREATE OR REPLACE FUNCTION send_message(p_recipient_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO messages (sender_id, recipient_id, body) VALUES (auth.uid(), p_recipient_id, p_body) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- 2. Permite autenticados chamarem a função
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;

-- 3. Remove políticas antigas
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can read own messages" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON messages;

-- 4. Política de insert
CREATE POLICY allow_insert_own_messages ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 5. Política de select
CREATE POLICY allow_read_own_messages ON messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- 6. Política de update
CREATE POLICY allow_update_received_messages ON messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
