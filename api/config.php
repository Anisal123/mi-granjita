<?php
declare(strict_types=1);

// Para Laragon normalmente el servidor es localhost y el usuario es root.
// Si tu instalación tiene contraseña, crea api/config.local.php y cámbiala allí.
$localConfig = __DIR__ . '/config.local.php';
$local = is_file($localConfig) ? require $localConfig : [];
$local = is_array($local) ? $local : [];

return [
    'host' => getenv('MI_GRANJITA_DB_HOST') ?: ($local['host'] ?? '127.0.0.1'),
    'port' => getenv('MI_GRANJITA_DB_PORT') ?: ($local['port'] ?? '3306'),
    'database' => getenv('MI_GRANJITA_DB_NAME') ?: ($local['database'] ?? 'mi_granjita'),
    'username' => getenv('MI_GRANJITA_DB_USER') ?: ($local['username'] ?? 'root'),
    'password' => getenv('MI_GRANJITA_DB_PASSWORD') ?: ($local['password'] ?? ''),
];
