import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGetSessionByIdQuery } from "../services/sessionApi";
import socket from "../services/socket";

type JoinedPlayer = {
  socketId: string;
  nickname: string;
};

export default function SessionRoomPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const { data: session, isLoading, error } = useGetSessionByIdQuery(sessionId, {
    skip: !sessionId,
  });
  const [players, setPlayers] = useState<JoinedPlayer[]>([]);

  useEffect(() => {
    if (!session?.roomCode) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handlePlayers = (list: JoinedPlayer[]) => {
      setPlayers(list);
    };

    socket.on("session_players", handlePlayers);
    socket.emit("join_session", { roomCode: session.roomCode, role: "admin" });

    return () => {
      socket.off("session_players", handlePlayers);
      socket.emit("leave_session", session.roomCode);
    };
  }, [session?.roomCode]);

  if (!sessionId) {
    return <p style={{ padding: "20px" }}>Invalid session id</p>;
  }

  if (isLoading) {
    return <p style={{ padding: "20px" }}>Loading session...</p>;
  }

  if (error || !session) {
    return <p style={{ padding: "20px" }}>Failed to load session</p>;
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px", background: "#f8fafc" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px" }}>{session.name}</h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Room code: <strong>{session.roomCode}</strong>
            </p>
          </div>
          <Link to="/admin/dashboard" style={{ color: "#334155", textDecoration: "none", fontWeight: 600 }}>
            Back to dashboard
          </Link>
        </div>

        <section
          style={{
            marginTop: "24px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Joined Players ({players.length})</h2>
          {players.length === 0 ? (
            <p style={{ color: "#64748b" }}>No players joined yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {players.map((player) => (
                <li key={player.socketId} style={{ marginBottom: "8px" }}>
                  {player.nickname}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
