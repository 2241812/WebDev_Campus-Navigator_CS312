package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Represents a location point on the map
type Node struct {
	ID     string `json:"id"`
	Floor  int    `json:"floor"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Type   string `json:"type"`   // e.g., "hallway", "room", "elevator", "stairs"
	Access string `json:"access"` // Authorization level: 'all' or 'employee'
}

// Payload for incoming path requests
type PathRequest struct {
	Start string `json:"start"`
	End   string `json:"end"`
	Role  string `json:"role"` // User role determines valid paths ('student', 'pwd-student', 'employee')
}

type PathResponse struct {
	Path []string `json:"path"`
}

// Global graph state with mutex for thread-safe concurrent access
var (
	nodes = make(map[string]Node)
	edges = make(map[string][]string)
	mutex sync.RWMutex
)

// Helper to read environment variables (e.g., Docker container configs)
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func main() {
	// Database connection configuration
	dbHost := getEnv("DB_HOST", "mysql_db")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "admin123")
	dbName := getEnv("DB_NAME", "graphDB")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	
	log.Println("Go Service connecting to DB...")
	var db *sql.DB
	var err error

	// Retry loop: Waits for the database container to be fully ready before crashing
	for i := 0; i < 15; i++ {
		db, err = sql.Open("mysql", dsn)
		if err == nil && db.Ping() == nil {
			break
		}
		time.Sleep(2 * time.Second)
		log.Println("Waiting for Database...")
	}

	if err != nil {
		log.Fatal("Could not connect to DB:", err)
	}

	// Initial fetch of graph data into memory
	loadGraph(db)

	// API Endpoint: Calculates the shortest path
	http.HandleFunc("/api/path", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS for frontend access
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" { return }

		var req PathRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", 400)
			return
		}

		path := findPath(req.Start, req.End, req.Role)
		json.NewEncoder(w).Encode(PathResponse{Path: path})
	})

	// API Endpoint: Hot-reload graph data without restarting server
	http.HandleFunc("/api/refresh", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		loadGraph(db)
		w.Write([]byte(`{"status":"refreshed"}`))
	})

	log.Println("Go Server running on port 8080")
	http.ListenAndServe(":8080", nil)
}

// loadGraph fetches nodes/edges from SQL and rebuilds the in-memory graph
func loadGraph(db *sql.DB) {
	mutex.Lock() // Write lock to prevent reads during update
	defer mutex.Unlock()

	nRows, err := db.Query("SELECT id, floor, x, y, type, access FROM nodes")
	if err != nil {
		log.Println("Error loading nodes:", err)
		return
	}
	defer nRows.Close()

	nodes = make(map[string]Node)
	for nRows.Next() {
		var n Node
		var access sql.NullString // Handle potential NULLs in DB
		
		nRows.Scan(&n.ID, &n.Floor, &n.X, &n.Y, &n.Type, &access)
		
		if access.Valid {
			n.Access = access.String
		} else {
			n.Access = "all" // Default to public access
		}
		nodes[n.ID] = n
	}

	// Load connections (Adjacency List)
	eRows, err := db.Query("SELECT source, target FROM edges")
	if err != nil {
		log.Println("Error loading edges:", err)
		return
	}
	defer eRows.Close()

	edges = make(map[string][]string)
	for eRows.Next() {
		var s, t string
		eRows.Scan(&s, &t)
		// Undirected graph: Add connection both ways
		edges[s] = append(edges[s], t)
		edges[t] = append(edges[t], s)
	}
	log.Printf("Graph loaded: %d nodes", len(nodes))
}

// findPath implements Dijkstra's Algorithm with role-based filtering
func findPath(start, end, role string) []string {
	mutex.RLock() // Read lock allows concurrent path requests
	defer mutex.RUnlock()

	if _, ok := nodes[start]; !ok { return nil }
	if _, ok := nodes[end]; !ok { return nil }

	// Dijkstra initialization
	dist := make(map[string]float64)
	prev := make(map[string]string)
	queue := make(map[string]float64)

	for id := range nodes {
		dist[id] = math.Inf(1)
		queue[id] = math.Inf(1)
	}
	dist[start] = 0
	queue[start] = 0

	for len(queue) > 0 {
		// Find node with smallest distance in queue
		var u string
		min := math.Inf(1)
		for id, d := range queue {
			if d < min {
				min = d
				u = id
			}
		}

		if u == end || min == math.Inf(1) { break }
		delete(queue, u)

		nodeU := nodes[u]

		for _, v := range edges[u] {
			if _, inQ := queue[v]; inQ {
				nodeV := nodes[v]

				// --- ACCESS CONTROL Logic ---
                // If user is NOT an employee, usually block access to 'employee' zones
                if role != "employee" {
                    if nodeV.Access == "employee" {
                        // EXCEPTION: Allow PWD students to use Employee Elevators
                        if role == "pwd-student" && nodeV.Type == "elevator" {         
                        } else {
                            continue 
                        }
                    }
                }

                // --- PWD Logic ---
                // Students with PWD role cannot traverse stairs
                if role == "pwd-student" {
                    if nodeV.Type == "stairs" {
                        continue 
                    }
                }

				// --- Cost Calculation ---
				// Base cost is physical distance
				weight := math.Sqrt(math.Pow(float64(nodeU.X-nodeV.X), 2) + math.Pow(float64(nodeU.Y-nodeV.Y), 2))
				
				// --- Floor Change Penalties ---
				// We penalize vertical travel to prefer staying on the same floor when possible
				if nodeU.Floor != nodeV.Floor {
					if nodeV.Type == "elevator" {
						weight += 300 // Heavy penalty: Simulates wait time for elevator
					} else if nodeV.Type == "stairs" {
						weight += 50  // Light penalty: Simulates physical effort
					}
				}

				alt := dist[u] + weight
				if alt < dist[v] {
					dist[v] = alt
					prev[v] = u
					queue[v] = alt
				}
			}
		}
	}

	// Reconstruct path by backtracking from End to Start
	var path []string
	curr := end
	for curr != "" {
		path = append([]string{curr}, path...)
		if curr == start { break }
		curr = prev[curr]
	}
	
	if len(path) > 0 && path[0] == start { return path }
	return nil
}
