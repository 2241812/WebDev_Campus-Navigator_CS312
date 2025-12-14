<?php
// server-user/getMapVersion.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

// --- REFACTOR: Use centralized connection utility ---
require_once __DIR__ . '/db_utils.php';

// Create and check connection using the utility function
$conn = getDatabaseConnection();
// --- END REFACTOR ---

$result = $conn->query("SELECT setting_value FROM settings WHERE setting_key = 'map_version'");
$lastUpdated = 0;

if ($result && $row = $result->fetch_assoc()) {
    $lastUpdated = $row['setting_value'];
}

echo json_encode(['lastUpdated' => (int)$lastUpdated]);

$conn->close();
?>