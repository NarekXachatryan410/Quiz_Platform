import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminLoginMutation } from "../services/adminApi";
import { useDispatch } from "react-redux";
import { Loading } from "../components/ui/loading";
import { setAdminSession } from "../slices/userSlice";

function getErrorMessage(error: any): string {
  if (!error) return "";

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return "Login failed";
}

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [adminLogin, { isLoading }] = useAdminLoginMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLocalError("");
    try {
      const result = await adminLogin({ username: login.trim(), password }).unwrap();
      
      // Store token in Redux and localStorage
      dispatch(setAdminSession({ 
        token: result.data.token, 
        login: result.data.user.username 
      }));
      localStorage.setItem('token', result.data.token);
      
      navigate("/admin/dashboard");
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return <Loading />
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "6px",
            fontSize: "26px",
            fontWeight: 700,
          }}
        >
          Admin Login
        </h1>

        <p
          style={{
            marginTop: 0,
            color: "#6b7280",
            marginBottom: "22px",
          }}
        >
          Access the quiz control panel
        </p>

        <label style={{ fontWeight: 500 }}>Login</label>

        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="admin"
          autoComplete="username"
          required
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            marginTop: "6px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        />

        <label style={{ fontWeight: 500 }}>Password</label>

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              marginTop: "6px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "13px",
              color: "#4f46e5",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {localError && (
          <p style={{ color: "#dc2626", marginBottom: "12px" }}>
            {localError}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            fontSize: "15px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.8 : 1,
            marginBottom: "14px",
          }}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          Not an admin?{" "}
          <Link
            to="/join"
            style={{
              color: "#4f46e5",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Enter room code
          </Link>
        </div>
      </form>
    </main>
  );
}