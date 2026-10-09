import os, time, redis, psycopg2
from dotenv import load_dotenv

load_dotenv("../../.env")
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")

r = redis.from_url(REDIS_URL, decode_responses=True)

def get_db():
    conn = psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5
    )
    conn.autocommit = True
    return conn

conn = get_db()
STREAM = "incident_stream"
GROUP = "triage_group"
CONSUMER = "worker_1"

try:
    r.xgroup_create(STREAM, GROUP, id="0", mkstream=True)
except Exception:
    pass

KEYWORDS = ["flood", "fire", "casualty", "collapse", "trapped", "severe", "explosion"]

def score(desc, prio):
    s = 50
    if prio == "CRITICAL": s += 30
    elif prio == "HIGH": s += 20
    for k in KEYWORDS:
        if k in desc.lower(): s += 10
    return min(s, 100)

print("[*] Resilient Triage Engine running...")

while True:
    try:
        events = r.xreadgroup(GROUP, CONSUMER, {STREAM: ">"}, count=1, block=2000)
        if not events:
            continue
        for stream, messages in events:
            for mid, data in messages:
                inc_id = data.get("incident_id")
                desc = data.get("description", "")
                prio = data.get("priority", "MEDIUM")
                val = score(desc, prio)
                print(f"[+] Triaged: {inc_id} | Score: {val}/100")
                
                # Execute update with auto-reconnect on dropped pooler socket
                try:
                    with conn.cursor() as cur:
                        cur.execute("UPDATE incidents SET status = 'TRIAGED' WHERE id = %s", (inc_id,))
                except (psycopg2.OperationalError, psycopg2.InterfaceError):
                    print("[!] Reconnecting to Supabase...")
                    conn = get_db()
                    with conn.cursor() as cur:
                        cur.execute("UPDATE incidents SET status = 'TRIAGED' WHERE id = %s", (inc_id,))
                
                r.xack(STREAM, GROUP, mid)
    except Exception as err:
        print(f"[!] Worker loop error: {err}")
        time.sleep(1)
