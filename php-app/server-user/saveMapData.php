<?php
/**
 * API Endpoint: Save Map Data
 *
 * Receives the full map state (nodes, edges, labels) from the frontend client
 * and overwrites the current database state in a single atomic transaction.
 *
 * Coding Standards Applied:
 * - PSR-12 Formatting
 * - Strict Typing
 * - Atomic Transactions with Rollback
 * - Modular helper functions
 */

declare(strict_types=1);

// Disable error display to prevent breaking JSON output
error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

// Use the centralized connection utility
require_once __DIR__ . '/db_utils.php';

try {
    // 1. Validate Input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true, 512, JSON_THROW_ON_ERROR);

    if (!isset($data['nodes'], $data['edges'])) {
        throw new InvalidArgumentException("Missing required map data (nodes or edges).");
    }

    // 2. Connect & Start Transaction
    $conn = getDatabaseConnection();
    $conn->begin_transaction();

    // 3. Perform Database Operations
    clearExistingMapData($conn);
    
    if (!empty($data['nodes'])) {
        saveNodes($conn, $data['nodes']);
    }

    if (!empty($data['edges'])) {
        saveEdges($conn, $data['edges']);
    }

    if (!empty($data['floorLabels'])) {
        saveFloorLabels($conn, $data['floorLabels']);
    }

    // 4. Update Versioning (Consistent with Node.js service)
    updateMapVersion($conn);

    // 5. Commit Transaction
    $conn->commit();

    echo json_encode(['success' => true, 'message' => 'Map data saved successfully!']);

} catch (Throwable $e) {
    // Rollback changes if anything failed
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

/**
 * Truncates all map-related tables.
 * Disables foreign key checks temporarily to allow arbitrary deletion order.
 */
function clearExistingMapData(mysqli $conn): void
{
    $conn->query("SET FOREIGN_KEY_CHECKS = 0");
    $conn->query("TRUNCATE TABLE nodes");
    $conn->query("TRUNCATE TABLE edges");
    $conn->query("TRUNCATE TABLE floor_labels");
    $conn->query("SET FOREIGN_KEY_CHECKS = 1");
}

/**
 * Inserts nodes into the database.
 * * @param mysqli $conn
 * @param array $nodes List of node arrays
 */
function saveNodes(mysqli $conn, array $nodes): void
{
    $stmt = $conn->prepare(
        "INSERT INTO nodes (id, name, type, floor, x, y, access) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    if (!$stmt) {
        throw new RuntimeException("Prepare failed for nodes: " . $conn->error);
    }

    foreach ($nodes as $node) {
        $id     = (string) ($node['id'] ?? '');
        $name   = (string) ($node['name'] ?? '');
        $type   = (string) ($node['type'] ?? 'room');
        $floor  = (int)    ($node['floor'] ?? 1);
        $x      = (int)    ($node['x'] ?? 0);
        $y      = (int)    ($node['y'] ?? 0);
        $access = (string) ($node['access'] ?? 'all');

        $stmt->bind_param("sssiiis", $id, $name, $type, $floor, $x, $y, $access);
        $stmt->execute();
    }
    $stmt->close();
}

/**
 * Inserts edges into the database.
 */
function saveEdges(mysqli $conn, array $edges): void
{
    $stmt = $conn->prepare("INSERT INTO edges (source, target) VALUES (?, ?)");

    if (!$stmt) {
        throw new RuntimeException("Prepare failed for edges: " . $conn->error);
    }

    foreach ($edges as $edge) {
        $source = (string) $edge['source'];
        $target = (string) $edge['target'];
        
        $stmt->bind_param("ss", $source, $target);
        $stmt->execute();
    }
    $stmt->close();
}

/**
 * Inserts floor labels into the database.
 */
function saveFloorLabels(mysqli $conn, array $floorLabels): void
{
    $stmt = $conn->prepare("INSERT INTO floor_labels (floor_number, label) VALUES (?, ?)");

    if (!$stmt) {
        throw new RuntimeException("Prepare failed for floor labels: " . $conn->error);
    }

    foreach ($floorLabels as $floorNum => $label) {
        $floorInt = (int) $floorNum;
        $labelStr = (string) $label;

        $stmt->bind_param("is", $floorInt, $labelStr);
        $stmt->execute();
    }
    $stmt->close();
}

/**
 * Updates the 'map_version' setting with the current timestamp.
 * This aligns with how uploadFloorPlan.php updates the version.
 */
function updateMapVersion(mysqli $conn): void
{
    $newTime = (string) (time() * 1000);
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both fresh creates and updates
    $stmt = $conn->prepare(
        "INSERT INTO settings (setting_key, setting_value) 
         VALUES ('map_version', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?"
    );
    
    $stmt->bind_param("ss", $newTime, $newTime);
    $stmt->execute();
    $stmt->close();
}
?>