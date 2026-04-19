from flask import Blueprint, request, jsonify
from datetime import datetime
import sqlite3
import os
import csv

order_bp = Blueprint("orders", __name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, "data")
DB_PATH = os.path.join(BACKEND_DIR, "cafe.db")
SALES_CSV_PATH = os.path.join(DATA_DIR, "monthly_Sales.csv")
DRINK_RECIPES_PATH = os.path.join(DATA_DIR, "drink_recipes.csv")
ADDON_RECIPES_PATH = os.path.join(DATA_DIR, "addon_recipes.csv")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_text(value):
    return str(value or "").strip().lower()


def load_csv_rows(path):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def get_base_recipe_rows(menu_item, size_label):
    size_map = {
        "Regular": "regular",
        "Grande": "grande",
        "Venti": "venti",
        "Grande 16oz": "grande",
        "Venti 22oz": "venti",
        "Small": "small",
        "Medium": "medium",
        "Large": "large",
    }

    normalized_size = size_map.get(size_label, normalize_text(size_label))
    rows = load_csv_rows(DRINK_RECIPES_PATH)

    return [
        row for row in rows
        if normalize_text(row.get("menu_item")) == normalize_text(menu_item)
        and normalize_text(row.get("size")) == normalize_text(normalized_size)
    ]


def get_addon_recipe_rows(addon_name):
    rows = load_csv_rows(ADDON_RECIPES_PATH)
    return [
        row for row in rows
        if normalize_text(row.get("addon_name")) == normalize_text(addon_name)
    ]


def ensure_sales_csv_exists():
    os.makedirs(DATA_DIR, exist_ok=True)

    if not os.path.exists(SALES_CSV_PATH):
        with open(SALES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "order_id",
                "timestamp",
                "item_name",
                "category",
                "size",
                "qty",
                "unit_price",
                "line_total",
                "addons",
                "payment_method",
                "cash",
                "change",
                "table_no",
            ])


def append_sale_to_csv(order_id, timestamp, item_name, category, size, qty, unit_price, line_total, addons, payment_method, cash, change, table_no):
    ensure_sales_csv_exists()

    with open(SALES_CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            order_id,
            timestamp,
            item_name,
            category,
            size,
            qty,
            unit_price,
            line_total,
            addons,
            payment_method,
            cash,
            change,
            table_no,
        ])


def deduct_inventory_ingredient(cursor, ingredient_name, qty_needed, inventory_warnings):
    cursor.execute(
        """
        UPDATE inventory
        SET current_stock = current_stock - ?
        WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(?))
        """,
        (qty_needed, ingredient_name)
    )

    if cursor.rowcount == 0:
        inventory_warnings.append(
            f"Missing inventory ingredient match for '{ingredient_name}'"
        )
        return

    cursor.execute(
        """
        UPDATE inventory
        SET status = CASE
            WHEN current_stock <= 0 THEN 'Out of Stock'
            WHEN current_stock <= (reorder_level * 0.25) THEN 'Critical'
            WHEN current_stock <= reorder_level THEN 'Low'
            ELSE 'Normal'
        END
        WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(?))
        """,
        (ingredient_name,)
    )


def get_next_order_id(cursor):
    cursor.execute("SELECT COALESCE(MAX(order_id), 0) + 1 AS next_id FROM sales")
    row = cursor.fetchone()
    return row["next_id"] if row else 1


@order_bp.route("/", methods=["GET"])
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT order_id, timestamp, item_name, category, size, qty, unit_price, line_total, addons
        FROM sales
        ORDER BY order_id DESC, timestamp DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    orders = []
    for row in rows:
        orders.append({
            "order_id": row["order_id"],
            "timestamp": row["timestamp"],
            "item_name": row["item_name"],
            "category": row["category"],
            "size": row["size"],
            "qty": row["qty"],
            "unit_price": row["unit_price"],
            "line_total": row["line_total"],
            "addons": row["addons"],
        })

    return jsonify(orders), 200


@order_bp.route("/", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}

    items = data.get("items", [])
    total = float(data.get("total", 0) or 0)
    cash = float(data.get("cash", 0) or 0)
    change = float(data.get("change", 0) or 0)
    table_no = str(data.get("table", "Walk-in")).strip()
    payment_method = str(data.get("payment_method", "Cash")).strip()

    if not items:
        return jsonify({"success": False, "error": "No items in order"}), 400

    if cash < total:
        return jsonify({"success": False, "error": "Insufficient cash"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        order_id = get_next_order_id(cursor)
        inventory_warnings = []
        lines_written = 0

        for item in items:
            name = str(item.get("name", "")).strip()
            category = str(item.get("category", "")).strip()
            size = str(item.get("size", "")).strip()
            qty = int(item.get("qty", 1) or 1)
            unit_price = float(item.get("unitPrice", 0) or 0)
            addons_list = item.get("addons", []) or []

            if not name:
                inventory_warnings.append("Encountered order item with missing name.")
                continue

            line_total = unit_price * qty
            addons_text = ", ".join(
                [str(a.get("name", "")).strip() for a in addons_list if str(a.get("name", "")).strip()]
            ) or "None"

            cursor.execute("""
                INSERT INTO sales (
                    order_id, timestamp, item_name, category, size, qty,
                    unit_price, line_total, addons, payment_method, cash, change, table_no
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id, timestamp, name, category, size, qty,
                unit_price, line_total, addons_text, payment_method, cash, change, table_no
            ))

            append_sale_to_csv(
                order_id, timestamp, name, category, size, qty,
                unit_price, line_total, addons_text, payment_method, cash, change, table_no
            )
            lines_written += 1

            recipe_rows = get_base_recipe_rows(name, size)

            if not recipe_rows:
                inventory_warnings.append(
                    f"No base recipe found for item='{name}' size='{size}'. Sale saved, but ingredients were not deducted."
                )
            else:
                for recipe in recipe_rows:
                    ingredient_name = str(recipe.get("ingredient_name", "")).strip()
                    qty_used = float(recipe.get("qty_used", 0) or 0) * qty

                    if ingredient_name and qty_used > 0:
                        deduct_inventory_ingredient(cursor, ingredient_name, qty_used, inventory_warnings)

            for addon in addons_list:
                addon_name = str(addon.get("name", "")).strip()
                if not addon_name:
                    continue

                addon_recipe_rows = get_addon_recipe_rows(addon_name)

                if not addon_recipe_rows:
                    inventory_warnings.append(
                        f"No addon recipe found for addon='{addon_name}'"
                    )
                    continue

                for addon_recipe in addon_recipe_rows:
                    ingredient_name = str(addon_recipe.get("ingredient_name", "")).strip()
                    qty_used = float(addon_recipe.get("qty_used", 0) or 0) * qty

                    if ingredient_name and qty_used > 0:
                        deduct_inventory_ingredient(cursor, ingredient_name, qty_used, inventory_warnings)

        cursor.execute("""
            SELECT item_name, current_stock, reorder_level
            FROM inventory
            WHERE current_stock <= reorder_level
        """)
        low_stock_items = cursor.fetchall()

        for low_item in low_stock_items:
            item_name = low_item["item_name"]
            current_stock = low_item["current_stock"]
            reorder_level = low_item["reorder_level"]

            cursor.execute("""
                INSERT INTO rpa_logs (timestamp, action, details)
                VALUES (?, ?, ?)
            """, (
                timestamp,
                "LOW_STOCK_ALERT",
                f"{item_name} is low on stock ({current_stock} <= reorder level {reorder_level})"
            ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Order processed successfully",
            "order_id": order_id,
            "total": total,
            "cash": cash,
            "change": change,
            "lines_written": lines_written,
            "inventory_warnings": inventory_warnings,
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()