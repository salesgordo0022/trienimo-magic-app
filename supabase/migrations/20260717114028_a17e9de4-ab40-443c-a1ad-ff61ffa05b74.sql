-- 1) Vincula um exercício da ficha ao id do exercício na ExerciseDB (para exibir o GIF de demonstração)
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_db_id TEXT;

-- 2) Mensagens (chat entre professor e aluno vinculados em teacher_students)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages select" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "messages insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.teacher_students ts
        WHERE (ts.teacher_id = sender_id AND ts.student_id = recipient_id)
           OR (ts.teacher_id = recipient_id AND ts.student_id = sender_id)
      )
    )
  );

CREATE POLICY "messages update read" ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE INDEX messages_pair_idx ON public.messages(sender_id, recipient_id, created_at);
CREATE INDEX messages_recipient_idx ON public.messages(recipient_id, created_at DESC);

-- 3) Notificações (populadas automaticamente por triggers, nunca escritas direto pelo cliente)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications select own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

-- Notifica o destinatário quando chega uma mensagem nova
CREATE OR REPLACE FUNCTION public.tg_notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_nome text;
BEGIN
  SELECT nome INTO v_nome FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.recipient_id, 'Nova mensagem', COALESCE(v_nome, 'Alguém') || ' enviou uma mensagem', '/mensagens');
  RETURN NEW;
END $$;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_message();

-- Notifica o aluno quando uma ficha é atribuída/reatribuída a ele
CREATE OR REPLACE FUNCTION public.tg_notify_workout_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (NEW.assigned_to, 'Nova ficha de treino', 'Treino ' || NEW.letra || ' foi atribuído a você', '/ficha/' || NEW.id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER workouts_notify AFTER INSERT OR UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_workout_assigned();

-- Notifica o professor quando o aluno finaliza um treino
CREATE OR REPLACE FUNCTION public.tg_notify_session_ended()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_owner uuid; v_letra text; v_aluno text;
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    SELECT w.user_id, w.letra INTO v_owner, v_letra FROM public.workouts w WHERE w.id = NEW.workout_id;
    SELECT nome INTO v_aluno FROM public.profiles WHERE id = NEW.user_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (v_owner, 'Treino concluído', COALESCE(v_aluno, 'Aluno') || ' concluiu o Treino ' || v_letra, '/ficha/' || NEW.workout_id || '/historico');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sessions_notify AFTER UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_session_ended();

REVOKE EXECUTE ON FUNCTION public.tg_notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_workout_assigned() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_session_ended() FROM PUBLIC, anon, authenticated;
