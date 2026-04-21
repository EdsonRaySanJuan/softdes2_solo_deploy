import os
import time
from datetime import datetime
from db import get_db_connection, is_postgres

API_URL = os.getenv("API_BASE_URL", "").rstrip("/")
BOT_NAME = os.getenv("RPA_BOT_NAME", "Inventory-Master-V1")
SLEEP_SECONDS = int(os.getenv("RPA_INTERVAL_SECONDS", "60"))

FORCE_PROCESS_ALL = False


def save_log(bot_name, task_description, status):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if is_postgres(conn):
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (%s, %s, %s, %s)
            """, (timestamp, bot_name, task_description, status))
        else:
            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, bot_name, task_description, status)
                VALUES (?, ?, ?, ?)
            """, (timestamp, bot_name, task_description, status))

        conn.commit()
        return True

    except Exception as e:
        print("save_log error:", e)
        return False
    finally:
        if conn:
            conn.close()


def run_automation_cycle():
    results = {
        "success": True,
        "bot_name": BOT_NAME,
        "checked_items": 0,
        "processed_items": 0,
        "logs_sent": 0,
        "items": [],
        "message": ""
    }

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 🔥 GET LOW STOCK ITEMS
        cursor.execute("""
            SELECT item_name, supplier, reorder_qty, unit, current_stock, reorder_level
            FROM inventory
            WHERE current_stock <= reorder_level
            AND last_restocked IS NULL
        """)

        rows = cursor.fetchall()
        low_items = [dict(row) for row in rows]

        results["checked_items"] = len(low_items)

        if not low_items:
            results["message"] = "No low stock items found. Inventory is in good condition."
            return results

        for item in low_items:
            item_name = item["item_name"]
            current_stock = item["current_stock"]
            reorder_level = item["reorder_level"]

            # 🔥 FIX: COMPUTE STATUS
            if current_stock <= 0:
                computed_status = "Out of Stock"
            elif current_stock <= (reorder_level * 0.25):
                computed_status = "Critical"
            elif current_stock <= reorder_level:
                computed_status = "Low"
            else:
                computed_status = "Normal"

            # 🔥 LOW STOCK ALERT LOG
            alert_msg = (
                f"[{datetime.now().strftime('%H:%M:%S.%f')}] "
                f"{item_name} is low on stock "
                f"({current_stock} <= reorder level {reorder_level})"
            )
            save_log("inventory_bot", alert_msg, "LOW_STOCK_ALERT")

            # 🔥 PROCESS LOG (FIXED STATUS)
            process_msg = (
                f"[{datetime.now().strftime('%H:%M:%S.%f')}] "
                f"{item_name} | PO sent to {item.get('supplier') or 'None'} | "
                f"{item.get('reorder_qty', 0)} {item.get('unit', '')} | "
                f"Stock: {current_stock} | Status: {computed_status}"
            )

            saved = save_log(BOT_NAME, process_msg, "Completed")

            # OPTIONAL: mark processed
            if not FORCE_PROCESS_ALL:
                cursor.execute(
                    "UPDATE inventory SET last_restocked = ? WHERE item_name = ?"
                    if not is_postgres(conn)
                    else "UPDATE inventory SET last_restocked = %s WHERE item_name = %s",
                    (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), item_name)
                )

            results["processed_items"] += 1
            if saved:
                results["logs_sent"] += 1

        conn.commit()

        results["message"] = (
            f"Checked {results['checked_items']} items, "
            f"processed {results['processed_items']} reorder(s)."
        )

        return results

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }

    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    while True:
        print(run_automation_cycle())
        time.sleep(SLEEP_SECONDS)