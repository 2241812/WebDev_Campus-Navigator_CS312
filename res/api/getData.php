<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "graphDB");
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// 1. Get Nodes
$nodesResult = $conn->query("SELECT * FROM nodes");
$nodes = [];
while ($row = $nodesResult->fetch_assoc()) {
    $nodes[] = $row;
}

// 2. Get Edges
$edgesResult = $conn->query("SELECT * FROM edges");
$edges = [];
while ($row = $edgesResult->fetch_assoc()) {
    $edges[] = $row;
}

// 3. Get Floor Labels
$labelsResult = $conn->query("SELECT * FROM floor_labels");
$floorLabels = [];
while ($row = $labelsResult->fetch_assoc()) {
    $floorLabels[$row['floor_number']] = $row['label'];
}

// 4. Get Floor Images (This is the missing part)
$imagesResult = $conn->query("SELECT * FROM floor_images");
$floorPlans = [];
while ($row = $imagesResult->fetch_assoc()) {
    $floor_num = $row['floor_number'];
    $mime_type = $row['mime_type'];
    // Encode the image data to Base64 to send it in the JSON
    $image_data = base64_encode($row['image_data']);
    
    // Create the "Data URL" string that your JavaScript needs
    $floorPlans[$floor_num] = "data:$mime_type;base64,$image_data";
}

// 5. Echo the complete map data object
echo json_encode([
    "nodes" => $nodes,
    "edges" => $edges,
    "floorLabels" => $floorLabels,
    "floorPlans" => $floorPlans  // <-- Add the floorplans here
]);

$conn->close();
?>