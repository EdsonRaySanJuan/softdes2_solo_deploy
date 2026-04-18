import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import API_BASE_URL from "../config";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      // 🔥 ROLE VALIDATION (IMPORTANT FIX)
      const selectedRole = role.toLowerCase();
      const actualRole = data.role.toLowerCase();

      if (selectedRole !== actualRole) {
        alert("❌ Role mismatch! Please select the correct role.");
        return;
      }

      // ✅ Save session
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      localStorage.setItem("full_name", data.full_name);

      alert(`Welcome back, ${data.full_name}!`);

      // ✅ Role-based navigation
      if (actualRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/employee");
      }

    } catch (error) {
      console.error("Login error:", error);
      alert("Failed to connect or invalid login");
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">

        <div className="login-brand">
          <div>
            <div className="logo-circle">CAF</div>
            <div className="brand-title">
              <h1>Cafe Management POS</h1>
              <p>
                Fast, automated order processing and inventory tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="login-form">
          <h2>Sign in to continue</h2>

          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={handleLogin}>
            Login
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;