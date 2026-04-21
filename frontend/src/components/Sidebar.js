import { NavLink, useNavigate } from "react-router-dom";

function Sidebar({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-circle">CAF</div>
        <div>
          <h1 className="app-name">Cafe POS</h1>
          <p className="app-role">{role}</p>
        </div>
      </div>

      <nav className="nav">
        {role === "Admin" && (
          <>
            <NavLink to="/admin"      className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
            <NavLink to="/inventory"  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Inventory</NavLink>
            <NavLink to="/reports"    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Reports</NavLink>
            <NavLink to="/automation" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Automation Logs</NavLink>
            <NavLink to="/settings"   className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Settings</NavLink>
          </>
        )}

        {role === "Employee" && (
          <>
            <NavLink to="/employee" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
            <NavLink to="/orders"   className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Orders</NavLink>
            <NavLink to="/metrics"  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Order Metrics</NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;