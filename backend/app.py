import os
import sqlite3
from flask import Flask, jsonify
from flask_cors import CORS

from routes.report_routes import report_bp
from routes.dashboard_routes import dashboard_bp
from routes.order_routes import order_bp
from routes.inventory_routes import inventory_bp
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.rpa_routes import rpa_bp

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://softdes-finalproj.vercel.app",
                "http://localhost:3000",
                "http://localhost:5173"
            ]
        }
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)


def init_sqlite_db():
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, "data", "cafe.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS sales (
            order_id INTEGER,
            order_line_id INTEGER,
            datetime TEXT,
            item_id TEXT,
            item_name TEXT,
            category TEXT,
            size TEXT,
            qty INTEGER,
            unit_price REAL,
            addons TEXT,
            addons_total REAL,
            line_total REAL,
            payment_method TEXT,
            time_of_order TEXT
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT UNIQUE,
            category TEXT,
            unit TEXT,
            current_stock INTEGER,
            reorder_level INTEGER,
            reorder_qty INTEGER,
            status TEXT,
            supplier TEXT
        )
    """)

    conn.execute("""
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

    conn.execute("""
        CREATE TABLE IF NOT EXISTS rpa_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            bot_name TEXT,
            task_description TEXT,
            status TEXT
        )
    """)

    conn.commit()
    conn.close()
    print("SQLite check complete.")


init_sqlite_db()

app.register_blueprint(report_bp, url_prefix="/api/reports")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(order_bp, url_prefix="/api/orders")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(user_bp, url_prefix="/api/users")
app.register_blueprint(rpa_bp, url_prefix="/api/rpa")


@app.route("/")
def home():
    return {"message": "Cafe POS Backend is running", "status": "online"}


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)