-- Mi Granjita: base de datos para Laragon (MySQL 5.7+ / 8 o MariaDB 10.3+).
-- Impórtalo en phpMyAdmin. Si ya tenías la versión anterior, no hace falta borrarla:
-- api/db.php agrega automáticamente las columnas y la tabla nuevas.

CREATE DATABASE IF NOT EXISTS mi_granjita
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mi_granjita;

-- Cada fila es la granja de un jugador dentro de un pueblo (sala multijugador).
CREATE TABLE IF NOT EXISTS partidas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  personaje VARCHAR(10) NOT NULL DEFAULT 'gato',      -- gato | conejo | oveja
  pueblo VARCHAR(16) NOT NULL DEFAULT 'GRANJITA',     -- código de la sala
  estado_json LONGTEXT NOT NULL,                      -- día, monedas, inventario, 16 parcelas…
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ultima_conexion TIMESTAMP NULL DEFAULT NULL,        -- para saber quién está en línea
  PRIMARY KEY (id),
  KEY idx_partidas_actualizado (actualizado_en),
  KEY idx_partidas_pueblo (pueblo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semillas que un jugador regala a otro del mismo pueblo.
CREATE TABLE IF NOT EXISTS regalos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  de_partida_id BIGINT UNSIGNED NOT NULL,
  para_partida_id BIGINT UNSIGNED NOT NULL,
  cultivo_id VARCHAR(30) NOT NULL,
  cantidad SMALLINT UNSIGNED NOT NULL,
  entregado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_regalos_pendientes (para_partida_id, entregado),
  CONSTRAINT fk_regalos_de FOREIGN KEY (de_partida_id) REFERENCES partidas (id) ON DELETE CASCADE,
  CONSTRAINT fk_regalos_para FOREIGN KEY (para_partida_id) REFERENCES partidas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
