import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import DashboardAdmin from "./pages/DashboardAdmin";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DashboardEmployee from "./pages/DashboardEmployee";
import Orders from "./pages/Orders";
import Automation from "./pages/Automation"; // <-- NEW: Imported the page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<DashboardAdmin />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/automation" element={<Automation />} /> {/* <-- NEW: Added the route */}
        <Route path="/employee" element={<DashboardEmployee />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </Router>
  );
}

export default App;