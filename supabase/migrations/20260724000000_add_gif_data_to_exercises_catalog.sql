-- Adiciona coluna gif_data para armazenar GIFs como base64 no banco
-- evita depender de Storage e da RapidAPI após o sync inicial
ALTER TABLE public.exercises_catalog ADD COLUMN IF NOT EXISTS gif_data text;
