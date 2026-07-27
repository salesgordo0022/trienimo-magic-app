# TESTES DE QA - Sistema de Academia
## Antes de entregar ao usuario

---

## 1. AUTENTICACAO

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 1.1 | Acessar /auth sem estar logado | Mostra tela de login | |
| 1.2 | Login com email/senha corretos | Entra no app (/app) | |
| 1.3 | Login com senha incorreta | Mensagem de erro | |
| 1.4 | Login com email inexistente | Mensagem de erro | |
| 1.5 | Clicar "Sair" no menu | Volta pra tela de login | |
| 1.6 | Acessar /app sem estar logado | Redireciona pra /auth | |

---

## 2. LAYOUT MOBILE

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 2.1 | Abrir no iPhone/Android | Layout encaixa na tela, nada sai da margem | |
| 2.2 | Doublle-tap no input | Nao da zoom | |
| 2.3 | Pinch-to-zoom | Nao funciona (bloqueado) | |
| 2.4 | Scroll na pagina principal | Scroll suave, header e nav fixos | |
| 2.5 | Barra de navegacao inferior | Sempre visivel, 5 itens, sem sobrepor conteudo | |
| 2.6 | Clicar em cada item da nav | Navega corretamente (Inicio, Treino, Alimentacao, Mensagens, Perfil) | |

---

## 3. INICIO (HOME)

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 3.1 | Card "Meu Treino" (aluno com treino) | Mostra treino atribuido com botao "Acessar" | |
| 3.2 | Card "Treino Concluido" (apos completar) | Mensagem de parabens | |
| 3.3 | Clicar "Acessar" no treino | Abre modal com opcoes "Passo a Passo" e "Ver Ficha" | |
| 3.4 | Cards de estatisticas (Hoje, Sequencia) | Mostram dados corretos | |
| 3.5 | Card "Biblioteca de Exercicios" | Navega pra /biblioteca | |
| 3.6 | Card "Alimentacao IA" | Navega pra /alimentacao | |

---

## 4. CRIAR TREINO (PROFESSOR/ADMIN)

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 4.1 | Clicar "Criar Novo Treino" | Abre modal de escolha (Ficha ou Passo a Passo) | |
| 4.2 | Opcao "Montar Ficha" | Formulario com letra, nome, dropdown de aluno | |
| 4.3 | Criar ficha sem aluno | Ficha criada como "Pessoal" | |
| 4.4 | Criar ficha com aluno | Ficha criada e atribuida ao aluno | |
| 4.5 | Opcao "Passo a Passo" | Mostra grid de partes do corpo | |
| 4.6 | Clicar numa parte do corpo | Carrega exercicios da API | |
| 4.7 | Navegar entre exercicios (Proximo/Anterior) | Progress bar atualiza | |
| 4.8 | Finalizar passo a passo | Tela de concluido com confetti | |
| 4.9 | Deletar ficha | Ficha removida da lista | |

---

## 5. FICHA DE TREINO

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 5.1 | Abrir ficha existente | Mostra grupos e exercicios | |
| 5.2 | Adicionar grupo musclar | Grupo aparece na ficha | |
| 5.3 | Renomear grupo | Nome atualiza | |
| 5.4 | Deletar grupo | Grupo removido | |
| 5.5 | Adicionar exercicio ao grupo | Exercicio aparece na lista | |
| 5.6 | Editar series/reps/carga de exercicio | Valores atualizam | |
| 5.7 | Deletar exercicio | Exercicio removido | |
| 5.8 | Buscar exercicio na busca | Resultados aparecem | |
| 5.9 | Reordenar exercicios | Ordem atualiza | |

---

## 6. TREINAR (PASSO A PASSO DO ALUNO)

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 6.1 | Iniciar treino | Mostra primeiro exercicio com GIF | |
| 6.2 | GIF do exercicio | Anima corretamente ou mostra fallback | |
| 6.3 | Informacoes (series x reps) | Mostra quantidade correta | |
| 6.4 | Clicar "Proximo" | Vai pro proximo exercicio | |
| 6.5 | Clicar "Anterior" | Volta pro exercicio anterior | |
| 6.6 | Progress bar | Atualiza a cada exercicio | |
| 6.7 | Finalizar ultimo exercicio | Tela de concluido com confetti | |
| 6.8 | Tela de conclusao | Mostra total de exercicios, progresso 100% | |

---

## 7. MENSAGENS

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 7.1 | Abrir Mensagens (aluno) | Lista de contatos (professor) | |
| 7.2 | Abrir Mensagens (professor) | Lista de contatos (alunos) | |
| 7.3 | Barra de busca | Filtra contatos por nome | |
| 7.4 | Clicar num contato | Abre a conversa (thread) | |
| 7.5 | Enviar mensagem | Mensagem aparece na conversa | |
| 7.6 | Mensagem recebida em tempo real | Aparece automaticamente (polling 4s) | |
| 7.7 | Pressionar Enter | Envia mensagem | |
| 7.8 | Botao de enviar | Envia mensagem | |
| 7.9 | Mensagem vazia | Botao desabilitado | |
| 7.10 | Scroll de mensagens | Sobe e desce na conversa | |
| 7.11 | Seta voltar | Volta pra lista de conversas | |
| 7.12 | Badge de nao-lido | Aparece na conversa com numero | |
| 7.13 | Timestamp | Mostra hora, "Ontem", ou data | |
| 7.14 | Agrupamento por data | Separador "Hoje", "Ontem", data | |
| 7.15 | Mensagens proprias | Bolinha verde (lime) na direita | |
| 7.16 | Mensagens do outro | Bolinha escura na esquerda | |
| 7.17 | Check duplo nas proprias | Aparece icone de check | |

---

## 8. PERFIL

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 8.1 | Ver perfil | Mostra dados do usuario | |
| 8.2 | Editar nome | Salva corretamente | |
| 8.3 | Editar objetivo | Salva corretamente | |
| 8.4 | Editar altura/peso | Salva corretamente | |
| 8.5 | Editar dias da semana | Salva corretamente | |
| 8.6 | Editar nome do personal | Salva corretamente | |
| 8.7 | Botao "Salvar" | Mensagem "Perfil salvo" | |
| 8.8 | Estatisticas (Treinos, Series, etc.) | Mostram numeros corretos | |
| 8.9 | Historico de treinos expansivel | Mostra detalhes ao clicar | |
| 8.10 | Sair da conta | Redireciona pra login | |

---

## 9. PAINEL ADMIN

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 9.1 | Acessar /admin sendo admin | Painel carrega | |
| 9.2 | Acessar /admin sendo professor | Redireciona pra /app | |
| 9.3 | Acessar /admin sendo aluno | Redireciona pra /app | |
| 9.4 | Ver stats (Total, Admins, Professores, Alunos) | Numeros corretos | |
| 9.5 | Buscar usuario por nome | Filtra lista | |
| 9.6 | Filtrar por papel | Mostra apenas o papel selecionado | |
| 9.7 | Expandir card de usuario | Mostra detalhes e opcoes | |
| 9.8 | Mudar papel (Admin/Professor/Aluno) | Papel atualiza com sucesso | |
| 9.9 | Vincular aluno a professor | Vinculo criado | |
| 9.10 | Cadastrar novo aluno | Aluno criado com nome, email, senha | |
| 9.11 | Corrigir papel por email | Papel atualizado | |
| 9.12 | Criar convite | Link copiado, convite aparece na lista | |
| 9.13 | Excluir convite | Convite removido | |
| 9.14 | Status do convite (Ativo/Usado/Expirado) | Mostra status correto | |
| 9.15 | Indicador online | Bolinha verde para usuarios conectados | |

---

## 10. PROFESSOR - ALUNOS

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 10.1 | Acessar /professor | Lista de alunos aparece | |
| 10.2 | Vincular aluno por email | Busca e vincula | |
| 10.3 | Aluno ja vinculado | Mostra "Vinculado" | |
| 10.4 | Selecionar aluno | Mostra painel do aluno | |
| 10.5 | Ver fichas do aluno | Lista de fichas atribuidas | |
| 10.6 | Deletar ficha | Ficha removida | |
| 10.7 | Botao "Atribuir Treino" | Abre modal de escolha | |
| 10.8 | Opcao "Ficha" | Lista fichas existentes expandiveis | |
| 10.9 | Expandir ficha | Mostra exercicios com series, reps, kg | |
| 10.10 | Atribuir ficha | Ficha vinculada ao aluno | |
| 10.11 | Ja atribuida | Mostra badge "Atribuido" | |
| 10.12 | Opcao "Passo a Passo" | Biblioteca de exercicios | |
| 10.13 | Chips de grupo muscular | Filtram exercicios | |
| 10.14 | Chips de equipamento | Filtram exercicios | |
| 10.15 | Buscar por nome | Filtra exercicios | |
| 10.16 | Limpar filtros | Remove todos os filtros | |
| 10.17 | Adicionar exercicio | Exercicio selecionado | |
| 10.18 | Ver exercicio detalhe | Mostra GIF, info, seletor sets/reps | |
| 10.19 | Ajustar sets/reps no detalhe | Valores atualizam | |
| 10.20 | Finalizar selecao | Tela de revisao | |
| 10.21 | Remover exercicio na revisao | Exercicio removido | |
| 10.22 | Digitar letra e nome | Campos aceitam input | |
| 10.23 | Criar e atribuir treino | Treino criado e vinculado | |
| 10.24 | Tela de concluido | Mensagem de sucesso | |

---

## 11. BIBLIOTECA DE EXERCICIOS

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 11.1 | Acessar /biblioteca | Lista de exercicios aparece | |
| 11.2 | Buscar por nome | Filtra exercicios | |
| 11.3 | Filtrar por grupo muscular | Filtra corretamente | |
| 11.4 | Filtrar por equipamento | Filtra corretamente | |
| 11.5 | GIF dos exercicios | Carrega ou mostra fallback | |
| 11.6 | Clicar no exercicio | Abre detalhe com GIF grande | |
| 11.7 | Info do exercicio (musculo, equipamento) | Mostra corretamente | |

---

## 12. ALIMENTACAO IA

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 12.1 | Acessar /alimentacao | Tela carrega | |
| 12.2 | Gerar plano alimentar | Resposta da IA aparece | |
| 12.3 | Analisar refeicao | Resposta da IA aparece | |

---

## 13. NOTIFICACOES

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 13.1 | Sino de notificacoes | Mostra badge se tem nao-lidas | |
| 13.2 | Clicar no sino | Abre dropdown com notificacoes | |
| 13.3 | Marcar como lida | Badge some | |
| 13.4 | Clicar na notificacao | Navega pro link (se tiver) | |

---

## 14. FLUXO COMPLETO (E2E)

| # | Cenario | Passos | OK? |
|---|---------|--------|-----|
| 14.1 | Admin cadastra aluno | Admin > Usuarios > Cadastrar Aluno > Preencher dados > Cadastrar | |
| 14.2 | Admin cria convite | Admin > Convites > Criar Convite > Professor | |
| 14.3 | Professor vincula aluno | Professor > Vincular Aluno > Buscar email > Vincular | |
| 14.4 | Professor cria ficha | Inicio > Criar Treino > Montar Ficha > Preencher > Criar | |
| 14.5 | Professor edita ficha | Inicio > Fichas > Abrir > Editar exercicios | |
| 14.6 | Professor atribui ficha | Professor > Aluno > Atribuir Treino > Ficha > Selecionar | |
| 14.7 | Aluno vê treino | Aluno > Inicio > Card "Meu Treino" > Acessar | |
| 14.8 | Aluno faz treino passo a passo | Aluno > Meu Treino > Passo a Passo > Navegar > Finalizar | |
| 14.9 | Aluno ve ficha completa | Aluno > Meu Treino > Ver Ficha > Exercicios | |
| 14.10 | Aluno envia mensagem | Aluno > Mensagens > Professor > Digitar > Enviar | |
| 14.11 | Professor responde | Professor > Mensagens > Aluno > Digitar > Enviar | |
| 14.12 | Professor cria passo a passo | Professor > Aluno > Atribuir > Passo a Passo > Biblioteca > Selecionar > Finalizar | |
| 14.13 | Admin muda papel | Admin > Usuarios > Expandir > Trocar papel | |

---

## 15. EDGE CASES

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 15.1 | Sem conexao com internet | Mensagem de erro amigavel | |
| 15.2 | API de exercicios fora do ar | Mensagem de erro, nao quebra | |
| 15.3 | Enviar mensagem com texto vazio | Botao desabilitado | |
| 15.4 | Criar ficha sem letra | Erro "Digite a letra" | |
| 15.5 | Cadastrar aluno com senha < 6 chars | Erro de validacao | |
| 15.6 | Cadastrar aluno com email duplicado | Mensagem de erro | |
| 15.7 | Deletar ficha (confirm) | Cancela se "Nao", deleta se "Sim" | |
| 15.8 | Scroll longo nas mensagens | Scroll funciona, input sempre visivel | |
| 15.9 | Muitos exercicios no passo a passo | Progress bar nao quebra | |
| 15.10 | Timer de descanso (se existir) | Countdown funciona | |

---

## 16. PERFORMANCE

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| 16.1 | Tempo de carregamento inicial | < 3 segundos | |
| 16.2 | Scroll fluido | Sem travamentos | |
| 16.3 | Transicoes entre paginas | Suaves, sem flash | |
| 16.4 | Polling de mensagens | Nao causa lag | |
| 16.5 | Polling de notificacoes | Nao causa lag | |
| 16.6 | Imagens/GIFs | Lazy loading funciona | |

---

## RESPONSAVEL: ______________________ DATA: ____/____/____

## Observacoes:
_____________________________________________
_____________________________________________
_____________________________________________
