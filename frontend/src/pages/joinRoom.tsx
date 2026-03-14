import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [joining, setJoining] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    function handleStarted(payload: { roomCode: string }) {
      setLiveMessage(`Session started for room ${payload.roomCode}`);
    }

    function handleJoined(payload: { sessionId: number; roomCode: string; player: { id: number } }) {
      localStorage.setItem(
        `session:${payload.sessionId}:playerId`,
        String(payload.player.id)
      );
      navigate(`/play/${payload.sessionId}`);
    }

    function handleJoinError(payload: { message: string }) {
      setJoining(false);
      setError(payload.message);
    }

    socket.on("session_started", handleStarted);
    socket.on("session_joined", handleJoined);
    socket.on("join_error", handleJoinError);

    return () => {
      socket.off("session_started", handleStarted);
      socket.off("session_joined", handleJoined);
      socket.off("join_error", handleJoinError);
    };
  }, [navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!roomCode.trim()) {
      setError("Room code is required");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    setJoining(true);

    socket.emit("join_session", {
      roomCode: roomCode.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      role: "player",
    });

    console.log("Joining session:", roomCode);
  };

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
        <h1 style={{ marginTop: 0, marginBottom: "8px" }}>
          Join a Quiz
        </h1>

        <p style={{ marginTop: 0, color: "#4b5563", marginBottom: "20px" }}>
          Enter the room code provided by the host
        </p>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Room Code
        </label>

        <input
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
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
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
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
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

        {error && (
          <p style={{ color: "#dc2626", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        {liveMessage && (
          <p style={{ color: "#2563eb", marginBottom: "12px" }}>
            {liveMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={joining}
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
            opacity: joining ? 0.7 : 1,
          }}
        >
          {joining ? "Joining..." : "Join Room"}
        </button>
      </form>
    </main>
  );
}