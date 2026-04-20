import sqlite3
import os

base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, "data", "cafe.db")
os.makedirs(os.path.dirname(db_path), exist_ok=True)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        timestamp TEXT,
        item_name TEXT,
        category TEXT,
        size TEXT,
        qty INTEGER,
        unit_price REAL,
        line_total REAL,
        addons TEXT,
        payment_method TEXT,
        cash REAL,
        change REAL,
        table_no TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT UNIQUE,
        category TEXT,
        unit TEXT,
        current_stock REAL,
        reorder_level REAL,
        reorder_qty REAL,
        status TEXT,
        supplier TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        full_name TEXT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        status TEXT,
        last_login TEXT
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS rpa_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        bot_name TEXT,
        task_description TEXT,
        status TEXT
    )
""")

# Seed default admin user
cursor.execute("""
    INSERT OR IGNORE INTO users (user_id, full_name, username, password, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
""", ("ADM001", "System Boss", "admin", "admin123", "Admin", "Active"))

conn.commit()
conn.close()
print("✅ Database rebuilt successfully!")
print("✅ Admin user created: username=admin, password=admin123")