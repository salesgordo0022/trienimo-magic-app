-- Remove políticas antigas de INSERT que exigem teacher_students
DROP POLICY IF EXISTS "messages insert" ON public.messages;
DROP POLICY IF EXISTS "allow_insert_own_messages" ON public.messages;

-- Política simples: qualquer autenticado pode enviar mensagem pra qualquer um
CREATE POLICY "messages insert open" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
