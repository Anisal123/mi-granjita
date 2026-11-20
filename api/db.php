<?php
declare(strict_types=1);

// Funciones compartidas por partidas.php y pueblo.php.
// El navegador nunca recibe la contraseña: solo PHP la lee desde config.php.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

// Los personajes válidos se leen del JSON del juego: agregar una skin no requiere tocar PHP.
function characterIds(): array
{
    static $ids = null;
    if ($ids === null) {
        $catalog = json_decode((string)@file_get_contents(__DIR__ . '/../src/data/cultivos.json'), true);
        $ids = array_values(array_filter(array_map(fn($c) => (string)($c['id'] ?? ''), $catalog['personajes'] ?? [])));
        if (!$ids) $ids = ['gato'];
    }
    return $ids;
}

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function readBody(): array
{
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '', true);
    if (!is_array($body)) {
        respond(400, ['ok' => false, 'error' => 'El cuerpo de la solicitud no contiene JSON válido.']);
    }
    return $body;
}

function cleanName(mixed $value): string
{
    return trim(preg_replace('/\s+/u', ' ', (string)$value) ?? '');
}

function validName(string $name): bool
{
    return $name !== '' && mb_strlen($name) <= 28;
}

function cleanCharacter(mixed $value): string
{
    $value = strtolower(trim((string)$value));
    $ids = characterIds();
    return in_array($value, $ids, true) ? $value : $ids[0];
}

// Código del pueblo: letras, números y guiones, de 3 a 16 caracteres, en mayúsculas.
function cleanVillage(mixed $value): ?string
{
    $value = strtoupper(trim((string)$value));
    return preg_match('/^[A-Z0-9-]{3,16}$/', $value) ? $value : null;
}

function connect(): PDO
{
    try {
        $config = require __DIR__ . '/config.php';
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
        $pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $error) {
        respond(503, ['ok' => false, 'error' => 'No se pudo conectar con MySQL. Inicia MySQL en Laragon, importa database/mi_granjita.sql y revisa api/config.local.php.']);
    }
    ensureSchema($pdo);
    return $pdo;
}

// Si la base se creó con la versión anterior (sin multijugador), agrega lo que falta.
// Así no hace falta borrar las partidas existentes.
function ensureSchema(PDO $pdo): void
{
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS partidas (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            nombre VARCHAR(80) NOT NULL,
            personaje VARCHAR(10) NOT NULL DEFAULT 'gato',
            pueblo VARCHAR(16) NOT NULL DEFAULT 'GRANJITA',
            estado_json LONGTEXT NOT NULL,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            ultima_conexion TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (id),
            KEY idx_partidas_actualizado (actualizado_en),
            KEY idx_partidas_pueblo (pueblo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $columns = array_column($pdo->query('SHOW COLUMNS FROM partidas')->fetchAll(), 'Field');
        if (!in_array('personaje', $columns, true)) {
            $pdo->exec("ALTER TABLE partidas ADD COLUMN personaje VARCHAR(10) NOT NULL DEFAULT 'gato' AFTER nombre");
        }
        if (!in_array('pueblo', $columns, true)) {
            $pdo->exec("ALTER TABLE partidas ADD COLUMN pueblo VARCHAR(16) NOT NULL DEFAULT 'GRANJITA' AFTER personaje, ADD KEY idx_partidas_pueblo (pueblo)");
        }
        if (!in_array('ultima_conexion', $columns, true)) {
            $pdo->exec('ALTER TABLE partidas ADD COLUMN ultima_conexion TIMESTAMP NULL DEFAULT NULL');
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS regalos (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $error) {
        respond(500, ['ok' => false, 'error' => 'No se pudo preparar la tabla de partidas. Importa database/mi_granjita.sql en phpMyAdmin.']);
    }
}
