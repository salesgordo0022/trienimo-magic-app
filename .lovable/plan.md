## O que vai mudar

Hoje qualquer pessoa que se cadastra vira "usuário" e pode criar fichas. Vou dividir em 3 papéis:

- **Aluno** (padrão de qualquer novo cadastro): cria as próprias fichas e vê as fichas do professor a que está vinculado.
- **Professor**: cria fichas (pessoais e/ou para seus alunos) e vê seus alunos.
- **Admin**: convida professores, atribui alunos a professores, vê quem está online.

## Fluxos

### 1) Primeiro admin
O primeiro e-mail que se cadastrar recebe o papel `admin` automaticamente. A partir daí, o cadastro público continua criando **alunos**.

### 2) Convite de professor
- Admin abre `/admin` → aba **Professores** → botão "Convidar professor".
- Gera um **código de convite** (link `/auth?convite=XYZ`).
- Quem se cadastrar com esse código já entra como `professor` (o convite é marcado como usado).
- Admin também pode **promover um aluno existente** a professor pela lista.

### 3) Atribuição de alunos
- Em `/admin` → aba **Alunos**, admin escolhe o professor de cada aluno.
- Em `/professor` (nova rota), o professor vê os próprios alunos e pode criar/editar fichas **para** cada aluno.

### 4) Visão do aluno
- Continua vendo as fichas próprias em `/app`.
- Ganha uma seção "Treino do seu professor" listando as fichas que o professor criou pra ele.
- Pode executar qualquer uma das duas (própria ou do professor).

### 5) "Professores online"
- Painel do admin mostra bolinha verde nos professores ativos agora (via Realtime Presence do canal `presence:professores`).

## Detalhes técnicos

**Banco (migration nova):**
- `enum app_role` com `admin | professor | aluno`.
- Tabela `user_roles(user_id, role)` + função `has_role(uid, role)` `SECURITY DEFINER` (padrão anti-recursão).
- Tabela `invites(code, role, created_by, used_by, expires_at)`.
- Tabela `teacher_students(teacher_id, student_id)`.
- Coluna `workouts.owner_id` (dono da ficha — professor quando prescrita) e `workouts.assigned_to` (aluno alvo, `null` = ficha pessoal do próprio dono). Migração preenche `owner_id = user_id`, `assigned_to = null` nas fichas existentes.
- RLS reescrita: aluno vê fichas onde `assigned_to = auth.uid()` OU `user_id = auth.uid()`; professor vê as próprias e as que criou para seus alunos; admin vê tudo.
- Trigger em `auth.users` (INSERT): se não existe nenhum admin → grava admin; senão, se `raw_user_meta_data->>'invite_code'` bate com um `invites` válido → grava esse papel e marca o convite como usado; senão → `aluno`.
- GRANTs em todas as tabelas novas.

**Server functions (`src/lib/roles.functions.ts` + extensões em `workouts.functions.ts`):**
- `getMyRole`, `listUsers` (admin), `listProfessors`, `listAlunos`, `createInvite`, `listInvites`, `promoteToProfessor`, `assignStudent`, `listMyStudents` (professor), `listMyTeacherWorkouts` (aluno).
- `createWorkout` passa a aceitar `assigned_to` opcional; valida que o autor é admin/professor quando prescreve para outro.

**Rotas novas:**
- `/_authenticated/admin.tsx` — abas Professores / Alunos / Convites, presence online.
- `/_authenticated/professor.tsx` — meus alunos + botão "criar ficha para aluno".
- `/app` (existente) — passa a mostrar duas seções para o aluno: "Minhas fichas" e "Fichas do meu professor".
- `/auth` — lê `?convite=XYZ`, envia no `signUp` como `data.invite_code`.

**Presence:**
- No `__root` (ou em `/admin`), professor/admin entram no canal Realtime `presence:professores` com `{ user_id, nome }`. Admin lê o estado do canal pra pintar o "online".

## Fora do escopo

- Notificação por e-mail do convite (por enquanto o admin copia/cola o link).
- Chat aluno↔professor.
- Múltiplos professores por aluno (1 professor por aluno agora).

Se ok, sigo com a migration + código.