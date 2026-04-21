import sqlite3
import psycopg2

# 🔥 CHANGE THIS (paste your Render DB URL)
POSTGRES_URL = "postgresql://softdes_cafe_pos_user:YOlP1oMCyULdls6id3nnR5rd8lhILc1l@dpg-d7i4jbpf9bms73fuvqbg-a.oregon-postgres.render.com/softdes_cafe_pos"

# connect SQLite
sqlite_conn = sqlite3.connect("data/cafe_new.db")
sqlite_cursor = sqlite_conn.cursor()

# connect Postgres
pg_conn = psycopg2.connect(POSTGRES_URL)
pg_cursor = pg_conn.cursor()

print("✅ Connected to both databases")

# 🔥 FETCH DATA FROM SQLITE
sqlite_cursor.execute("""
    SELECT item_name, category, unit, current_stock,
           reorder_level, reorder_qty, status, supplier
    FROM inventory
""")

rows = sqlite_cursor.fetchall()

print(f"📦 Found {len(rows)} rows from SQLite")

# 🔥 CLEAR POSTGRES TABLE (optional but recommended for clean sync)
pg_cursor.execute("DELETE FROM inventory")

# 🔥 INSERT INTO POSTGRES
for row in rows:
    pg_cursor.execute("""
        INSERT INTO inventory (
            item_name, category, unit, current_stock,
            reorder_level, reorder_qty, status, supplier
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (item_name) DO UPDATE SET
            current_stock = EXCLUDED.current_stock,
            status = EXCLUDED.status
    """, row)

pg_conn.commit()

print("🚀 Sync complete!")

# close connections
sqlite_conn.close()
pg_conn.close()