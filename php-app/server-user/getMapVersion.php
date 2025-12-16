<?php
/**
 * API Endpoint: Get Map Version
 *
 * Retrieves the current map version timestamp from the database.
 * Clients poll this endpoint to determine if they need to re-fetch the map data.
 *
 * Coding Standards Applied:
 * - PSR-12 Formatting
 * - Strict Typing
 * - Error Handling
 * - Cache Control Headers
 */

declare(strict_types=1);

// Prevent PHP errors from leaking into the JSON response
error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

require_once __DIR__ . '/db_utils.php';

try {
    // 1. Establish Database Connection
    $conn = getDatabaseConnection();

    // 2. Fetch Version
    $version = fetchMapVersion($conn);

    // 3. Return JSON Response
    // We cast to int to ensure the client receives a number, not a string string
    echo json_encode(['lastUpdated' => $version], JSON_THROW_ON_ERROR);

} catch (Throwable $e) {
    // Return a 0 or strictly formatted error so the client doesn't crash on parse
    http_response_code(500);
    echo json_encode([
        'lastUpdated' => 0,
        'error' => 'Internal Server Error: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

/**
 * Queries the database for the current 'map_version' setting.
 *
 * @param mysqli $conn Active database connection.
 * @return int The timestamp of the last update, or 0 if not found.
 * @throws RuntimeException If the query fails.
 */
function fetchMapVersion(mysqli $conn): int
{
    $key = 'map_version';
    $stmt = $conn->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");

    if (!$stmt) {
        throw new RuntimeException("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("s", $key);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $version = 0;
    if ($row = $result->fetch_assoc()) {
        // setting_value is stored as a string in DB, but represents a timestamp
        $version = (int)$row['setting_value'];
    }

    $stmt->close();
    return $version;
}
?>