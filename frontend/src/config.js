const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000/api"
    : "https://softdes2-backend.onrender.com/api";

export default API_BASE_URL;