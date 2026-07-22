import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============ BANCO DE ALIMENTOS (comuns no Brasil) ============
// Valores por 100g (ou por unidade quando indicado)
export type FoodEntry = {
  nome: string;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
  porcao: string; // descrição da porção padrão
  porcao_g: number; // gramas da porção padrão
  categoria: string;
};

const FOOD_DB: FoodEntry[] = [
  // Ovos e laticínios
  { nome: "Ovo cozido", calorias: 155, proteina: 13, carboidrato: 1.1, gordura: 11, porcao: "1 unidade (50g)", porcao_g: 50, categoria: "Ovos e Laticínios" },
  { nome: "Ovo frito", calorias: 196, proteina: 13, carboidrato: 1.4, gordura: 15, porcao: "1 unidade (50g)", porcao_g: 50, categoria: "Ovos e Laticínios" },
  { nome: "Clara de ovo", calorias: 52, proteina: 11, carboidrato: 0.7, gordura: 0.2, porcao: "1 unidade (33g)", porcao_g: 33, categoria: "Ovos e Laticínios" },
  { nome: "Leite integral", calorias: 61, proteina: 3.3, carboidrato: 4.9, gordura: 3.3, porcao: "1 copo (200ml)", porcao_g: 200, categoria: "Ovos e Laticínios" },
  { nome: "Leite desnatado", calorias: 34, proteina: 3.3, carboidrato: 5, gordura: 0.1, porcao: "1 copo (200ml)", porcao_g: 200, categoria: "Ovos e Laticínios" },
  { nome: "Iogurte natural", calorias: 63, proteina: 4.5, carboidrato: 3.6, gordura: 3.6, porcao: "1 pote (170g)", porcao_g: 170, categoria: "Ovos e Laticínios" },
  { nome: "Iogurte grego", calorias: 97, proteina: 9, carboidrato: 3.6, gordura: 5, porcao: "1 pote (170g)", porcao_g: 170, categoria: "Ovos e Laticínios" },
  { nome: "Queijo mussarela", calorias: 300, proteina: 22, carboidrato: 2.8, gordura: 23, porcao: "1 fatia (20g)", porcao_g: 20, categoria: "Ovos e Laticínios" },
  { nome: "Queijo minas frescal", calorias: 264, proteina: 18, carboidrato: 3.2, gordura: 20, porcao: "1 fatia (30g)", porcao_g: 30, categoria: "Ovos e Laticínios" },
  { nome: "Queijo cottage", calorias: 98, proteina: 11, carboidrato: 3.4, gordura: 4.3, porcao: "1 colher sopa (50g)", porcao_g: 50, categoria: "Ovos e Laticínios" },
  { nome: "Requeijão", calorias: 257, proteina: 8.5, carboidrato: 2.5, gordura: 24, porcao: "1 colher sopa (30g)", porcao_g: 30, categoria: "Ovos e Laticínios" },
  { nome: "Manteiga", calorias: 717, proteina: 0.5, carboidrato: 0.1, gordura: 81, porcao: "1 colher chá (10g)", porcao_g: 10, categoria: "Ovos e Laticínios" },

  // Carnes e peixes
  { nome: "Peito de frango grelhado", calorias: 165, proteina: 31, carboidrato: 0, gordura: 3.6, porcao: "1 filé (150g)", porcao_g: 150, categoria: "Carnes e Peixes" },
  { nome: "Coxa de frango assada", calorias: 177, proteina: 24, carboidrato: 0, gordura: 8.5, porcao: "1 unidade (80g)", porcao_g: 80, categoria: "Carnes e Peixes" },
  { nome: "Carne moída", calorias: 215, proteina: 18, carboidrato: 0, gordura: 16, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Carnes e Peixes" },
  { nome: "Patinho bovino grelhado", calorias: 183, proteina: 29, carboidrato: 0, gordura: 6.5, porcao: "1 bife (120g)", porcao_g: 120, categoria: "Carnes e Peixes" },
  { nome: "Contrafilé grelhado", calorias: 224, proteina: 27, carboidrato: 0, gordura: 12, porcao: "1 bife (150g)", porcao_g: 150, categoria: "Carnes e Peixes" },
  { nome: "Alcatra grelhada", calorias: 195, proteina: 28, carboidrato: 0, gordura: 8.5, porcao: "1 bife (120g)", porcao_g: 120, categoria: "Carnes e Peixes" },
  { nome: "Maminha grelhada", calorias: 205, proteina: 27, carboidrato: 0, gordura: 10, porcao: "1 bife (120g)", porcao_g: 120, categoria: "Carnes e Peixes" },
  { nome: "Picanha grelhada", calorias: 252, proteina: 24, carboidrato: 0, gordura: 17, porcao: "1 fatia (100g)", porcao_g: 100, categoria: "Carnes e Peixes" },
  { nome: "Filé mignon grelhado", calorias: 198, proteina: 28, carboidrato: 0, gordura: 9, porcao: "1 bife (120g)", porcao_g: 120, categoria: "Carnes e Peixes" },
  { nome: "Costela bovina assada", calorias: 280, proteina: 22, carboidrato: 0, gordura: 22, porcao: "1 pedaço (150g)", porcao_g: 150, categoria: "Carnes e Peixes" },
  { nome: "Linguiça calabresa", calorias: 290, proteina: 16, carboidrato: 4, gordura: 24, porcao: "1 unidade (100g)", porcao_g: 100, categoria: "Carnes e Peixes" },
  { nome: "Bacon", calorias: 541, proteina: 12, carboidrato: 1.4, gordura: 55, porcao: "2 fatias (20g)", porcao_g: 20, categoria: "Carnes e Peixes" },
  { nome: "Coxinha da asa", calorias: 195, proteina: 20, carboidrato: 0, gordura: 13, porcao: "1 unidade (40g)", porcao_g: 40, categoria: "Carnes e Peixes" },
  { nome: "Salmão grelhado", calorias: 208, proteina: 20, carboidrato: 0, gordura: 13, porcao: "1 filé (120g)", porcao_g: 120, categoria: "Carnes e Peixes" },
  { nome: "Tilápia grelhada", calorias: 128, proteina: 26, carboidrato: 0, gordura: 2.5, porcao: "1 filé (150g)", porcao_g: 150, categoria: "Carnes e Peixes" },
  { nome: "Atum em lata", calorias: 186, proteina: 24, carboidrato: 0, gordura: 9, porcao: "1 lata (170g)", porcao_g: 170, categoria: "Carnes e Peixes" },
  { nome: "Sardinha em lata", calorias: 208, proteina: 24, carboidrato: 0, gordura: 12, porcao: "1 lata (125g)", porcao_g: 125, categoria: "Carnes e Peixes" },
  { nome: "Camarão cozido", calorias: 99, proteina: 21, carboidrato: 0, gordura: 1.4, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Carnes e Peixes" },

  // Arroz, massas e cereais
  { nome: "Arroz branco cozido", calorias: 130, proteina: 2.5, carboidrato: 28, gordura: 0.3, porcao: "1 colher servir (100g)", porcao_g: 100, categoria: "Cereais e Massas" },
  { nome: "Arroz integral cozido", calorias: 124, proteina: 2.6, carboidrato: 26, gordura: 1, porcao: "1 colher servir (100g)", porcao_g: 100, categoria: "Cereais e Massas" },
  { nome: "Macarrão cozido", calorias: 131, proteina: 4.5, carboidrato: 26, gordura: 1.1, porcao: "1 prato (200g)", porcao_g: 200, categoria: "Cereais e Massas" },
  { nome: "Macarrão integral cozido", calorias: 124, proteina: 5, carboidrato: 25, gordura: 0.8, porcao: "1 prato (200g)", porcao_g: 200, categoria: "Cereais e Massas" },
  { nome: "Pão francês", calorias: 300, proteina: 8, carboidrato: 58, gordura: 3, porcao: "1 unidade (50g)", porcao_g: 50, categoria: "Cereais e Massas" },
  { nome: "Pão integral", calorias: 246, proteina: 9, carboidrato: 43, gordura: 3.4, porcao: "2 fatias (50g)", porcao_g: 50, categoria: "Cereais e Massas" },
  { nome: "Pão de queijo", calorias: 360, proteina: 6, carboidrato: 36, gordura: 22, porcao: "1 unidade (40g)", porcao_g: 40, categoria: "Cereais e Massas" },
  { nome: "Cuscuz", calorias: 113, proteina: 3.5, carboidrato: 24, gordura: 0.6, porcao: "1 fatia (100g)", porcao_g: 100, categoria: "Cereais e Massas" },
  { nome: "Farinha de mandioca", calorias: 360, proteina: 1.5, carboidrato: 85, gordura: 0.3, porcao: "1 colher sopa (30g)", porcao_g: 30, categoria: "Cereais e Massas" },
  { nome: "Aveia em flocos", calorias: 389, proteina: 14, carboidrato: 66, gordura: 6.5, porcao: "3 colheres sopa (30g)", porcao_g: 30, categoria: "Cereais e Massas" },
  { nome: "Granola", calorias: 430, proteina: 10, carboidrato: 65, gordura: 16, porcao: "1 porção (40g)", porcao_g: 40, categoria: "Cereais e Massas" },

  // Leguminosas
  { nome: "Feijão preto cozido", calorias: 90, proteina: 6, carboidrato: 16, gordura: 0.5, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },
  { nome: "Feijão carioca cozido", calorias: 88, proteina: 5.7, carboidrato: 16, gordura: 0.5, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },
  { nome: "Lentilha cozida", calorias: 93, proteina: 7.5, carboidrato: 16, gordura: 0.4, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },
  { nome: "Grão de bico cozido", calorias: 139, proteina: 8.2, carboidrato: 23, gordura: 2.3, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },
  { nome: "Ervilha cozida", calorias: 81, proteina: 5.4, carboidrato: 14, gordura: 0.4, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },
  { nome: "Soja cozida", calorias: 141, proteina: 12, carboidrato: 11, gordura: 6.2, porcao: "1 concha (100g)", porcao_g: 100, categoria: "Leguminosas" },

  // Legumes e verduras
  { nome: "Batata inglesa cozida", calorias: 87, proteina: 1.8, carboidrato: 20, gordura: 0.1, porcao: "1 unidade (150g)", porcao_g: 150, categoria: "Legumes" },
  { nome: "Batata doce cozida", calorias: 86, proteina: 1.6, carboidrato: 20, gordura: 0.1, porcao: "1 unidade (150g)", porcao_g: 150, categoria: "Legumes" },
  { nome: "Mandioquinha cozida", calorias: 97, proteina: 1.6, carboidrato: 22, gordura: 0.3, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Inhame cozido", calorias: 116, proteina: 1.5, carboidrato: 28, gordura: 0.2, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Brócolis cozido", calorias: 35, proteina: 2.8, carboidrato: 7, gordura: 0.4, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Espinafre refogado", calorias: 35, proteina: 3.5, carboidrato: 4, gordura: 0.7, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Couve refogada", calorias: 48, proteina: 3.2, carboidrato: 7, gordura: 0.9, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Alface", calorias: 15, proteina: 1.4, carboidrato: 2.9, gordura: 0.2, porcao: "1 prato (50g)", porcao_g: 50, categoria: "Legumes" },
  { nome: "Tomate", calorias: 18, proteina: 0.9, carboidrato: 3.9, gordura: 0.2, porcao: "1 unidade (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Cenoura cozida", calorias: 41, proteina: 1, carboidrato: 10, gordura: 0.1, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Abóbora cozida", calorias: 33, proteina: 1.2, carboidrato: 7, gordura: 0.1, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Abobrinha refogada", calorias: 25, proteina: 1.1, carboidrato: 5, gordura: 0.2, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Chuchu cozido", calorias: 18, proteina: 0.7, carboidrato: 4, gordura: 0.1, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Vagem cozida", calorias: 31, proteina: 1.8, carboidrato: 7, gordura: 0.2, porcao: "1 porção (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Beterraba cozida", calorias: 43, proteina: 1.8, carboidrato: 10, gordura: 0.2, porcao: "1 unidade (100g)", porcao_g: 100, categoria: "Legumes" },
  { nome: "Milho cozido", calorias: 96, proteina: 3.4, carboidrato: 21, gordura: 1.2, porcao: "1 espiga (100g)", porcao_g: 100, categoria: "Legumes" },

  // Frutas
  { nome: "Banana prata", calorias: 98, proteina: 1.3, carboidrato: 26, gordura: 0.1, porcao: "1 unidade (80g)", porcao_g: 80, categoria: "Frutas" },
  { nome: "Banana nanica", calorias: 92, proteina: 1.2, carboidrato: 24, gordura: 0.1, porcao: "1 unidade (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Maçã", calorias: 52, proteina: 0.3, carboidrato: 14, gordura: 0.2, porcao: "1 unidade (150g)", porcao_g: 150, categoria: "Frutas" },
  { nome: "Laranja", calorias: 47, proteina: 0.9, carboidrato: 12, gordura: 0.1, porcao: "1 unidade (160g)", porcao_g: 160, categoria: "Frutas" },
  { nome: "Mamão", calorias: 43, proteina: 0.5, carboidrato: 11, gordura: 0.1, porcao: "1 fatia (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Abacate", calorias: 160, proteina: 2, carboidrato: 8.5, gordura: 15, porcao: "1/2 unidade (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Melancia", calorias: 30, proteina: 0.6, carboidrato: 8, gordura: 0.2, porcao: "1 fatia (200g)", porcao_g: 200, categoria: "Frutas" },
  { nome: "Melão", calorias: 34, proteina: 0.8, carboidrato: 8, gordura: 0.2, porcao: "1 fatia (150g)", porcao_g: 150, categoria: "Frutas" },
  { nome: "Uva", calorias: 69, proteina: 0.7, carboidrato: 18, gordura: 0.2, porcao: "1 cacho (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Manga", calorias: 60, proteina: 0.8, carboidrato: 15, gordura: 0.4, porcao: "1 unidade (200g)", porcao_g: 200, categoria: "Frutas" },
  { nome: "Abacaxi", calorias: 50, proteina: 0.5, carboidrato: 13, gordura: 0.1, porcao: "1 fatia (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Morango", calorias: 32, proteina: 0.7, carboidrato: 8, gordura: 0.3, porcao: "1 xícara (100g)", porcao_g: 100, categoria: "Frutas" },
  { nome: "Açaí", calorias: 247, proteina: 3.8, carboidrato: 52, gordura: 3.3, porcao: "1 tigela (100g)", porcao_g: 100, categoria: "Frutas" },

  // Oleaginosas e sementes
  { nome: "Castanha do Pará", calorias: 643, proteina: 14, carboidrato: 12, gordura: 64, porcao: "2 unidades (10g)", porcao_g: 10, categoria: "Oleaginosas" },
  { nome: "Amêndoa", calorias: 579, proteina: 21, carboidrato: 22, gordura: 50, porcao: "10 unidades (15g)", porcao_g: 15, categoria: "Oleaginosas" },
  { nome: "Nozes", calorias: 654, proteina: 15, carboidrato: 14, gordura: 65, porcao: "5 unidades (15g)", porcao_g: 15, categoria: "Oleaginosas" },
  { nome: "Amendoim", calorias: 567, proteina: 25, carboidrato: 16, gordura: 49, porcao: "1 punhado (30g)", porcao_g: 30, categoria: "Oleaginosas" },
  { nome: "Pasta de amendoim", calorias: 588, proteina: 25, carboidrato: 20, gordura: 50, porcao: "1 colher sopa (20g)", porcao_g: 20, categoria: "Oleaginosas" },
  { nome: "Linhaça", calorias: 534, proteina: 18, carboidrato: 29, gordura: 42, porcao: "1 colher sopa (10g)", porcao_g: 10, categoria: "Oleaginosas" },
  { nome: "Chia", calorias: 486, proteina: 17, carboidrato: 42, gordura: 31, porcao: "1 colher sopa (15g)", porcao_g: 15, categoria: "Oleaginosas" },

  // Bebidas
  { nome: "Água", calorias: 0, proteina: 0, carboidrato: 0, gordura: 0, porcao: "1 copo (200ml)", porcao_g: 200, categoria: "Bebidas" },
  { nome: "Café preto", calorias: 3, proteina: 0.3, carboidrato: 0, gordura: 0, porcao: "1 xícara (100ml)", porcao_g: 100, categoria: "Bebidas" },
  { nome: "Café com leite", calorias: 45, proteina: 2.4, carboidrato: 4, gordura: 2, porcao: "1 xícara (200ml)", porcao_g: 200, categoria: "Bebidas" },
  { nome: "Suco de laranja", calorias: 45, proteina: 0.7, carboidrato: 10, gordura: 0.2, porcao: "1 copo (200ml)", porcao_g: 200, categoria: "Bebidas" },
  { nome: "Suco de limão", calorias: 22, proteina: 0.3, carboidrato: 5, gordura: 0.1, porcao: "1 copo (200ml)", porcao_g: 200, categoria: "Bebidas" },
  { nome: "Refrigerante", calorias: 41, proteina: 0, carboidrato: 10.6, gordura: 0, porcao: "1 lata (350ml)", porcao_g: 350, categoria: "Bebidas" },
  { nome: "Cerveja", calorias: 43, proteina: 0.5, carboidrato: 3.6, gordura: 0, porcao: "1 lata (350ml)", porcao_g: 350, categoria: "Bebidas" },
  { nome: "Álcool 40° (destilados)", calorias: 231, proteina: 0, carboidrato: 0, gordura: 0, porcao: "1 dose (50ml)", porcao_g: 50, categoria: "Bebidas" },

  // Molhos e temperos
  { nome: "Azeite de oliva", calorias: 884, proteina: 0, carboidrato: 0, gordura: 100, porcao: "1 colher sopa (15ml)", porcao_g: 15, categoria: "Molhos" },
  { nome: "Óleo de soja", calorias: 884, proteina: 0, carboidrato: 0, gordura: 100, porcao: "1 colher sopa (15ml)", porcao_g: 15, categoria: "Molhos" },
  { nome: "Maionese", calorias: 700, proteina: 1, carboidrato: 0.7, gordura: 77, porcao: "1 colher sopa (15g)", porcao_g: 15, categoria: "Molhos" },
  { nome: "Ketchup", calorias: 101, proteina: 1, carboidrato: 28, gordura: 0.1, porcao: "1 colher sopa (15g)", porcao_g: 15, categoria: "Molhos" },
  { nome: "Mostarda", calorias: 66, proteina: 3.7, carboidrato: 5, gordura: 4, porcao: "1 colher chá (5g)", porcao_g: 5, categoria: "Molhos" },
  { nome: "Mel", calorias: 304, proteina: 0.3, carboidrato: 82, gordura: 0, porcao: "1 colher sopa (20g)", porcao_g: 20, categoria: "Molhos" },

  // Preparações e misc
  { nome: "Tapioca", calorias: 130, proteina: 0.3, carboidrato: 32, gordura: 0.1, porcao: "1 unidade (70g)", porcao_g: 70, categoria: "Preparações" },
  { nome: "Farofa", calorias: 400, proteina: 2.5, carboidrato: 60, gordura: 18, porcao: "1 colher servir (50g)", porcao_g: 50, categoria: "Preparações" },
  { nome: "Arroz doce", calorias: 120, proteina: 2.5, carboidrato: 22, gordura: 2, porcao: "1 tigela (150g)", porcao_g: 150, categoria: "Preparações" },
  { nome: "Salada de frutas", calorias: 65, proteina: 0.8, carboidrato: 16, gordura: 0.3, porcao: "1 tigela (150g)", porcao_g: 150, categoria: "Preparações" },
  { nome: "Sopa de legumes", calorias: 38, proteina: 1.5, carboidrato: 7, gordura: 0.5, porcao: "1 prato (250ml)", porcao_g: 250, categoria: "Preparações" },
  { nome: "Caldo de feijão", calorias: 55, proteina: 3.5, carboidrato: 9, gordura: 0.5, porcao: "1 concha (100ml)", porcao_g: 100, categoria: "Preparações" },
  { nome: "Pizza mussarela", calorias: 280, proteina: 11, carboidrato: 32, gordura: 12, porcao: "1 fatia (100g)", porcao_g: 100, categoria: "Preparações" },
  { nome: "Hambúrguer", calorias: 295, proteina: 17, carboidrato: 30, gordura: 12, porcao: "1 unidade (150g)", porcao_g: 150, categoria: "Preparações" },
  { nome: "Coxinha frita", calorias: 250, proteina: 8, carboidrato: 28, gordura: 12, porcao: "1 unidade (60g)", porcao_g: 60, categoria: "Preparações" },
  { nome: "Pastel frito", calorias: 320, proteina: 7, carboidrato: 32, gordura: 18, porcao: "1 unidade (70g)", porcao_g: 70, categoria: "Preparações" },
  { nome: "Esfirra", calorias: 210, proteina: 9, carboidrato: 26, gordura: 8, porcao: "1 unidade (80g)", porcao_g: 80, categoria: "Preparações" },
  { nome: "Pão de batata", calorias: 250, proteina: 6, carboidrato: 35, gordura: 10, porcao: "1 unidade (80g)", porcao_g: 80, categoria: "Preparações" },
  { nome: "Whey protein (dose)", calorias: 120, proteina: 24, carboidrato: 2, gordura: 1.5, porcao: "1 scoop (30g)", porcao_g: 30, categoria: "Suplementos" },
  { nome: "Albumina", calorias: 110, proteina: 22, carboidrato: 2, gordura: 1, porcao: "1 scoop (30g)", porcao_g: 30, categoria: "Suplementos" },
];

export const FOOD_CATEGORIES = [...new Set(FOOD_DB.map(f => f.categoria))].sort();

export function searchFoods(query: string, categoria?: string): FoodEntry[] {
  const q = query.toLowerCase().trim();
  let results = FOOD_DB;
  if (q) results = results.filter(f => f.nome.toLowerCase().includes(q));
  if (categoria) results = results.filter(f => f.categoria === categoria);
  return results;
}

export function getAllFoods(): FoodEntry[] {
  return FOOD_DB;
}

// ============ CÁLCULO NUTRICIONAL ============

const PROTEIN_CAL_PER_G = 4;
const CARB_CAL_PER_G = 4;
const FAT_CAL_PER_G = 9;

function calcBMR(peso: number, altura: number, idade: number, sexo: string): number {
  if (sexo === "male") {
    return 10 * peso + 6.25 * altura - 5 * idade + 5;
  }
  return 10 * peso + 6.25 * altura - 5 * idade - 161;
}

function calcTDEE(bmr: number, atividade: number): number {
  return bmr * atividade;
}

function calcMacros(calorias: number, proteinaPct: number, carbPct: number, gorduraPct: number) {
  return {
    proteins: `${Math.round((calorias * proteinaPct / 100) / PROTEIN_CAL_PER_G)}g (${proteinaPct}%)`,
    carbohydrates: `${Math.round((calorias * carbPct / 100) / CARB_CAL_PER_G)}g (${carbPct}%)`,
    fats: `${Math.round((calorias * gorduraPct / 100) / FAT_CAL_PER_G)}g (${gorduraPct}%)`,
  };
}

// ============ RECEITAS SUGERIDAS POR REFEIÇÃO ============

type Receita = {
  nome: string;
  ingredientes: string[];
  calorias: number;
};

const CAFE_MANHA: Receita[] = [
  { nome: "Vitamina de banana com aveia", ingredientes: ["1 banana", "200ml leite", "2 colheres aveia", "1 colher mel"], calorias: 350 },
  { nome: "Pão integral com ovo e queijo", ingredientes: ["2 fatias pão integral", "2 ovos", "1 fatia queijo mussarela"], calorias: 380 },
  { nome: "Tapioca com frango e queijo", ingredientes: ["1 tapioca", "100g peito frango desfiado", "1 fatia queijo minas", "orégano"], calorias: 320 },
  { nome: "Iogurte com granola e frutas", ingredientes: ["1 pote iogurte natural", "2 colheres granola", "1 banana", "5 morangos"], calorias: 290 },
  { nome: "Café da manhã fit", ingredientes: ["2 ovos mexidos", "1 fatia pão integral", "1/2 abacate", "café preto"], calorias: 350 },
  { nome: "Panqueca de banana fit", ingredientes: ["1 banana amassada", "2 ovos", "2 colheres aveia", "canela"], calorias: 270 },
  { nome: "Mingau de aveia", ingredientes: ["3 colheres aveia", "200ml leite", "1 colher mel", "canela"], calorias: 300 },
  { nome: "Omelete de claras com legumes", ingredientes: ["4 claras", "tomate picado", "espinafre", "1 fatia queijo minas"], calorias: 240 },
];

const LANCHE_MANHA: Receita[] = [
  { nome: "Mix de castanhas", ingredientes: ["10 amêndoas", "5 castanhas Pará", "1 banana"], calorias: 280 },
  { nome: "Iogurte grego com mel", ingredientes: ["1 pote iogurte grego", "1 colher mel", "2 colheres granola"], calorias: 220 },
  { nome: "Pasta de amendoim com banana", ingredientes: ["1 banana", "1 colher pasta amendoim"], calorias: 180 },
  { nome: "Frutas da estação", ingredientes: ["1 maçã", "1 laranja", "5 morangos"], calorias: 140 },
  { nome: "Shake de whey", ingredientes: ["1 scoop whey", "200ml leite", "1 banana"], calorias: 250 },
  { nome: "Tapioca com pasta de amendoim", ingredientes: ["1/2 tapioca", "1 colher pasta amendoim", "1 colher mel"], calorias: 200 },
];

const ALMOCO: Receita[] = [
  { nome: "Frango grelhado com arroz e legumes", ingredientes: ["150g peito frango", "100g arroz integral", "brócolis", "cenoura"], calorias: 480 },
  { nome: "Filé mignon com batata doce", ingredientes: ["120g filé mignon", "150g batata doce", "salada verde"], calorias: 430 },
  { nome: "Salmão com quinoa e espinafre", ingredientes: ["120g salmão", "100g quinoa", "espinafre refogado"], calorias: 490 },
  { nome: "Strogonoff de frango", ingredientes: ["150g peito frango", "1 colher creme leite", "arroz branco", "batata palha"], calorias: 520 },
  { nome: "Bife acebolado com arroz e feijão", ingredientes: ["120g patinho", "100g arroz", "1 concha feijão", "cebola"], calorias: 500 },
  { nome: "Macarrão com almôndegas", ingredientes: ["200g macarrão integral", "100g carne moída", "molho tomate", "queijo ralado"], calorias: 510 },
  { nome: "Frango ao curry com arroz", ingredientes: ["150g frango", "100g arroz basmati", "curry", "leite coco"], calorias: 470 },
  { nome: "Lasanha de berinjela", ingredientes: ["berinjela", "200g carne moída", "molho tomate", "queijo mussarela"], calorias: 440 },
  { nome: "Peixe grelhado com purê", ingredientes: ["150g tilápia", "2 batatas purê", "salada"], calorias: 400 },
  { nome: "Frango xadrez", ingredientes: ["150g frango", "pimentão", "cebola", "molho shoyu", "arroz branco"], calorias: 460 },
];

const LANCHE_TARDE: Receita[] = [
  { nome: "Whey com frutas", ingredientes: ["1 scoop whey", "200ml água", "1 banana", "5 morangos"], calorias: 200 },
  { nome: "Pão de queijo com café", ingredientes: ["3 pães de queijo", "1 xícara café com leite"], calorias: 280 },
  { nome: "Crepioca", ingredientes: ["1 tapioca", "1 ovo", "2 colheres queijo cottage", "orégano"], calorias: 240 },
  { nome: "Frutas secas e castanhas", ingredientes: ["3 damascos", "5 nozes", "10 uvas passas"], calorias: 180 },
  { nome: "Smoothie verde", ingredientes: ["1 copo leite", "1 banana", "espinafre", "1 colher mel"], calorias: 210 },
  { nome: "Ovos mexidos com torrada", ingredientes: ["2 ovos", "1 fatia pão integral", "manteiga"], calorias: 260 },
  { nome: "Sanduíche natural", ingredientes: ["2 fatias pão integral", "2 fatias peito peru", "queijo minas", "alface tomate"], calorias: 300 },
];

const JANTAR: Receita[] = [
  { nome: "Salmão com legumes assados", ingredientes: ["120g salmão", "batata doce", "abobrinha", "cenoura"], calorias: 420 },
  { nome: "Frango grelhado com salada", ingredientes: ["150g peito frango", "mix folhas", "tomate", "azeite"], calorias: 350 },
  { nome: "Omelete recheada", ingredientes: ["3 ovos", "queijo minas", "espinafre", "tomate"], calorias: 340 },
  { nome: "Sopa de legumes com frango", ingredientes: ["150g frango desfiado", "batata", "cenoura", "abóbora"], calorias: 300 },
  { nome: "Atum com arroz integral", ingredientes: ["1 lata atum", "100g arroz integral", "milho", "ervilha"], calorias: 380 },
  { nome: "Camarão refogado com legumes", ingredientes: ["100g camarão", "pimentão", "cebola", "arroz integral"], calorias: 360 },
  { nome: "Filé de frango empanado assado", ingredientes: ["150g filé frango", "aveia em flocos", "purê batata doce"], calorias: 390 },
  { nome: "Wrap integral de frango", ingredientes: ["1 wrap integral", "100g frango desfiado", "alface", "tomate", "requeijão"], calorias: 340 },
];

const CEIA: Receita[] = [
  { nome: "Chá com torrada", ingredientes: ["1 xícara chá", "1 torrada integral", "1 colher ricota"], calorias: 100 },
  { nome: "Iogurte proteico", ingredientes: ["1 pote iogurte grego", "1 scoop whey"], calorias: 200 },
  { nome: "Leite morno com mel", ingredientes: ["200ml leite", "1 colher mel", "canela"], calorias: 150 },
  { nome: "Banana com canela", ingredientes: ["1 banana", "canela em pó"], calorias: 100 },
  { nome: "Clara de ovo cozida", ingredientes: ["3 claras cozidas", "sal"], calorias: 65 },
];

const RECEITAS_POR_REFEICAO: Record<string, Receita[]> = {
  "Café da manhã": CAFE_MANHA,
  "Lanche da manhã": LANCHE_MANHA,
  "Almoço": ALMOCO,
  "Lanche da tarde": LANCHE_TARDE,
  "Jantar": JANTAR,
  "Ceia": CEIA,
};

const REFEICOES = Object.keys(RECEITAS_POR_REFEICAO);

function distribuirCalorias(totalCal: number): Record<string, number> {
  const pcts: Record<string, number> = {
    "Café da manhã": 0.2,
    "Lanche da manhã": 0.1,
    "Almoço": 0.3,
    "Lanche da tarde": 0.1,
    "Jantar": 0.25,
    "Ceia": 0.05,
  };
  const result: Record<string, number> = {};
  for (const [ref, pct] of Object.entries(pcts)) {
    result[ref] = Math.round(totalCal * pct);
  }
  return result;
}

function sortearReceitas(calRefeicao: Record<string, number>): MealCategory[] {
  return REFEICOES.map(ref => {
    const receitas = RECEITAS_POR_REFEICAO[ref];
    const calBudget = calRefeicao[ref];
    // Embaralha e pega 2 sugestões
    const shuffled = [...receitas].sort(() => Math.random() - 0.5);
    const suggestions = shuffled.slice(0, 2).map(r => ({
      name: r.nome,
      ingredients: r.ingredientes,
      calories: r.calorias,
    }));
    return { meal: ref, suggestions };
  });
}

// ============ EXPOSIÇÃO DE TIPOS (iguais aos anteriores) ============

export type FoodItem = {
  name: string;
  portion_size: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
};

export type FoodPlateResult = {
  foods_identified: FoodItem[];
  total_nutrition: {
    total_calories: string;
    total_protein: string;
    total_carbs: string;
    total_fats: string;
    fiber: string;
    vitamins_minerals: string[];
    vitamins_minerais: string[];
  };
  meal_analysis: {
    meal_type: string;
    balance_score: string;
    protein_ratio: string;
    carb_ratio: string;
    fat_ratio: string;
  };
  health_insights: {
    meal_balance: string;
    positive_aspects: string[];
    improvement_areas: string[];
    suggestions: string[];
  };
  dietary_flags: {
    is_vegetarian: boolean;
    is_vegano: boolean;
    is_vegetariano: boolean;
    is_gluten_free: boolean;
    is_dairy_free: boolean;
    allergens: string[];
  };
};

export type MealSuggestion = {
  name: string;
  ingredients: string[];
  calories: number;
};

export type MealCategory = {
  meal: string;
  suggestions: MealSuggestion[];
};

export type MealPlanResult = {
  exercise_name: string;
  description: string;
  goal: string;
  calories_per_day: number;
  macronutrients: {
    carbohydrates: string;
    proteins: string;
    fats: string;
  };
  meal_suggestions: MealCategory[];
};

export type NutritionAdviceInput = {
  weight: number;
  height: number;
  age: number;
  sex: "male" | "female";
  goal: "lose_weight" | "gain_muscle" | "maintain";
};

// ============ FUNÇÕES SERVER ============

/** Gera plano alimentar com lógica própria (sem API externa) */
export const generateNutritionPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (d: NutritionAdviceInput) =>
      z
        .object({
          weight: z.number().min(30).max(300),
          height: z.number().min(100).max(250),
          age: z.number().min(14).max(100),
          sex: z.enum(["male", "female"]),
          goal: z.enum(["lose_weight", "gain_muscle", "maintain"]),
        })
        .parse(d)
  )
  .handler(async ({ data }) => {
    const bmr = calcBMR(data.weight, data.height, data.age, data.sex);
    const tdee = calcTDEE(bmr, 1.5); // atividade moderada
    let calorias: number;
    let descricao: string;
    let nome: string;

    switch (data.goal) {
      case "lose_weight":
        calorias = Math.round(tdee - 500);
        descricao = "Plano focado em déficit calórico moderado para perda de peso sustentável. Prioriza proteínas para preservar massa magra e fibras para saciedade.";
        nome = "Plano de Definição";
        break;
      case "gain_muscle":
        calorias = Math.round(tdee + 400);
        descricao = "Plano hipercalórico para ganho de massa muscular. Ênfase em proteínas de alto valor biológico e carboidratos complexos para energia nos treinos.";
        nome = "Plano de Ganho de Massa";
        break;
      default:
        calorias = Math.round(tdee);
        descricao = "Plano equilibrado para manutenção do peso atual. Nutrientes distribuídos de forma balanceada para saúde e performance.";
        nome = "Plano de Manutenção";
    }

    const macroConfig = {
      lose_weight: { prot: 35, carb: 35, fat: 30 },
      gain_muscle: { prot: 35, carb: 40, fat: 25 },
      maintain: { prot: 25, carb: 50, fat: 25 },
    };
    const mc = macroConfig[data.goal];
    const macros = calcMacros(calorias, mc.prot, mc.carb, mc.fat);

    const calRefeicao = distribuirCalorias(calorias);
    const meal_suggestions = sortearReceitas(calRefeicao);

    return {
      exercise_name: nome,
      description: descricao,
      goal: data.goal,
      calories_per_day: calorias,
      macronutrients: macros,
      meal_suggestions,
    } as MealPlanResult;
  });

/** Analisa refeição a partir de uma lista de alimentos manual (sem foto) */
export const analisarRefeicao = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { alimentos: { nome: string; porcao_g: number }[] }) =>
      z.object({
        alimentos: z.array(z.object({ nome: z.string(), porcao_g: z.number().min(1).max(5000) })),
      }).parse(d)
  )
  .handler(async ({ data }) => {
    let totalCal = 0;
    let totalProt = 0;
    let totalCarb = 0;
    let totalFat = 0;
    const identified: FoodItem[] = [];

    for (const item of data.alimentos) {
      const food = FOOD_DB.find(f => f.nome.toLowerCase() === item.nome.toLowerCase());
      if (!food) continue;
      const fator = item.porcao_g / 100;
      const cal = Math.round(food.calorias * fator);
      const prot = Math.round(food.proteina * fator * 10) / 10;
      const carb = Math.round(food.carboidrato * fator * 10) / 10;
      const fat = Math.round(food.gordura * fator * 10) / 10;
      totalCal += cal;
      totalProt += prot;
      totalCarb += carb;
      totalFat += fat;
      identified.push({
        name: food.nome,
        portion_size: `${item.porcao_g}g`,
        calories: `${cal} cal`,
        protein: `${prot}g`,
        carbs: `${carb}g`,
        fats: `${fat}g`,
      });
    }

    // Análise de balanço
    const protPct = totalCal > 0 ? Math.round((totalProt * 4 / totalCal) * 100) : 0;
    const carbPct = totalCal > 0 ? Math.round((totalCarb * 4 / totalCal) * 100) : 0;
    const fatPct = totalCal > 0 ? Math.round((totalFat * 9 / totalCal) * 100) : 0;

    let balanceScore = "Regular";
    if (protPct >= 20 && protPct <= 40 && carbPct >= 30 && carbPct <= 60 && fatPct >= 15 && fatPct <= 35) {
      balanceScore = "Bom";
    } else if (protPct >= 15 && protPct <= 45 && carbPct >= 20 && carbPct <= 65 && fatPct >= 10 && fatPct <= 40) {
      balanceScore = "Razoável";
    }

    const positives: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];

    if (totalProt > 20) positives.push("Boa quantidade de proteínas para saciedade e recuperação muscular");
    else if (totalProt < 15) improvements.push("A refeição tem pouca proteína. Tente incluir frango, ovos ou leguminosas");

    if (totalCarb > 30 && totalCarb < 80) positives.push("Carboidratos em quantidade moderada para energia");
    else if (totalCarb > 100) improvements.push("Muitos carboidratos nesta refeição. Considere reduzir porções de arroz, massas ou pães");

    if (totalFat < 10) improvements.push("Pouca gordura saudável. Adicione azeite, abacate ou oleaginosas");
    else if (totalFat > 30 && totalFat < 50) positives.push("Gorduras em quantidade equilibrada");

    if (identified.length > 3) positives.push("Refeição variada com diferentes grupos alimentares");
    if (identified.length < 3) suggestions.push("Torne a refeição mais variada incluindo legumes, verduras ou uma fonte diferente de proteína");
    if (totalCal > 800) suggestions.push("Refeição muito calórica para uma única refeição. Considere dividir em duas porções");
    if (totalCal < 300 && data.alimentos.length > 0) suggestions.push("Refeição leve. Se for uma refeição principal, tente aumentar as porções");
    if (positives.length === 0) positives.push("Refeição enquadrada nos parâmetros nutricionais");

    const result: FoodPlateResult = {
      foods_identified: identified,
      total_nutrition: {
        total_calories: `${totalCal}`,
        total_protein: `${totalProt}g`,
        total_carbs: `${totalCarb}g`,
        total_fats: `${totalFat}g`,
        fiber: "—",
        vitamins_minerals: [],
        vitamins_minerais: [],
      },
      meal_analysis: {
        meal_type: "Refeição informada manualmente",
        balance_score: balanceScore,
        protein_ratio: `${protPct}%`,
        carb_ratio: `${carbPct}%`,
        fat_ratio: `${fatPct}%`,
      },
      health_insights: {
        meal_balance: balanceScore === "Bom" ? "Refeição equilibrada" : "Refeição com desequilíbrio nos macronutrientes",
        positive_aspects: positives,
        improvement_areas: improvements,
        suggestions: suggestions,
      },
      dietary_flags: {
        is_vegetarian: false,
        is_vegano: false,
        is_vegetariano: false,
        is_gluten_free: false,
        is_dairy_free: false,
        allergens: [],
      },
    };
    return result;
  });
