import { useState } from "react";
import CreateSessionModal from "../modals/createSession";
import {
  useCreateSessionMutation,
  useGetSessionsQuery,
  useStartSessionMutation,
} from "../services/sessionApi";
import { Loading } from "../components/ui/loading";
import type { Session } from "../types/session";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [createSession, { isLoading }] = useCreateSessionMutation();
  const [startingSessionId, setStartingSessionId] = useState<number | null>(null);

  const {
    data: sessions,
    isLoading: sessionsLoading,
    error,
  } = useGetSessionsQuery();

  const handleCreate = async (data: any) => {
    try {
      await createSession(data).unwrap();
      setOpen(false);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleStartSession = async (sessionId: number) => {
    try {
      setStartingSessionId(sessionId);
      navigate(`/sessions/${sessionId}`);
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setStartingSessionId(null);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background:
          "radial-gradient(circle at top right, #ffe6bf, #f4f6fb 42%, #f0f7ff)",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <h1 style={{ fontSize: "28px", margin: 0 }}>Admin Dashboard</h1>

          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "white",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Create Session
          </button>
        </div>

        {sessionsLoading && <Loading />}

        {error && <p>Failed to load sessions</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
            gap: "20px",
          }}
        >
          {sessions?.map((session: Session) => (
            <div
              key={session.id}
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{session.name}</h3>
              <p>
                <strong>Room Code:</strong> {session.roomCode}
              </p>
              <p>
                <strong>Max Participants:</strong>{" "}
                {session.maxParticipants}
              </p>
              <p>
                <strong>Status:</strong> {session.status}
              </p>
              <button
                onClick={() => handleStartSession(session.id)}
                disabled={session.status !== "waiting" || startingSessionId === session.id}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  backgroundColor:
                    session.status !== "waiting" ? "#d1d5db" : "#16a34a",
                  color: session.status !== "waiting" ? "#4b5563" : "white",
                  cursor:
                    session.status !== "waiting" || startingSessionId === session.id
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {startingSessionId === session.id ? "Starting..." : "Start Session"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <CreateSessionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreate}
        isLoading={isLoading}
      />
    </main>
  );
}
