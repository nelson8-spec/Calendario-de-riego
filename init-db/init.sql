CREATE TABLE IF NOT EXISTS historial_ambiental (
    id SERIAL PRIMARY KEY,
    humedad_relativa DECIMAL(5, 2) NOT NULL,
    temperatura DECIMAL(4, 1),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE DIA AS ENUM ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo');
CREATE TABLE IF NOT EXISTS calendario_riego (
    id SERIAL PRIMARY KEY,
    dia_semana DIA NOT NULL,
    hora TIME NOT NULL
);