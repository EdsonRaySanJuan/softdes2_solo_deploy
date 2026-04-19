from db import get_db_connection, is_postgres

@app.route("/api/debug/db-check", methods=["GET"])
def debug_db_check():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS user_count FROM users")
        row = cursor.fetchone()
        conn.close()

        if isinstance(row, dict):
            user_count = row["user_count"]
        else:
            user_count = row["user_count"] if "user_count" in row.keys() else row[0]

        return jsonify({
            "using_postgres": is_postgres(),
            "user_count": int(user_count)
        }), 200

    except Exception as e:
        return jsonify({
            "using_postgres": is_postgres(),
            "error": str(e)
        }), 500