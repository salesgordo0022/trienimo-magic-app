-- Cria função RPC SECURITY DEFINER que bypassa RLS
CREATE OR REPLACE FUNCTION public.send_message(p_recipient_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO messages (sender_id, recipient_id, body)
  VALUES (auth.uid(), p_recipient_id, p_body)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

-- Remove políticas antigas de INSERT
DROP POLICY IF EXISTS "messages insert" ON public.messages;
DROP POLICY IF EXISTS "allow_insert_own_messages" ON public.messages;
DROP POLICY IF EXISTS "messages insert open" ON public.messages;

-- Política simples como fallback
CREATE POLICY "messages insert open" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Garante SELECT
DROP POLICY IF EXISTS "messages select" ON public.messages;
DROP POLICY IF EXISTS "allow_read_own_messages" ON public.messages;
CREATE POLICY "messages select open" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Garante UPDATE
DROP POLICY IF EXISTS "messages update read" ON public.messages;
DROP POLICY IF EXISTS "allow_update_received_messages" ON public.messages;
CREATE POLICY "messages update open" ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
