<?php
// File: server-user/saveMapData.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// --- REFACTOR: Use centralized connection utility ---
require_once __DIR__ . '/db_utils.php';

// Create and check connection using the utility function
// The utility handles the connection and exits gracefully on failure
$conn = getDatabaseConnection();
// --- END REFACTOR ---

// Get JSON input
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

if (!$data || !isset($data['nodes']) || !isset($data['edges'])) {
    die(json_encode(["success" => false, "message" => "Invalid map data."]));
}

$conn->begin_transaction();

try {
    // Disable foreign keys to clear tables cleanly
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    $conn->query("TRUNCATE TABLE nodes");
    $conn->query("TRUNCATE TABLE edges");
    $conn->query("TRUNCATE TABLE floor_labels");
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");

    // Insert Nodes
    if (!empty($data['nodes'])) {
        $stmtNodes = $conn->prepare("INSERT INTO nodes (id, name, type, floor, x, y, access) VALUES (?, ?, ?, ?, ?, ?, ?)");
        foreach ($data['nodes'] as $node) {
            $access = isset($node['access']) ? $node['access'] : 'all';
            $stmtNodes->bind_param("sssiiis", $node['id'], $node['name'], $node['type'], $node['floor'], $node['x'], $node['y'], $access);
            $stmtNodes->execute();
        }
        $stmtNodes->close();
    }

    // Insert Edges
    if (!empty($data['edges'])) {
        $stmtEdges = $conn->prepare("INSERT INTO edges (source, target) VALUES (?, ?)");
        foreach ($data['edges'] as $edge) {
            $stmtEdges->bind_param("ss", $edge['source'], $edge['target']);
            $stmtEdges->execute();
        }
        $stmtEdges->close();
    }

    // Insert Floor Labels
    if (isset($data['floorLabels']) && !empty($data['floorLabels'])) {
        $stmtLabels = $conn->prepare("INSERT INTO floor_labels (floor_number, label) VALUES (?, ?)");
        foreach ($data['floorLabels'] as $floor_num => $label) {
            $stmtLabels->bind_param("is", $floor_num, $label);
            $stmtLabels->execute();
        }
        $stmtLabels->close();
    }

    // Update Version
    $newTime = time() * 1000;
    $conn->query("INSERT INTO settings (setting_key, setting_value) VALUES ('map_version', '$newTime') ON DUPLICATE KEY UPDATE setting_value = '$newTime'");
    $ch = curl_init("http://go-app:8080/api/refresh");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1); 
    curl_exec($ch);
    curl_close($ch);
   

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Map saved successfully!"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}

$conn->close();
?>