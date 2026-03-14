import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGetSessionByIdQuery } from "../services/sessionApi";
import socket from "../services/socket";

type JoinedPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  totalScore: number;
};

export default function SessionRoomPage() {
  const { id } = useParams();
  const sessionId = Number(id);

  const { data: session, isLoading, error } = useGetSessionByIdQuery(sessionId, {
    skip: !sessionId,
  });

  const [players, setPlayers] = useState<JoinedPlayer[]>([]);
  const [questionFinished, setQuestionFinished] = useState(false);
  const [answerDistribution, setAnswerDistribution] = useState<any>(null);
  const [submissions, setSubmissions] = useState<{ playerName: string; score: number; isCorrect: boolean }[]>([]);

  useEffect(() => {
    if (!sessionId || !session) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handlePlayers = (list: JoinedPlayer[]) => {
      setPlayers(list);
    };

    const handleParticipantsUpdated = (list: JoinedPlayer[]) => {
      setPlayers(list);
    };

    socket.on("players_gotten", handlePlayers);
    socket.on("participants_updated", handleParticipantsUpdated);

    // Add quiz listeners
    socket.on("question_started", () => {
      setQuestionFinished(false);
      setAnswerDistribution(null);
      setSubmissions([]);
    });

    socket.on("question_finished", (data) => {
      setQuestionFinished(true);
      setAnswerDistribution(data.distribution);
    });

    socket.on("answer_distribution", (data) => {
      setAnswerDistribution(data.distribution);
    });

    socket.on("player_answer_submitted", (data) => {
      setSubmissions((prev) => [...prev, data]);
    });

    // Join the socket room so we receive real-time updates when players join
    socket.emit("watch_session", { sessionId, roomCode: session.roomCode });

    // Fetch current players for initial render
    socket.emit("get_players", { sessionId });

    return () => {
      socket.off("players_gotten", handlePlayers);
      socket.off("participants_updated", handleParticipantsUpdated);
      socket.off("question_started");
      socket.off("question_finished");
      socket.off("answer_distribution");
      socket.off("player_answer_submitted");
    };
  }, [sessionId, session]);

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

          <Link
            to="/admin/dashboard"
            style={{ color: "#334155", textDecoration: "none", fontWeight: 600 }}
          >
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
                <li key={player.id} style={{ marginBottom: "8px" }}>
                  {player.firstName} {player.lastName}
                </li>
              ))}
            </ul>
          )}
        </section>

        {submissions.length > 0 && (
          <section
            style={{
              marginTop: "24px",
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h2>Answer Submissions</h2>
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {submissions.map((sub, index) => (
                <li key={index} style={{ marginBottom: "8px" }}>
                  {sub.playerName}: {sub.isCorrect ? "✅" : "❌"} +{sub.score} points
                </li>
              ))}
            </ul>
          </section>
        )}

        {questionFinished && (
          <section
            style={{
              marginTop: "24px",
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
            }}
          >
            <h2>Question Results</h2>
            {answerDistribution && (
              <div>
                {answerDistribution.map((count: number, index: number) => (
                  <p key={index}>
                    Option {index + 1}: {count} answers
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => socket.emit("advance_question", { sessionId })}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                background: "#16a34a",
                color: "white",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Next Question
            </button>
          </section>
        )}
      </div>
    </main>
  );
}