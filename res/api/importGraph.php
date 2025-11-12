<?php
// Connect to database
$conn = new mysqli("localhost", "root", "", "graphDB");
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

// Load JSON data
// FIX 1: Correct path to find the JSON file
$jsonData = file_get_contents('../../school_map_data.json');
$data = json_decode($jsonData, true);

// Insert nodes
if (isset($data['nodes'])) {
    $stmt = $conn->prepare(
        "INSERT INTO nodes (id, name, type, floor, x, y, access)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=?, type=?, floor=?, x=?, y=?, access=?"
    );

    foreach ($data['nodes'] as $node) {
        $access = isset($node['access']) ? $node['access'] : NULL;
        
        // FIX 2: Correct type string (13 letters for 13 variables)
        $stmt->bind_param(
            "sssiiisssiiis",
            $node['id'],
            $node['name'],
            $node['type'],
            $node['floor'],
            $node['x'],
            $node['y'],
            $access,
            $node['name'],
            $node['type'],
            $node['floor'],
            $node['x'],
            $node['y'],
            $access
        );
        $stmt->execute();
    }
    $stmt->close();
}

// Insert edges
if (isset($data['edges'])) {
    $stmt = $conn->prepare("INSERT INTO edges (source, target) VALUES (?, ?)");
    foreach ($data['edges'] as $edge) {
        $stmt->bind_param("ss", $edge['source'], $edge['target']);
        $stmt->execute();
    }
    $stmt->close();
}

echo "JSON data successfully imported into graphDB!";
$conn->close();
?>