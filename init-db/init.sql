CREATE TABLE IF NOT EXISTS historial_ambiental (
    id SERIAL PRIMARY KEY,
    humedad_relativa NUMERIC(5,2) NOT NULL,
    temperatura NUMERIC(4,1),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dia') THEN
    CREATE TYPE dia AS ENUM ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS calendario_riego (
    id SERIAL PRIMARY KEY,
    dia_semana dia NOT NULL,
    hora TIME NOT NULL,
    CONSTRAINT unico_riego_diayhora UNIQUE (dia_semana, hora)
);