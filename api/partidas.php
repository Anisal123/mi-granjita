<?php
declare(strict_types=1);

// CRUD de partidas. Cada partida es un jugador: nombre, personaje, pueblo y su estado JSON.
//   GET    partidas.php            → lista (opcional ?pueblo=CODIGO)
//   GET    partidas.php?id=5       → una partida con su estado
//   POST   partidas.php            → crea { nombre, personaje, pueblo, estado }
//   PUT    partidas.php?id=5       → guarda { estado }
//   PATCH  partidas.php?id=5       → cambia { nombre?, personaje? }
//   DELETE partidas.php?id=5       → borra

require __DIR__ . '/db.php';

function validState(mixed $state): bool
{
    return is_array($state)
        && isset($state['plots'])
        && is_array($state['plots'])
        && count($state['plots']) === 16
        && isset($state['day'], $state['coins'])
        && is_numeric($state['day'])
        && is_numeric($state['coins']);
}

function encodeState(array $state): string
{
    return json_encode($state, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
}

function rowWithSummary(array $row, bool $includeState = false): array
{
    $state = json_decode((string)$row['estado_json'], true);
    $summary = [
        'id' => (int)$row['id'],
        'nombre' => (string)$row['nombre'],
        'personaje' => (string)$row['personaje'],
        'pueblo' => (string)$row['pueblo'],
        'dia' => (int)($state['day'] ?? 1),
        'monedas' => (int)($state['coins'] ?? 0),
        'puntos' => (int)($state['score'] ?? 0),
        'variedades' => is_array($state['harvestedCropIds'] ?? null) ? count($state['harvestedCropIds']) : 0,
        'parcelas' => is_array($state['plots'] ?? null) ? count(array_filter($state['plots'], fn($p) => is_array($p) && ($p['status'] ?? '') !== 'locked')) : 0,
        'updatedAt' => (string)$row['actualizado_en'],
    ];
    if ($includeState) {
        $summary['estado'] = is_array($state) ? $state : null;
    }
    return $summary;
}

function findRow(PDO $pdo, int $id): ?array
{
    $query = $pdo->prepare('SELECT id, nombre, personaje, pueblo, estado_json, actualizado_en FROM partidas WHERE id = ?');
    $query->execute([$id]);
    $row = $query->fetch();
    return $row ?: null;
}

function nameTaken(PDO $pdo, string $name, string $village, int $exceptId = 0): bool
{
    $query = $pdo->prepare('SELECT COUNT(*) FROM partidas WHERE nombre = ? AND pueblo = ? AND id <> ?');
    $query->execute([$name, $village, $exceptId]);
    return (int)$query->fetchColumn() > 0;
}

$pdo = connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

try {
    if ($method === 'GET' && $id === null) {
        $village = isset($_GET['pueblo']) ? cleanVillage($_GET['pueblo']) : null;
        if ($village !== null) {
            $query = $pdo->prepare('SELECT id, nombre, personaje, pueblo, estado_json, actualizado_en FROM partidas WHERE pueblo = ? ORDER BY actualizado_en DESC, id DESC LIMIT 100');
            $query->execute([$village]);
            $rows = $query->fetchAll();
        } else {
            $rows = $pdo->query('SELECT id, nombre, personaje, pueblo, estado_json, actualizado_en FROM partidas ORDER BY actualizado_en DESC, id DESC LIMIT 100')->fetchAll();
        }
        respond(200, ['ok' => true, 'partidas' => array_map(fn($row) => rowWithSummary($row), $rows)]);
    }

    if ($method === 'GET' && $id !== false) {
        $row = findRow($pdo, $id);
        if (!$row) respond(404, ['ok' => false, 'error' => 'No se encontró esa partida.']);
        respond(200, ['ok' => true, 'partida' => rowWithSummary($row, true)]);
    }

    if ($method === 'POST') {
        $body = readBody();
        $name = cleanName($body['nombre'] ?? '');
        $character = cleanCharacter($body['personaje'] ?? 'gato');
        $village = cleanVillage($body['pueblo'] ?? 'GRANJITA');
        $state = $body['estado'] ?? null;
        if (!validName($name)) respond(422, ['ok' => false, 'error' => 'El nombre debe tener entre 1 y 28 caracteres.']);
        if ($village === null) respond(422, ['ok' => false, 'error' => 'El código del pueblo debe tener de 3 a 16 letras, números o guiones.']);
        if (!validState($state)) respond(422, ['ok' => false, 'error' => 'El estado de la partida no contiene sus 16 parcelas.']);
        if (nameTaken($pdo, $name, $village)) respond(409, ['ok' => false, 'error' => 'Ya hay una granja llamada «' . $name . '» en el pueblo ' . $village . '. Elige otro nombre.']);
        $state['gameName'] = $name;
        $state['character'] = $character;
        $state['village'] = $village;
        $insert = $pdo->prepare('INSERT INTO partidas (nombre, personaje, pueblo, estado_json, ultima_conexion) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)');
        $insert->execute([$name, $character, $village, encodeState($state)]);
        respond(201, ['ok' => true, 'partida' => rowWithSummary(findRow($pdo, (int)$pdo->lastInsertId()), true)]);
    }

    if ($method === 'PUT' && $id !== false && $id !== null) {
        $body = readBody();
        $state = $body['estado'] ?? null;
        if (!validState($state)) respond(422, ['ok' => false, 'error' => 'El estado de la partida no contiene sus 16 parcelas.']);
        $row = findRow($pdo, $id);
        if (!$row) respond(404, ['ok' => false, 'error' => 'No se encontró esa partida.']);
        // El nombre, el personaje y el pueblo los decide la base, no el navegador.
        $state['gameName'] = (string)$row['nombre'];
        $state['character'] = (string)$row['personaje'];
        $state['village'] = (string)$row['pueblo'];
        $update = $pdo->prepare('UPDATE partidas SET estado_json = ?, actualizado_en = CURRENT_TIMESTAMP, ultima_conexion = CURRENT_TIMESTAMP WHERE id = ?');
        $update->execute([encodeState($state), $id]);
        respond(200, ['ok' => true]);
    }

    if ($method === 'PATCH' && $id !== false && $id !== null) {
        $body = readBody();
        $row = findRow($pdo, $id);
        if (!$row) respond(404, ['ok' => false, 'error' => 'No se encontró esa partida.']);
        $name = array_key_exists('nombre', $body) ? cleanName($body['nombre']) : (string)$row['nombre'];
        $character = array_key_exists('personaje', $body) ? cleanCharacter($body['personaje']) : (string)$row['personaje'];
        if (!validName($name)) respond(422, ['ok' => false, 'error' => 'El nombre debe tener entre 1 y 28 caracteres.']);
        if (nameTaken($pdo, $name, (string)$row['pueblo'], $id)) respond(409, ['ok' => false, 'error' => 'Ya hay otra granja con ese nombre en el pueblo.']);
        $state = json_decode((string)$row['estado_json'], true);
        if (!is_array($state)) respond(500, ['ok' => false, 'error' => 'El estado guardado está dañado y no se pudo cambiar.']);
        $state['gameName'] = $name;
        $state['character'] = $character;
        $update = $pdo->prepare('UPDATE partidas SET nombre = ?, personaje = ?, estado_json = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?');
        $update->execute([$name, $character, encodeState($state), $id]);
        respond(200, ['ok' => true]);
    }

    if ($method === 'DELETE' && $id !== false && $id !== null) {
        $delete = $pdo->prepare('DELETE FROM partidas WHERE id = ?');
        $delete->execute([$id]);
        if ($delete->rowCount() === 0) respond(404, ['ok' => false, 'error' => 'No se encontró esa partida.']);
        respond(200, ['ok' => true]);
    }

    respond(405, ['ok' => false, 'error' => 'Método o identificador no válido.']);
} catch (Throwable $error) {
    respond(500, ['ok' => false, 'error' => 'MySQL no pudo procesar la partida. Comprueba que la tabla partidas exista y que sus permisos estén habilitados.']);
}
