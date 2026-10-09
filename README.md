# PulseGrid 🛰️⚡

> High-Throughput Autonomous Emergency Resource Allocation & Geospatial Triage Network

PulseGrid is an event-driven, polyglot distributed backend built for high-concurrency disaster coordination and dynamic resource dispatch.

---

## System Architecture

- **Node.js / Express Gateway:** Validates and ingests emergency incidents, then publishes events to Redis Streams.
- **Python 3 Analytics Engine:** Consumes incident streams via Redis consumer groups, evaluates severity scoring, and marks incidents as `TRIAGED`.
- **Go Dispatch Engine:** Runs concurrent goroutines to poll triaged alerts and triggers geospatial resource allocation (`DISPATCHED`).
- **PostGIS Storage:** Supabase PostgreSQL with PostGIS for spatial radius filtering and distance sorting (`ST_DWithin`).
