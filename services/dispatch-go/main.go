package main

import (
"database/sql"
"fmt"
"log"
"os"
"time"

_ "github.com/lib/pq"
)

type Incident struct {
ID        string
Title     string
Priority  string
Status    string
Latitude  float64
Longitude float64
}

func main() {
dbURL := os.Getenv("DATABASE_URL")
if dbURL == "" {
dbURL = "postgresql://postgres.esquetyardgtthopogbl:PulseGrid2026MasterKey@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
}

db, err := sql.Open("postgres", dbURL)
if err != nil {
log.Fatalf("[FATAL] DB Connection failed: %v", err)
}
defer db.Close()

if err := db.Ping(); err != nil {
log.Fatalf("[FATAL] DB Ping failed: %v", err)
}

fmt.Println("[*] PulseGrid Go Dispatch Engine active and polling...")

for {
query := `
SELECT id, title, priority, status, 
       ST_Y(location::geometry), ST_X(location::geometry)
FROM incidents
WHERE status = 'TRIAGED'
ORDER BY created_at ASC
LIMIT 5;
`
rows, err := db.Query(query)
if err != nil {
log.Printf("[!] Error polling incidents: %v", err)
time.Sleep(3 * time.Second)
continue
}

for rows.Next() {
var inc Incident
if err := rows.Scan(&inc.ID, &inc.Title, &inc.Priority, &inc.Status, &inc.Latitude, &inc.Longitude); err != nil {
log.Printf("[!] Scan error: %v", err)
continue
}

go dispatchResource(db, inc)
}
rows.Close()

time.Sleep(2 * time.Second)
}
}

func dispatchResource(db *sql.DB, inc Incident) {
fmt.Printf("[+] Dispatching nearest unit for Incident [%s] (%s) at (%.4f, %.4f)\n", inc.Title, inc.Priority, inc.Latitude, inc.Longitude)

// Update status to DISPATCHED
_, err := db.Exec("UPDATE incidents SET status = 'DISPATCHED' WHERE id = $1", inc.ID)
if err != nil {
log.Printf("[!] Failed updating dispatch status for %s: %v", inc.ID, err)
return
}

fmt.Printf("[✓] Incident [%s] successfully DISPATCHED\n", inc.Title)
}
