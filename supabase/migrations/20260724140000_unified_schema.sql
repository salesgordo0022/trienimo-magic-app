
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  objetivo TEXT,
  dias_semana TEXT,
  observacao TEXT,
  logo_texto TEXT DEFAULT 'SuaLogo',
  personal_nome TEXT DEFAULT 'SEU NOME - PERSONAL TRAINER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Workouts (fichas: Treino A, B, C...)
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letra TEXT NOT NULL DEFAULT 'A',
  nome TEXT,
  data_inicio DATE,
  observacao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workouts_own" ON public.workouts;
CREATE POLICY "workouts_own" ON public.workouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS workouts_user_idx ON public.workouts(user_id, ordem);

-- Groups (Peito, Tríceps, Ombro...)
CREATE TABLE IF NOT EXISTS public.workout_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_groups TO authenticated;
GRANT ALL ON public.workout_groups TO service_role;
ALTER TABLE public.workout_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_own" ON public.workout_groups;
CREATE POLICY "groups_own" ON public.workout_groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS groups_workout_idx ON public.workout_groups(workout_id, ordem);

-- Exercises
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.workout_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  series INT NOT NULL DEFAULT 3,
  desc_segundos INT NOT NULL DEFAULT 45,
  obs TEXT,
  ordem INT NOT NULL DEFAULT 0,
  sets_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exercises_own" ON public.exercises;
CREATE POLICY "exercises_own" ON public.exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS exercises_group_idx ON public.exercises(group_id, ordem);

-- Sessions (execução de um treino)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sessions_own" ON public.sessions;
CREATE POLICY "sessions_own" ON public.sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS sessions_workout_idx ON public.sessions(workout_id, started_at DESC);

-- Session sets (séries realizadas)
CREATE TABLE IF NOT EXISTS public.session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_index INT NOT NULL,
  reps INT,
  kg NUMERIC(6,2),
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_sets TO authenticated;
GRANT ALL ON public.session_sets TO service_role;
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_sets_own" ON public.session_sets;
CREATE POLICY "session_sets_own" ON public.session_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS session_sets_session_idx ON public.session_sets(session_id);
CREATE INDEX IF NOT EXISTS session_sets_exercise_idx ON public.session_sets(exercise_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS workouts_updated ON public.workouts;
CREATE TRIGGER workouts_updated BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- Roles enum
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'aluno'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer, avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid() $$;

-- Policies on user_roles
DROP POLICY IF EXISTS "user_roles read own" ON public.user_roles;
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));

-- Invites
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role public.app_role NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites admin all" ON public.invites;
CREATE POLICY "invites admin all" ON public.invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- teacher_students
CREATE TABLE IF NOT EXISTS public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_students TO authenticated;
GRANT ALL ON public.teacher_students TO service_role;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ts read own" ON public.teacher_students;
CREATE POLICY "ts read own" ON public.teacher_students FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ts admin write" ON public.teacher_students;
CREATE POLICY "ts admin write" ON public.teacher_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR teacher_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR teacher_id = auth.uid());

-- Profiles: allow admin/professor to read others
DROP POLICY IF EXISTS profiles_own ON public.profiles;
DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'professor')
  );
DROP POLICY IF EXISTS "profiles write own" ON public.profiles;
CREATE POLICY "profiles write own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Workouts: add assigned_to (owner = user_id already)
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rewrite workouts RLS
DROP POLICY IF EXISTS workouts_own ON public.workouts;
DROP POLICY IF EXISTS "workouts select" ON public.workouts;
CREATE POLICY "workouts select" ON public.workouts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "workouts insert" ON public.workouts;
CREATE POLICY "workouts insert" ON public.workouts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      assigned_to IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'professor')
    )
  );
DROP POLICY IF EXISTS "workouts update" ON public.workouts;
CREATE POLICY "workouts update" ON public.workouts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "workouts delete" ON public.workouts;
CREATE POLICY "workouts delete" ON public.workouts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Groups / exercises / sessions / session_sets: allow the assigned student to read too
DROP POLICY IF EXISTS groups_own ON public.workout_groups;
DROP POLICY IF EXISTS "groups select" ON public.workout_groups;
CREATE POLICY "groups select" ON public.workout_groups FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND (w.user_id = auth.uid() OR w.assigned_to = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "groups write" ON public.workout_groups;
CREATE POLICY "groups write" ON public.workout_groups FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS exercises_own ON public.exercises;
DROP POLICY IF EXISTS "exercises select" ON public.exercises;
CREATE POLICY "exercises select" ON public.exercises FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workout_groups g
      JOIN public.workouts w ON w.id = g.workout_id
      WHERE g.id = group_id AND (w.user_id = auth.uid() OR w.assigned_to = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
DROP POLICY IF EXISTS "exercises write" ON public.exercises;
CREATE POLICY "exercises write" ON public.exercises FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Signup trigger: assign role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
  v_invite public.invites%ROWTYPE;
  v_role public.app_role;
  v_admin_count int;
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';

  IF v_admin_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_code := NEW.raw_user_meta_data->>'invite_code';
    IF v_code IS NOT NULL AND length(v_code) > 0 THEN
      SELECT * INTO v_invite FROM public.invites
        WHERE code = v_code AND used_by IS NULL
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1;
      IF FOUND THEN
        v_role := v_invite.role;
        UPDATE public.invites SET used_by = NEW.id, used_at = now() WHERE id = v_invite.id;
      ELSE
        v_role := 'aluno';
      END IF;
    ELSE
      v_role := 'aluno';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: any existing user without a role becomes admin if none exists, else aluno.
DO $$
DECLARE u record; v_admin_count int;
BEGIN
  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';
  FOR u IN SELECT id FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u.id) THEN
      IF v_admin_count = 0 THEN
        INSERT INTO public.user_roles(user_id, role) VALUES (u.id, 'admin');
        v_admin_count := 1;
      ELSE
        INSERT INTO public.user_roles(user_id, role) VALUES (u.id, 'aluno');
      END IF;
    END IF;
  END LOOP;
END $$;

-- Admin-only RPC to promote a user
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role);
END $$;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
-- 1) Vincula um exercício da ficha ao id do exercício na ExerciseDB (para exibir o GIF de demonstração)
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_db_id TEXT;

-- 2) Mensagens (chat entre professor e aluno vinculados em teacher_students)
CREATE TABLE IF NOT EXISTS public.messages (
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

DROP POLICY IF EXISTS "messages select" ON public.messages;
CREATE POLICY "messages select" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "messages insert" ON public.messages;
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

DROP POLICY IF EXISTS "messages update read" ON public.messages;
CREATE POLICY "messages update read" ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS messages_pair_idx ON public.messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages(recipient_id, created_at DESC);

-- 3) Notificações (populadas automaticamente por triggers, nunca escritas direto pelo cliente)
CREATE TABLE IF NOT EXISTS public.notifications (
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

DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications update own" ON public.notifications;
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);

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
DROP TRIGGER IF EXISTS messages_notify ON public.messages;
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
DROP TRIGGER IF EXISTS workouts_notify ON public.workouts;
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
DROP TRIGGER IF EXISTS sessions_notify ON public.sessions;
CREATE TRIGGER sessions_notify AFTER UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_session_ended();

REVOKE EXECUTE ON FUNCTION public.tg_notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_workout_assigned() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_session_ended() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.exercises_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_pt text,
  body_part text,
  target text,
  equipment text,
  difficulty text,
  secondary_muscles text[],
  instructions text[],
  instructions_pt text[],
  gif_path text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exercises_catalog TO authenticated, anon;
GRANT ALL ON public.exercises_catalog TO service_role;

ALTER TABLE public.exercises_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_catalog readable by all"
  ON public.exercises_catalog FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS exercises_catalog_body_part_idx ON public.exercises_catalog(body_part);
CREATE INDEX IF NOT EXISTS exercises_catalog_equipment_idx ON public.exercises_catalog(equipment);
CREATE INDEX IF NOT EXISTS exercises_catalog_target_idx ON public.exercises_catalog(target);
CREATE INDEX IF NOT EXISTS exercises_catalog_name_trgm ON public.exercises_catalog USING gin (lower(name) gin_trgm_ops, lower(coalesce(name_pt,'')) gin_trgm_ops);

CREATE POLICY "authenticated can read exercise gifs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-gifs');
-- Adiciona coluna gif_data para armazenar GIFs como base64 no banco
-- evita depender de Storage e da RapidAPI após o sync inicial
ALTER TABLE public.exercises_catalog ADD COLUMN IF NOT EXISTS gif_data text;
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
