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

type Node struct {
	ID     string `json:"id"`
	Floor  int    `json:"floor"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
	Type   string `json:"type"`
	Access string `json:"access"` // Stores 'all' or 'employee'
}

type PathRequest struct {
	Start string `json:"start"`
	End   string `json:"end"`
	Role  string `json:"role"` // 'student', 'pwd-student', 'employee'
}

type PathResponse struct {
	Path []string `json:"path"`
}

var (
	nodes = make(map[string]Node)
	edges = make(map[string][]string)
	mutex sync.RWMutex
)

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func main() {
	dbHost := getEnv("DB_HOST", "mysql_db")
	dbUser := getEnv("DB_USER", "root")
	dbPass := getEnv("DB_PASS", "admin123")
	dbName := getEnv("DB_NAME", "graphDB")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s", dbUser, dbPass, dbHost, dbName)
	
	log.Println("Go Service connecting to DB...")
	var db *sql.DB
	var err error

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

	loadGraph(db)

	http.HandleFunc("/api/path", func(w http.ResponseWriter, r *http.Request) {
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

	http.HandleFunc("/api/refresh", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		loadGraph(db)
		w.Write([]byte(`{"status":"refreshed"}`))
	})

	log.Println("Go Server running on port 8080")
	http.ListenAndServe(":8080", nil)
}

func loadGraph(db *sql.DB) {
	mutex.Lock()
	defer mutex.Unlock()

	// Added 'access' column to query
	nRows, err := db.Query("SELECT id, floor, x, y, type, access FROM nodes")
	if err != nil {
		log.Println("Error loading nodes:", err)
		return
	}
	defer nRows.Close()

	nodes = make(map[string]Node)
	for nRows.Next() {
		var n Node
		// Ensure your DB 'access' column defaults to 'all' if null
		var access sql.NullString
		nRows.Scan(&n.ID, &n.Floor, &n.X, &n.Y, &n.Type, &access)
		if access.Valid {
			n.Access = access.String
		} else {
			n.Access = "all"
		}
		nodes[n.ID] = n
	}

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
		edges[s] = append(edges[s], t)
		edges[t] = append(edges[t], s)
	}
	log.Printf("Graph loaded: %d nodes", len(nodes))
}

func findPath(start, end, role string) []string {
	mutex.RLock()
	defer mutex.RUnlock()

	if _, ok := nodes[start]; !ok { return nil }
	if _, ok := nodes[end]; !ok { return nil }

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

		// Get current node details for checks
		nodeU := nodes[u]

		for _, v := range edges[u] {
			if _, inQ := queue[v]; inQ {
				nodeV := nodes[v]

				// --- 1. ACCESS CONTROL CHECK ---
				// If role is NOT employee, they cannot traverse 'employee' nodes
				if role != "employee" {
					if nodeV.Access == "employee" || (nodeV.Type == "elevator" && nodeV.Access == "employee") {
						continue // Skip this neighbor
					}
				}

				// --- 2. PWD CHECK ---
				// PWD cannot use stairs
				if role == "pwd-student" {
					if nodeV.Type == "stairs" {
						continue // Skip this neighbor
					}
				}

				// --- 3. WEIGHT CALCULATION ---
				weight := math.Sqrt(math.Pow(float64(nodeU.X-nodeV.X), 2) + math.Pow(float64(nodeU.Y-nodeV.Y), 2))
				
				// Floor Change Logic
				if nodeU.Floor != nodeV.Floor {
					if nodeV.Type == "elevator" {
						// High penalty for waiting for elevator
						weight += 300 
					} else if nodeV.Type == "stairs" {
						// Lower penalty for stairs (faster than waiting)
						weight += 50
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