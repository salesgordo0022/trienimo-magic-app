
# App de Treino — Ficha do Personal (PWA)

App web instalável no iPhone e no PC, com login, criação de fichas (Treino A, B, C…), execução com timer de descanso e histórico de cargas. Visual fiel à planilha da imagem: amarelo, preto e cinza, cabeçalhos em bloco preto, linhas de exercícios em tabela.

## O que será construído

### 1. Autenticação (Lovable Cloud)
- Login por e-mail/senha + Google.
- Cada aluno acessa apenas as próprias fichas.
- Perfil simples do usuário (nome, objetivo, dias da semana, observação — como no cabeçalho da planilha).

### 2. Fichas de treino
- Criar várias fichas por usuário (Treino A, B, C…) com letra grande no bloco amarelo/preto, igual à imagem.
- Cabeçalho da ficha: Aluno, Data de início, Objetivo, Dias da semana, Observação.
- Grupos musculares por bloco: Peito, Tríceps, Ombro, Abdômen/Vertebrais, etc. (grupos livres — o usuário adiciona os que quiser).
- Cada exercício tem: nº de séries (3x), nome, até 4 colunas de "Repets/Kg", descanso e observação (ex: "Pirâmide").
- Bloco extra "Regeneração" e campo "Observações" no rodapé.
- Editar e duplicar fichas (útil para clonar Treino A → B).

### 3. Modo Executar Treino
- Abrir uma ficha e ir marcando série por série concluída.
- Timer de descanso automático inicia ao terminar uma série (usa o valor "Desc" do exercício, ex: 45s, 1min).
- Aviso sonoro/vibração quando o descanso acaba.
- Ao final, salva a sessão no histórico com data e cargas efetivamente usadas.

### 4. Histórico e progressão
- Lista das sessões passadas por ficha.
- Para cada exercício, gráfico simples de evolução da carga máxima ao longo do tempo.
- Comparativo rápido "última carga usada" ao executar novamente.

### 5. PWA (instalável no iPhone e PC)
- Manifest + ícones, `display: standalone`, cores tema amarelo/preto.
- No iPhone: Safari → Compartilhar → "Adicionar à Tela de Início".
- No PC (Chrome/Edge): ícone de instalar na barra de endereço.
- Sem service worker offline nesta versão (foco em instalabilidade); dá pra adicionar offline depois se quiser.

### 6. Visual (fiel à planilha)
- Paleta: amarelo `#FFD400`, preto `#0A0A0A`, cinza claro `#E5E5E5`, branco.
- Cabeçalho com logo "SuaLogo" (placeholder editável) + "SEU NOME - PERSONAL TRAINER / FICHA DE TREINO".
- Bloco grande preto à direita mostrando a letra do treino (A/B/C…).
- Tabelas com cabeçalhos amarelos, linhas alternadas cinza claro, tipografia condensada.
- Mobile-first: em telas pequenas, as 4 colunas de séries viram cards empilhados; em telas grandes, tabela igual à imagem.

## Detalhes técnicos

- **Stack**: TanStack Start + React + Tailwind (já configurado).
- **Backend**: Lovable Cloud (Supabase) — precisa ser ativado.
- **Tabelas**:
  - `profiles` (user_id, nome, objetivo, dias_semana, observacao)
  - `workouts` (id, user_id, letra, nome, data_inicio, observacao)
  - `workout_groups` (id, workout_id, nome, ordem)
  - `exercises` (id, group_id, nome, series, desc_segundos, obs, ordem, sets_config jsonb — repets/kg planejados)
  - `sessions` (id, workout_id, user_id, started_at, ended_at)
  - `session_sets` (id, session_id, exercise_id, set_index, reps, kg, done)
  - RLS: cada usuário só lê/escreve as próprias linhas. Grants padrão para `authenticated`.
- **Server functions** com `requireSupabaseAuth` para todas as leituras/escritas.
- **PWA**: `public/manifest.webmanifest` + ícones + `<link rel="manifest">` e `theme-color` no `__root.tsx`.
- **Rotas**:
  - `/auth` (login/cadastro público)
  - `/_authenticated/` — dashboard com lista de fichas
  - `/_authenticated/ficha/$id` — editar ficha
  - `/_authenticated/ficha/$id/executar` — modo treino com timer
  - `/_authenticated/ficha/$id/historico` — sessões + progressão

## Fora do escopo desta versão
- Modo offline completo com service worker (só instalabilidade agora).
- App nativo na App Store / Play Store (isso exigiria Capacitor).
- Personal com múltiplos alunos gerenciando várias contas (todos criam a própria conta e a própria ficha).
- Vídeos demonstrativos dos exercícios.

Se aprovar, ativo a Lovable Cloud e começo pelo login + estrutura da ficha, depois execução com timer, depois histórico e PWA.
