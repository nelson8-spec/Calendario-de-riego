CREATE DATABASE Calendario_de_riego;

USE Calendario_de_riego;

CREATE TABLE historial_ambiental (
    id INT AUTO_INCREMENT PRIMARY KEY,
    humedad_relativa DECIMAL(5, 2) NOT NULL,
    temperatura DECIMAL(4, 1),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calendario_riego (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') NOT NULL,
    hora TIME NOT NULL
);