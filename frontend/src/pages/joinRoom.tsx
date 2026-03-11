import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useJoinSessionMutation } from "../services/sessionApi";
import { Loading } from "../components/ui/loading";
import { useDispatch } from "react-redux";
import { setPlayer } from "../slices/playerSlice";

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [joinSession, { isLoading, isError }] = useJoinSessionMutation();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const code = roomCode.trim();

    if (!code) return;

    try {
      const joinedSession = await joinSession({
        roomCode,
        firstName,
        lastName,
      }).unwrap();
      dispatch(
        setPlayer({
          firstName: joinedSession.firstName,
          lastName: joinedSession.lastName,
          sessionId: joinedSession.sessionId,
        }),
      );
      navigate("/sessions/" + joinedSession?.id);
    } catch (error) {
      setError("Failed to join the session:", error.message);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top right, #ffe6bf, #f4f6fb 42%, #f0f7ff)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e5e7eb",
          padding: "28px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>Join a Quiz</h1>

        <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "20px" }}>
          Enter the room code provided by the host
        </p>

        <label
          htmlFor="roomCode"
          style={{ display: "block", marginBottom: "8px" }}
        >
          Room Code
        </label>

        <input
          id="roomCode"
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="e.g. 12345"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            marginBottom: "16px",
            fontSize: "16px",
          }}
          required
        />
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="first name"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            marginBottom: "16px",
            fontSize: "16px",
          }}
          required
        />
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="last name"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            marginBottom: "16px",
            fontSize: "16px",
          }}
          required
        />

        {isError && (
          <p style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "11px 14px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#111827",
            color: "#ffffff",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          Join Room
        </button>
      </form>
    </main>
  );
}
