<?php
// saveMapData.php

header('Content-Type: application/json');

// 1. Connect to database
$conn = new mysqli("localhost", "root", "", "graphDB");
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// 2. Get JSON data from the POST request body
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

// Check if data is valid
if (!$data || !isset($data['nodes']) || !isset($data['edges'])) {
    die(json_encode(["success" => false, "message" => "Invalid or empty map data received."]));
}

// 3. Start a database transaction
$conn->begin_transaction();

try {
    // 4. Clear the existing map data
    $conn->query("TRUNCATE TABLE nodes");
    $conn->query("TRUNCATE TABLE edges");

    // 5. Prepare to insert new nodes
    $stmtNodes = $conn->prepare(
        "INSERT INTO nodes (id, name, type, floor, x, y, access)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($data['nodes'] as $node) {
        $access = isset($node['access']) ? $node['access'] : NULL;
        $stmtNodes->bind_param(
            "sssiiis",
            $node['id'],
            $node['name'],
            $node['type'],
            $node['floor'],
            $node['x'],
            $node['y'],
            $access
        );
        $stmtNodes->execute();
    }
    $stmtNodes->close();

    // 6. Prepare to insert new edges
    $stmtEdges = $conn->prepare("INSERT INTO edges (source, target) VALUES (?, ?)");
    foreach ($data['edges'] as $edge) {
        $stmtEdges->bind_param("ss", $edge['source'], $edge['target']);
        $stmtEdges->execute();
    }
    $stmtEdges->close();

    // 7. If all successful, commit the transaction
    $conn->commit();
    echo json_encode(["success" => true, "message" => "Map data saved to database!"]);

} catch (mysqli_sql_exception $exception) {
    // 8. If anything failed, roll back
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Database error: " . $exception->getMessage()]);
}

$conn->close();
?>