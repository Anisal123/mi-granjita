<?php
declare(strict_types=1);

// Multijugador por "pueblo" (una sala con código).
//   GET  pueblo.php?pueblo=CODIGO&yo=5  → marca a la partida 5 como conectada, devuelve
//                                         los jugadores del pueblo (ranking) y le entrega
//                                         los regalos pendientes.
//   POST pueblo.php  { de, para, cultivoId, cantidad } → envía semillas de regalo.
// El navegador pregunta cada pocos segundos (polling); no hace falta un servidor WebSocket.

require __DIR__ . '/db.php';

const SEGUNDOS_EN_LINEA = 25;
const MAX_REGALO = 5;

$pdo = connect();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

function villagePlayers(PDO $pdo, string $village): array
{
    $query = $pdo->prepare('SELECT id, nombre, personaje, estado_json,
            (ultima_conexion IS NOT NULL AND TIMESTAMPDIFF(SECOND, ultima_conexion, CURRENT_TIMESTAMP) <= ?) AS en_linea
        FROM partidas WHERE pueblo = ? LIMIT 200');
    $query->execute([SEGUNDOS_EN_LINEA, $village]);
    $players = array_map(function (array $row): array {
        $state = json_decode((string)$row['estado_json'], true) ?: [];
        return [
            'id' => (int)$row['id'],
            'nombre' => (string)$row['nombre'],
            'personaje' => (string)$row['personaje'],
            'dia' => (int)($state['day'] ?? 1),
            'puntos' => (int)($state['score'] ?? 0),
            'monedas' => (int)($state['coins'] ?? 0),
            'variedades' => is_array($state['harvestedCropIds'] ?? null) ? count($state['harvestedCropIds']) : 0,
            'parcelas' => is_array($state['plots'] ?? null) ? count(array_filter($state['plots'], fn($p) => is_array($p) && ($p['status'] ?? '') !== 'locked')) : 0,
            'gano' => ($state['won'] ?? false) === true,
            'enLinea' => (bool)$row['en_linea'],
        ];
    }, $query->fetchAll());
    // Ranking: más progreso (parcelas), luego más variedades, luego quien llegó con menos días.
    usort($players, fn($a, $b) => [$b['puntos'], $b['parcelas'], $b['variedades'], $a['dia']] <=> [$a['puntos'], $a['parcelas'], $a['variedades'], $b['dia']]);
    return $players;
}

try {
    if ($method === 'GET') {
        $village = cleanVillage($_GET['pueblo'] ?? '');
        if ($village === null) respond(422, ['ok' => false, 'error' => 'Código de pueblo no válido.']);
        $me = filter_input(INPUT_GET, 'yo', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $gifts = [];

        if ($me) {
            $ping = $pdo->prepare('UPDATE partidas SET ultima_conexion = CURRENT_TIMESTAMP WHERE id = ? AND pueblo = ?');
            $ping->execute([$me, $village]);

            // Entrega los regalos una sola vez aunque haya dos pestañas abiertas.
            $pdo->beginTransaction();
            $pending = $pdo->prepare('SELECT r.id, r.cultivo_id, r.cantidad, p.nombre AS de_nombre, p.personaje AS de_personaje
                FROM regalos r JOIN partidas p ON p.id = r.de_partida_id
                WHERE r.para_partida_id = ? AND r.entregado = 0 ORDER BY r.id FOR UPDATE');
            $pending->execute([$me]);
            $rows = $pending->fetchAll();
            if ($rows) {
                $ids = array_map(fn($row) => (int)$row['id'], $rows);
                $marks = implode(',', array_fill(0, count($ids), '?'));
                $pdo->prepare("UPDATE regalos SET entregado = 1 WHERE id IN ($marks)")->execute($ids);
            }
            $pdo->commit();
            $gifts = array_map(fn($row) => [
                'id' => (int)$row['id'],
                'cultivoId' => (string)$row['cultivo_id'],
                'cantidad' => (int)$row['cantidad'],
                'de' => (string)$row['de_nombre'],
                'dePersonaje' => (string)$row['de_personaje'],
            ], $rows);
        }

        respond(200, ['ok' => true, 'pueblo' => $village, 'jugadores' => villagePlayers($pdo, $village), 'regalos' => $gifts]);
    }

    if ($method === 'POST') {
        $body = readBody();
        $from = filter_var($body['de'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $to = filter_var($body['para'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $cropId = (string)($body['cultivoId'] ?? '');
        $amount = filter_var($body['cantidad'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_REGALO]]);
        if (!$from || !$to || $from === $to) respond(422, ['ok' => false, 'error' => 'Elige a otra persona del pueblo para enviar el regalo.']);
        if (!preg_match('/^[a-z0-9-]{1,30}$/', $cropId)) respond(422, ['ok' => false, 'error' => 'Cultivo no válido.']);
        if (!$amount) respond(422, ['ok' => false, 'error' => 'Puedes regalar de 1 a ' . MAX_REGALO . ' semillas a la vez.']);

        $pdo->beginTransaction();
        $query = $pdo->prepare('SELECT id, pueblo, estado_json FROM partidas WHERE id IN (?, ?) FOR UPDATE');
        $query->execute([$from, $to]);
        $rows = [];
        foreach ($query->fetchAll() as $row) $rows[(int)$row['id']] = $row;
        if (!isset($rows[$from], $rows[$to])) { $pdo->rollBack(); respond(404, ['ok' => false, 'error' => 'No se encontró a esa persona en el pueblo.']); }
        if ($rows[$from]['pueblo'] !== $rows[$to]['pueblo']) { $pdo->rollBack(); respond(422, ['ok' => false, 'error' => 'Solo puedes regalar a granjas de tu mismo pueblo.']); }

        // El servidor comprueba que quien regala tenga esas semillas y las descuenta.
        $state = json_decode((string)$rows[$from]['estado_json'], true);
        $have = (int)($state['seedInventory'][$cropId] ?? 0);
        if (!is_array($state) || $have < $amount) { $pdo->rollBack(); respond(422, ['ok' => false, 'error' => 'No tienes suficientes semillas para ese regalo.']); }
        $state['seedInventory'][$cropId] = $have - $amount;
        $pdo->prepare('UPDATE partidas SET estado_json = ? WHERE id = ?')
            ->execute([json_encode($state, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR), $from]);
        $pdo->prepare('INSERT INTO regalos (de_partida_id, para_partida_id, cultivo_id, cantidad) VALUES (?, ?, ?, ?)')
            ->execute([$from, $to, $cropId, $amount]);
        $pdo->commit();
        respond(201, ['ok' => true, 'semillasRestantes' => $have - $amount]);
    }

    respond(405, ['ok' => false, 'error' => 'Método no válido.']);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(500, ['ok' => false, 'error' => 'MySQL no pudo procesar la información del pueblo.']);
}
