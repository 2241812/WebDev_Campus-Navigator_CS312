<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// --- REFACTOR: Use centralized connection utility ---
require_once __DIR__ . '/db_utils.php';

// Create and check connection using the utility function
$conn = getDatabaseConnection();
// --- END REFACTOR ---

// 1. Fetch Nodes
$nodesResult = $conn->query("SELECT * FROM nodes");
$nodes = [];
while ($row = $nodesResult->fetch_assoc()) {

    $row['floor'] = (int)$row['floor'];
    $row['x'] = (int)$row['x'];
    $row['y'] = (int)$row['y'];
    $nodes[] = $row;
}

// 2. Fetch Edges
$edgesResult = $conn->query("SELECT * FROM edges");
$edges = [];
while ($row = $edgesResult->fetch_assoc()) {
    $edges[] = $row;
}

// 3. Fetch Floor Labels
$labelsResult = $conn->query("SELECT * FROM floor_labels");
$floorLabels = [];
while ($row = $labelsResult->fetch_assoc()) {
    $floorLabels[$row['floor_number']] = $row['label'];
}

// 4. Fetch Floor Images
$imagesResult = $conn->query("SELECT * FROM floor_images");
$floorPlans = [];
while ($row = $imagesResult->fetch_assoc()) {
    $floor_num = $row['floor_number'];
    $mime_type = $row['mime_type'];
    $base64 = base64_encode($row['image_data']);
    $floorPlans[$floor_num] = "data:$mime_type;base64,$base64";
}

// Return everything as one JSON object
echo json_encode([
    "nodes" => $nodes,
    "edges" => $edges,
    "floorLabels" => $floorLabels,
    "floorPlans" => $floorPlans
]);

$conn->close();
?>