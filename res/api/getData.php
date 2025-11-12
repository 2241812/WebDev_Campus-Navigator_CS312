<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "graphDB");
if ($conn->connect_error) die(json_encode(["error" => "Connection failed"]));

$nodesResult = $conn->query("SELECT * FROM nodes");
$nodes = [];
while ($row = $nodesResult->fetch_assoc()) {
    $nodes[] = $row;
}

$edgesResult = $conn->query("SELECT * FROM edges");
$edges = [];
while ($row = $edgesResult->fetch_assoc()) {
    $edges[] = $row;
}

echo json_encode(["nodes" => $nodes, "edges" => $edges]);

$conn->close();
?>
