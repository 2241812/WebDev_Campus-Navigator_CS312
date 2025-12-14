<?php
// php-app/server-user/db_utils.php

// Include the centralized configuration
require_once __DIR__ . '/db_config.php';

/**
 * Establishes and returns a connection to the database.
 * If the connection fails, it sends a JSON error response and terminates the script.
 *
 * @return mysqli The established database connection object.
 */
function getDatabaseConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        // Die gracefully with a JSON error for API calls
        http_response_code(500);
        die(json_encode(["success" => false, "message" => "Connection failed to Docker DB: " . $conn->connect_error]));
    }
    
    return $conn;
}
?>