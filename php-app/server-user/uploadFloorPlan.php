<?php
// server-user/uploadFloorPlan.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// --- REFACTOR: Use centralized connection utility ---
require_once __DIR__ . '/db_utils.php';

// Create and check connection using the utility function
// The utility handles the connection and exits gracefully on failure
$conn = getDatabaseConnection(); 
// --- END REFACTOR ---

// Check if file exists
if (!isset($_FILES['floorImage']) || !isset($_POST['floorNumber'])) {
    die(json_encode(["success" => false, "message" => "Missing file or floor number."]));
}

$floorNumber = (int)$_POST['floorNumber'];
$fileType = $_FILES['floorImage']['type'];
$fileData = file_get_contents($_FILES['floorImage']['tmp_name']);

// Prepare Statement
$stmt = $conn->prepare("INSERT INTO floor_images (floor_number, mime_type, image_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), image_data = VALUES(image_data)");
$null = NULL;
$stmt->bind_param("isb", $floorNumber, $fileType, $null);
$stmt->send_long_data(2, $fileData);

if ($stmt->execute()) {
    // Update map version to trigger refresh on clients
    $newTime = time() * 1000;
    $conn->query("UPDATE settings SET setting_value = '$newTime' WHERE setting_key = 'map_version'");
    
    echo json_encode(["success" => true, "message" => "Floor plan uploaded successfully."]);
} else {
    echo json_encode(["success" => false, "message" => "Database Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>