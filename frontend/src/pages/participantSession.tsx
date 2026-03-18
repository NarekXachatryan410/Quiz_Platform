import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { updateTotalScore } from "../slices/playerSlice";
import type { RootState } from "../store";
import socket from "../services/socket";

type LeaderboardEntry = {
  id: number;
  fullName: string;
  totalScore: number;
};

type Question = {
  id: string;
  text: string;
  options: string[];
};

export default function ParticipantSessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const sessionId = Number(id);

  const dispatch = useDispatch();
  const totalScore = useSelector((state: RootState) => state.players.totalScore);

  const [playerId, setPlayerId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const storedPlayerId = localStorage.getItem(`session:${sessionId}:playerId`);
    if (!storedPlayerId) {
      window.location.href = "/join";
      return;
    }

    const parsedPlayerId = Number(storedPlayerId);
    if (!Number.isNaN(parsedPlayerId)) {
      setPlayerId(parsedPlayerId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!playerId || !socket) return;

    const emitReconnect = () => {
      socket.emit("reconnect_session", { sessionId, playerId });
    };

    if (socket.connected) {
      emitReconnect();
    } else {
      socket.connect();
      socket.once('connect', emitReconnect);
    }
  }, [playerId, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    if (!socket.connected) {
      socket.connect();
    }

    const handleSessionStarted = () => {
      setStatus("active");
      // Emit to get current state
      socket.emit("get_session_state", { sessionId });
    };

    const handleSessionWaiting = () => {
      setStatus("waiting");
      setTimerRemaining(0);
      setTimerEndAt(null);
    };

    const handleSessionState = (data: any) => {
      setStatus(data.status);
      if (data.timer?.endAt) {
        setTimerEndAt(data.timer.endAt);
      }
      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
        setShowLeaderboard(false);
      }
    };

    const handleQuestionStarted = (data: any) => {
      setCurrentQuestion(data.question);
      setShowLeaderboard(false);
      if (data.timer?.endAt) {
        setTimerEndAt(data.timer.endAt);
      } else {
        setTimerEndAt(null);
      }
      setTimerRemaining(0);
      setSelectedOption(null);
      setSubmitted(false);
      setCorrectAnswer(null);
      setLastScore(null);
      setLastAnswerCorrect(null);
    };

    const handleTimerTick = (data: any) => {
      if (data.endAt) {
        setTimerEndAt(data.endAt);
      }
      setTimerRemaining(data.remainingSeconds);
    };

    const handleTimerFinished = () => {
      setSubmitted(true);
      setTimerRemaining(0);
      setTimerEndAt(null);
    };

    const handleAnswerSubmitted = (data: any) => {
      setLastScore(data.score);
      dispatch(updateTotalScore(data.totalScore));
      setLastAnswerCorrect(data.isCorrect);
      setCorrectAnswer(data.correctAnswer);
      setSubmitted(true);
    };

    const handleLeaderboardUpdated = (data: any) => {
      setLeaderboard(data.leaderboard);

      // Update total score for this player if present
      const storedPlayerId = localStorage.getItem(`session:${sessionId}:playerId`);
      const parsedPlayerId = Number(storedPlayerId);
      if (!Number.isNaN(parsedPlayerId)) {
        const entry = data.leaderboard.find((item: LeaderboardEntry) => item.id === parsedPlayerId);
        if (entry) {
          dispatch(updateTotalScore(entry.totalScore));
        }
      }
    };

    const handleGameFinished = () => {
      // Show a brief message, then redirect to join page
      setStatus("finished");
      setTimeout(() => navigate("/join"), 2000);
    };

    const handleQuestionFinished = (data: any) => {
      setCorrectAnswer(data.correctAnswer);
      setLeaderboard(data.leaderboard);
      // Show leaderboard after a question finishes
      setShowLeaderboard(true);
      setCurrentQuestion(null);
    };

    socket.on("session_started", handleSessionStarted);
    socket.on("session_waiting", handleSessionWaiting);
    socket.on("session_state", handleSessionState);
    socket.on("question_started", handleQuestionStarted);
    socket.on("timer_tick", handleTimerTick);
    socket.on("timer_finished", handleTimerFinished);
    socket.on("answer_submitted", handleAnswerSubmitted);
    socket.on("leaderboard_updated", handleLeaderboardUpdated);
    socket.on("question_finished", handleQuestionFinished);
    socket.on("game_finished", handleGameFinished);

    return () => {
      socket.off("session_started", handleSessionStarted);
      socket.off("session_waiting", handleSessionWaiting);
      socket.off("session_state", handleSessionState);
      socket.off("question_started", handleQuestionStarted);
      socket.off("timer_tick", handleTimerTick);
      socket.off("timer_finished", handleTimerFinished);
      socket.off("answer_submitted", handleAnswerSubmitted);
      socket.off("leaderboard_updated", handleLeaderboardUpdated);
      socket.off("question_finished", handleQuestionFinished);
      socket.off("game_finished", handleGameFinished);
    };
  }, [sessionId, dispatch, navigate]);

  useEffect(() => {
    if (!timerEndAt) return;

    const endTime = typeof timerEndAt === "string" ? new Date(timerEndAt).getTime() : timerEndAt;
    if (Number.isNaN(endTime)) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimerRemaining(remaining);
    }, 250);

    return () => clearInterval(interval);
  }, [timerEndAt]);

  const handleSubmitAnswer = () => {
    if (selectedOption === null || submitted) return;

    socket.emit("submit_quiz_answer", {
      questionId: currentQuestion?.id,
      selectedOption,
      timeRemaining: timerRemaining,
    });

    setSubmitted(true);
  };

  if (status === "waiting") {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <h1>Waiting for the session to start...</h1>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: "24px", background: "#f8fafc" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "20px", textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#4f46e5" }}>Your Total Score: {totalScore}</h3>
        </div>
        {!showLeaderboard && currentQuestion ? (
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 8px 20px rgba(0,0,0,0.05)" }}>
            <h2>{currentQuestion.text}</h2>
            <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
              Time: {timerRemaining}s
            </div>
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !submitted && setSelectedOption(index)}
                disabled={submitted}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  marginBottom: "8px",
                  borderRadius: "8px",
                  border: selectedOption === index ? "2px solid #4f46e5" : "1px solid #d1d5db",
                  background: submitted && index === correctAnswer ? "#10b981" : selectedOption === index ? "#e0e7ff" : "white",
                  cursor: submitted ? "default" : "pointer",
                }}
              >
                {option}
              </button>
            ))}
            {!submitted && (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  cursor: selectedOption === null ? "not-allowed" : "pointer",
                }}
              >
                Submit Answer
              </button>
            )}

            {submitted && lastScore !== null && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ marginBottom: "8px", fontWeight: 600 }}>
                  {lastAnswerCorrect
                    ? "✅ Correct!"
                    : "❌ Incorrect"}
                </div>
                <div>Score for this question: {lastScore}</div>
                <div>Total Score: {totalScore}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <h2>Leaderboard</h2>
            <ul>
              {leaderboard.map((entry) => (
                <li key={entry.id}>
                  {entry.fullName}: {entry.totalScore}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}