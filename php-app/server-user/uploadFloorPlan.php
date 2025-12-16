<?php
/**
 * API Endpoint: Upload Floor Plan
 *
 * Handles the upload of floor plan images, storing them as BLOBs in the database
 * and updating the map version to trigger client refreshes.
 *
 * Coding Standards Applied:
 * - PSR-12 Formatting
 * - Strict Typing
 * - Modular helper functions
 * - Consistent Error Handling
 */

declare(strict_types=1);

// Disable error display to prevent breaking JSON output
error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/db_utils.php';

try {
    // 1. Establish Database Connection
    $conn = getDatabaseConnection();

    // 2. Validate Request Data
    $uploadData = validateInput($_POST, $_FILES);

    // 3. Process Upload
    saveFloorImage(
        $conn, 
        $uploadData['floorNumber'], 
        $uploadData['fileType'], 
        $uploadData['fileContent']
    );

    // 4. Update Versioning
    updateMapVersion($conn);

    // 5. Notify External Services (Optional consistency with saveMapData)
    notifyGoService();

    echo json_encode([
        'success' => true, 
        'message' => 'Floor plan uploaded successfully.'
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Upload failed: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}

/**
 * Validates and extracts input data from POST and FILES.
 *
 * @param array $postData $_POST array
 * @param array $fileData $_FILES array
 * @return array{floorNumber: int, fileType: string, fileContent: string}
 * @throws InvalidArgumentException If inputs are missing or invalid.
 */
function validateInput(array $postData, array $fileData): array
{
    if (!isset($postData['floorNumber']) || !isset($fileData['floorImage'])) {
        throw new InvalidArgumentException("Missing required fields: floorNumber or floorImage.");
    }

    if ($fileData['floorImage']['error'] !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException("File upload error code: " . $fileData['floorImage']['error']);
    }

    $floorNumber = (int)$postData['floorNumber'];
    $fileType = (string)$fileData['floorImage']['type'];
    $filePath = $fileData['floorImage']['tmp_name'];

    $content = file_get_contents($filePath);
    if ($content === false) {
        throw new RuntimeException("Failed to read uploaded file content.");
    }

    return [
        'floorNumber' => $floorNumber,
        'fileType'    => $fileType,
        'fileContent' => $content
    ];
}

/**
 * Saves the image data to the database using BLOB handling.
 *
 * @param mysqli $conn Active database connection.
 * @param int $floorNumber The floor number.
 * @param string $mimeType The file MIME type.
 * @param string $data The binary file content.
 * @throws RuntimeException If the query fails.
 */
function saveFloorImage(mysqli $conn, int $floorNumber, string $mimeType, string $data): void
{
    $sql = "INSERT INTO floor_images (floor_number, mime_type, image_data) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            mime_type = VALUES(mime_type), 
            image_data = VALUES(image_data)";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException("Database prepare failed: " . $conn->error);
    }

    $null = null; // Placeholder for BLOB
    // 'b' indicates a blob is being sent
    $stmt->bind_param("isb", $floorNumber, $mimeType, $null);

    // Send binary data in chunks
    $stmt->send_long_data(2, $data);

    if (!$stmt->execute()) {
        throw new RuntimeException("Database execute failed: " . $stmt->error);
    }

    $stmt->close();
}

/**
 * Updates the 'map_version' setting with the current timestamp.
 * Used to trigger client-side refreshes.
 */
function updateMapVersion(mysqli $conn): void
{
    $newTime = (string)(time() * 1000);
    
    $stmt = $conn->prepare(
        "INSERT INTO settings (setting_key, setting_value) 
         VALUES ('map_version', ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?"
    );
    
    if ($stmt) {
        $stmt->bind_param("ss", $newTime, $newTime);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Pings the Go microservice to trigger a graph/data reload if necessary.
 */
function notifyGoService(): void
{
    $url = "http://go-app:8080/api/refresh";
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 1,
        CURLOPT_NOBODY         => true
    ]);
    
    @curl_exec($ch); // Suppress errors if service is offline
    curl_close($ch);
}
?>