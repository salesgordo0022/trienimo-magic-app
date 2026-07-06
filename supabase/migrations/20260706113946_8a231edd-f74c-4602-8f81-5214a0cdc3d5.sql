
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'aluno');

-- user_roles table
CREATE TABLE public.user_roles (
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
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'professor'));

-- Invites
CREATE TABLE public.invites (
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
CREATE POLICY "invites admin all" ON public.invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- teacher_students
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_students TO authenticated;
GRANT ALL ON public.teacher_students TO service_role;
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts read own" ON public.teacher_students FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ts admin write" ON public.teacher_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR teacher_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR teacher_id = auth.uid());

-- Profiles: allow admin/professor to read others
DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'professor')
  );
CREATE POLICY "profiles write own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Workouts: add assigned_to (owner = user_id already)
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rewrite workouts RLS
DROP POLICY IF EXISTS workouts_own ON public.workouts;
CREATE POLICY "workouts select" ON public.workouts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "workouts insert" ON public.workouts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      assigned_to IS NULL
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'professor')
    )
  );
CREATE POLICY "workouts update" ON public.workouts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "workouts delete" ON public.workouts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Groups / exercises / sessions / session_sets: allow the assigned student to read too
DROP POLICY IF EXISTS groups_own ON public.workout_groups;
CREATE POLICY "groups select" ON public.workout_groups FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND (w.user_id = auth.uid() OR w.assigned_to = auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "groups write" ON public.workout_groups FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS exercises_own ON public.exercises;
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
