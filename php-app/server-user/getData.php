<?php
/**
 * API Endpoint: Get Map Data
 *
 * Retrieves all map components (nodes, edges, floor labels, and floor plans)
 * from the database and returns them as a structured JSON object.
 *
 * Coding Standards Applied:
 * - PSR-12 Formatting
 * - Strict Typing
 * - Error Handling
 * - Separation of Concerns
 */

declare(strict_types=1);

// Prevent PHP errors from being printed to the output, breaking the JSON response.
error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

// Include the centralized database connection utility
require_once __DIR__ . '/db_utils.php';

try {
    // 1. Establish Database Connection
    $conn = getDatabaseConnection();

    // 2. Fetch Data Components
    $nodes = fetchNodes($conn);
    $edges = fetchEdges($conn);
    $floorLabels = fetchFloorLabels($conn);
    $floorPlans = fetchFloorPlans($conn);

    // 3. Construct Response Object
    // The structure must match what app-main.js expects: { nodes, edges, floorLabels, floorPlans }
    $response = [
        'nodes' => $nodes,
        'edges' => $edges,
        'floorLabels' => $floorLabels,
        'floorPlans' => $floorPlans,
    ];

    // 4. Send JSON Response
    echo json_encode($response, JSON_THROW_ON_ERROR);

} catch (Throwable $e) {
    // Handle Errors Gracefully
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal Server Error: ' . $e->getMessage()
    ]);
} finally {
    // Ensure database connection is closed
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

/**
 * Fetches all nodes and casts coordinates/floors to integers.
 *
 * @param mysqli $conn Active database connection.
 * @return array List of node objects.
 * @throws RuntimeException If the query fails.
 */
function fetchNodes(mysqli $conn): array
{
    $result = $conn->query("SELECT * FROM nodes");

    if (!$result) {
        throw new RuntimeException("Failed to fetch nodes: " . $conn->error);
    }

    $nodes = [];
    while ($row = $result->fetch_assoc()) {
        // Enforce integer types for numerical values
        $row['floor'] = (int)$row['floor'];
        $row['x'] = (int)$row['x'];
        $row['y'] = (int)$row['y'];
        $nodes[] = $row;
    }

    return $nodes;
}

/**
 * Fetches all graph edges.
 *
 * @param mysqli $conn Active database connection.
 * @return array List of edge objects.
 * @throws RuntimeException If the query fails.
 */
function fetchEdges(mysqli $conn): array
{
    $result = $conn->query("SELECT * FROM edges");

    if (!$result) {
        throw new RuntimeException("Failed to fetch edges: " . $conn->error);
    }

    $edges = [];
    while ($row = $result->fetch_assoc()) {
        $edges[] = $row;
    }

    return $edges;
}

/**
 * Fetches floor labels mapped by floor number.
 *
 * @param mysqli $conn Active database connection.
 * @return array Associative array [floor_number => label].
 * @throws RuntimeException If the query fails.
 */
function fetchFloorLabels(mysqli $conn): array
{
    $result = $conn->query("SELECT * FROM floor_labels");

    if (!$result) {
        throw new RuntimeException("Failed to fetch floor labels: " . $conn->error);
    }

    $floorLabels = [];
    while ($row = $result->fetch_assoc()) {
        $floorLabels[$row['floor_number']] = $row['label'];
    }

    return $floorLabels;
}

/**
 * Fetches floor plan images and converts them to Base64 strings.
 *
 * @param mysqli $conn Active database connection.
 * @return array Associative array [floor_number => data_uri].
 * @throws RuntimeException If the query fails.
 */
function fetchFloorPlans(mysqli $conn): array
{
    $result = $conn->query("SELECT * FROM floor_images");

    if (!$result) {
        throw new RuntimeException("Failed to fetch floor images: " . $conn->error);
    }

    $floorPlans = [];
    while ($row = $result->fetch_assoc()) {
        $floorNum = $row['floor_number'];
        $mimeType = $row['mime_type'];
        // Convert BLOB to Base64 for frontend display
        $base64 = base64_encode($row['image_data']);
        
        // Construct the full Data URI scheme required by <image href="..."> in app-main.js
        $floorPlans[$floorNum] = "data:{$mimeType};base64,{$base64}";
    }

    return $floorPlans;
}
?>