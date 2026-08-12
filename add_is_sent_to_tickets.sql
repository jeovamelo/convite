-- Adiciona a coluna is_sent na tabela tickets se ela não existir
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT FALSE;

-- Adiciona a coluna sent_at com data e hora de envio se ela não existir
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE NULL;
