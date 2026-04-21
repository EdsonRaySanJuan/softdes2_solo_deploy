from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from db import get_db_connection, is_postgres
from rpa_agent import run_automation_cycle

rpa_bp = Blueprint("rpa", __name__)


def rows_to_dicts(rows):
    result = []
    for row in rows:
        if isinstance(row, dict):
            result.append(row)
        else:
            result.append(dict(row))
    return result


# =====================================================
# 🔥 RUN BOT
# =====================================================
@rpa_bp.route("/run-bot", methods=["POST", "OPTIONS"])
def run_bot():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        current_app.logger.info("RUN BOT: route entered")

        conn = get_db_connection()
        print("🔥 USING POSTGRES:", is_postgres(conn))
        conn.close()

        result = run_automation_cycle()

        current_app.logger.info(f"RUN BOT: function returned: {result}")

        return jsonify({
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "bot_name": result.get("bot_name", "Unknown Bot"),
            "checked_items": result.get("checked_items", 0),
            "processed_items": result.get("processed_items", 0),
            "logs_sent": result.get("logs_sent", 0),
            "items": result.get("items", [])
        }), 200 if result.get("success") else 500

    except Exception as e:
        current_app.logger.exception(f"RUN BOT ERROR: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =====================================================
# 🔥 ADD LOG
# =====================================================
@rpa_bp.route("/log", methods=["POST", "OPTIONS"])
def add_log():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    data = request.get_json() or {}
    bot_name = str(data.get("bot_name", "Unknown Bot")).strip()
    task = str(data.get("task_description", "No description")).strip()
    status = str(data.get("status", "Info")).strip()

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (%s, %s, %s, %s)
            """, (timestamp, bot_name, task, status))
        else:
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (?, ?, ?, ?)
            """, (timestamp, bot_name, task, status))

        conn.commit()

        return jsonify({"success": True}), 201

    except Exception as e:
        current_app.logger.exception(f"ADD LOG ERROR: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if conn:
            conn.close()


# =====================================================
# 🔥 GET LOGS + REAL-TIME STATUS FIX
# =====================================================
@rpa_bp.route("/logs", methods=["GET"])
def get_logs():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 🔥 GET LOW STOCK ITEMS
        cursor.execute("""
            SELECT item_name, current_stock, reorder_level
            FROM inventory
            WHERE current_stock <= reorder_level
        """)

        low_items = cursor.fetchall()

        for row in low_items:
            item_name = row["item_name"] if isinstance(row, dict) else row[0]
            current_stock = row["current_stock"] if isinstance(row, dict) else row[1]
            reorder_level = row["reorder_level"] if isinstance(row, dict) else row[2]

            # 🔥 COMPUTE STATUS (FIX MO)
            if current_stock <= 0:
                computed_status = "Out of Stock"
            elif current_stock <= (reorder_level * 0.25):
                computed_status = "Critical"
            elif current_stock <= reorder_level:
                computed_status = "Low"
            else:
                computed_status = "Normal"

            msg = f"{item_name} is low on stock ({current_stock} <= reorder level {reorder_level})"

            # 🔒 prevent duplicates
            if is_postgres(conn):
                cursor.execute("""
                    SELECT 1 FROM rpa_logs
                    WHERE task_description = %s AND status = %s
                    LIMIT 1
                """, (msg, "LOW_STOCK_ALERT"))
            else:
                cursor.execute("""
                    SELECT 1 FROM rpa_logs
                    WHERE task_description = ? AND status = ?
                    LIMIT 1
                """, (msg, "LOW_STOCK_ALERT"))

            if not cursor.fetchone():
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                if is_postgres(conn):
                    cursor.execute("""
                        INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                        VALUES (%s, %s, %s, %s)
                    """, (timestamp, "inventory_bot", msg, "LOW_STOCK_ALERT"))
                else:
                    cursor.execute("""
                        INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                        VALUES (?, ?, ?, ?)
                    """, (timestamp, "inventory_bot", msg, "LOW_STOCK_ALERT"))

        conn.commit()

        # 🔥 FETCH LOGS
        cursor.execute("""
            SELECT id, timestamp, bot_name, task_description, status
            FROM rpa_logs
            ORDER BY id DESC
            LIMIT 50
        """)

        logs = rows_to_dicts(cursor.fetchall())

        return jsonify({
            "success": True,
            "count": len(logs),
            "logs": logs
        }), 200

    except Exception as e:
        current_app.logger.exception(f"GET LOGS ERROR: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "logs": []
        }), 500

    finally:
        if conn:
            conn.close()


# =====================================================
# 🔥 CLEAR LOGS
# =====================================================
@rpa_bp.route("/logs/clear", methods=["DELETE"])
def clear_logs():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM rpa_logs")

        conn.commit()

        return jsonify({
            "success": True,
            "message": "All automation logs cleared."
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        if conn:
            conn.close()