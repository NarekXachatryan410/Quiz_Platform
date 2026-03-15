const { Server } = require("socket.io");
const { Session, Player, Answer, Activity, Question } = require("./models");
const sessionLoader = require("./utils/sessionLoader");

let ioInstance = null;
const activeTimers = new Map();
const sessionStates = new Map();

function getRoomKey(roomCode) {
  return `session:${roomCode}`;
}

function getSessionState(sessionId) {
  return sessionStates.get(sessionId);
}

function setSessionState(sessionId, state) {
  sessionStates.set(sessionId, state);
}

function clearSessionState(sessionId) {
  const state = sessionStates.get(sessionId);
  if (state?.interval) {
    clearInterval(state.interval);
  }
  sessionStates.delete(sessionId);
}

function calculateRemainingSeconds(endAt) {
  const remainingMs = endAt - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

function emitSessionState(sessionId) {
  const state = getSessionState(sessionId);
  if (!state) return;

  const timer = state.timer
    ? {
        ...state.timer,
        remainingSeconds: calculateRemainingSeconds(state.timer.endAt),
      }
    : null;

  ioInstance
    .to(getRoomKey(state.roomCode))
    .emit("session_state", {
      sessionId: state.sessionId,
      status: state.status,
      currentActivityId: state.currentActivityId,
      currentActivityStep: state.currentActivityStep,
      questionIndex: state.questionIndex,
      currentQuestion: state.currentActivity?.questions?.[state.questionIndex] ?? null,
      timer,
    });

  // Also send the current leaderboard so reconnecting clients can immediately show scores
  getLeaderboard(state.sessionId)
    .then((leaderboard) => {
      ioInstance
        .to(getRoomKey(state.roomCode))
        .emit("leaderboard_updated", { leaderboard });
    })
    .catch(() => {
      // ignore leaderboard errors for state emission
    });
}

async function emitTimerUpdate(sessionId) {
  const state = getSessionState(sessionId);
  if (!state || !state.timer) return;

  const remainingSeconds = calculateRemainingSeconds(state.timer.endAt);

  ioInstance
    .to(getRoomKey(state.roomCode))
    .emit("timer_tick", {
      sessionId,
      remainingSeconds,
      durationSeconds: state.timer.duration,
      endAt: state.timer.endAt,
      running: state.timer.running,
    });

  if (remainingSeconds <= 0) {
    clearInterval(state.interval);
    state.timer.running = false;

    // Persist that the timer has finished so reconnecting clients don't resume it
    try {
      const session = await Session.findByPk(sessionId);
      if (session) {
        session.timerEndAt = null;
        session.timerDurationSeconds = null;
        await session.save();
      }
    } catch (error) {
      console.error('Failed to clear session timer state:', error);
    }

    ioInstance
      .to(getRoomKey(state.roomCode))
      .emit("timer_finished", { sessionId });

    // After timer finishes, broadcast question finished with correct answer and leaderboard
    const question = state.currentActivity?.questions?.[state.questionIndex];
    if (!question) {
      // Nothing to do if question is missing; avoid crashes
      return;
    }

    const answers = await Answer.findAll({
      where: { questionId: question.id },
    });

    const distribution = new Array(question.options.length).fill(0);

    answers.forEach((answer) => {
      distribution[answer.answer]++;
    });

    getLeaderboard(state.sessionId).then(async (leaderboard) => {
      ioInstance.to(getRoomKey(state.roomCode)).emit("question_finished", {
        questionId: question.id,
        correctAnswer: question.correctIndex,
        distribution,
        leaderboard,
      });

      // If this was the last question and there is no further activity, mark the game finished.
      const isLastQuestion =
        state.questionIndex >= (state.currentActivity?.questions?.length ?? 0) - 1;

      if (isLastQuestion) {
        const nextActivity = await Activity.findOne({
          where: {
            sessionId: state.sessionId,
            step: (state.currentActivity?.step ?? 0) + 1,
          },
        });

        if (!nextActivity) {
          const session = await Session.findByPk(state.sessionId);
          if (session) {
            session.status = "finished";
            await session.save();
          }

          state.status = "finished";
          clearSessionState(sessionId);

          ioInstance.to(getRoomKey(state.roomCode)).emit("game_finished", {
            sessionId: state.sessionId,
          });
        }
      }
    });
  }
}

async function startTimerForSession(sessionId) {
  const state = getSessionState(sessionId);
  if (!state) return;

  const activity = state.currentActivity;
  if (!activity) return;

  const duration =
    activity.timerSeconds ?? activity.timer_seconds ?? 10; // Prefer DB timerSeconds, fall back to template value
  const endAt = Date.now() + duration * 1000;

  state.timer = {
    duration,
    endAt,
    running: true,
  };

  // Persist timer state so reconnecting clients can restore without reset
  try {
    const session = await Session.findByPk(sessionId);
    if (session) {
      session.timerEndAt = new Date(endAt);
      session.timerDurationSeconds = duration;
      session.currentQuestionIndex = state.questionIndex;
      await session.save();
    }
  } catch (error) {
    console.error('Failed to persist timer state:', error);
  }

  if (state.interval) {
    clearInterval(state.interval);
  }

  state.interval = setInterval(() => emitTimerUpdate(sessionId), 1000);

  // Emit immediate tick so clients can render immediately
  emitTimerUpdate(sessionId);

  // Emit the question
  emitQuestion(sessionId);
}

function pauseTimer(sessionId) {
  const state = getSessionState(sessionId);
  if (!state || !state.timer || !state.timer.running) return;

  const remainingSeconds = calculateRemainingSeconds(state.timer.endAt);
  state.timer = {
    ...state.timer,
    remainingSeconds,
    running: false,
  };
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }

  ioInstance
    .to(getRoomKey(state.roomCode))
    .emit("timer_paused", { sessionId, remainingSeconds });
}

function resumeTimer(sessionId) {
  const state = getSessionState(sessionId);
  if (!state || !state.timer || state.timer.running) return;

  const remaining = state.timer.remainingSeconds;
  if (!remaining || remaining <= 0) return;

  const endAt = Date.now() + remaining * 1000;
  state.timer = {
    ...state.timer,
    endAt,
    running: true,
  };

  state.interval = setInterval(() => emitTimerUpdate(sessionId), 1000);
  emitTimerUpdate(sessionId);
}

async function initSessionState(session) {
  // Load current activity + questions from the database so state can be reconstructed
  // If session.currentActivityId is a non-numeric template ID (e.g. "act_1"), fall back to finding by step.
  let activity = null;

  const numericActivityId = Number(session.currentActivityId);
  if (Number.isInteger(numericActivityId)) {
    activity = await Activity.findByPk(numericActivityId);
  }

  if (!activity) {
    // Fallback: use session.currentStep to locate the activity
    const step = Number(session.currentStep) || 1;
    activity = await Activity.findOne({
      where: { sessionId: session.id, step },
    });
  }

  let questions = [];
  if (activity) {
    questions = await Question.findAll({
      where: { activityId: activity.id },
      order: [['id', 'ASC']],
    });
  }

  const currentActivity = activity
    ? {
        ...activity.toJSON(),
        questions: questions.map((q) => q.toJSON()),
      }
    : null;

  const questionIndex = session.currentQuestionIndex ?? 0;

  const state = {
    sessionId: session.id,
    roomCode: session.roomCode,
    status: session.status,
    currentActivityId: activity?.id,
    currentActivityStep: activity?.step,
    currentActivity,
    questionIndex,
    timer: null,
    interval: null,
  };

  setSessionState(session.id, state);

  // If the session had an active timer in the DB, resume it
  if (session.status === 'active' && session.timerEndAt) {
    const remainingSeconds = calculateRemainingSeconds(new Date(session.timerEndAt));
    if (remainingSeconds > 0) {
      state.timer = {
        duration: session.timerDurationSeconds,
        endAt: new Date(session.timerEndAt),
        running: true,
      };
      state.interval = setInterval(() => emitTimerUpdate(session.id), 1000);
    }
  }

  return state;
}

function emitQuestion(sessionId) {
  const state = getSessionState(sessionId);
  if (!state || state.currentActivity.type !== 'quiz') return;

  const question = state.currentActivity.questions[state.questionIndex];
  if (!question) return;

  ioInstance.to(getRoomKey(state.roomCode)).emit("question_started", {
    question,
    questionIndex: state.questionIndex,
    totalQuestions: state.currentActivity.questions.length,
    timer: state.timer,
  });
}


/* ---------------- PARTICIPANTS ---------------- */

async function emitParticipants(roomCode) {
  const session = await Session.findOne({ where: { roomCode } });
  if (!session) return;

  const players = await Player.findAll({
    where: { sessionId: session.id },
    attributes: ["id", "firstName", "lastName", "totalScore"],
  });

  ioInstance.to(getRoomKey(roomCode)).emit("participants_updated", players);
}

/* ---------------- SCORING ---------------- */

function calculateQuizScore(timeRemaining, totalTime, basePoints) {
  return 25;
}

/* ---------------- LEADERBOARD ---------------- */

async function getLeaderboard(sessionId) {
  const players = await Player.findAll({
    where: { sessionId },
    order: [["totalScore", "DESC"]],
    limit: 10,
  });

  return players.map((player) => ({
    id: player.id,
    fullName: `${player.firstName} ${player.lastName}`,
    totalScore: player.totalScore,
  }));
}

/* ---------------- SOCKET INIT ---------------- */

function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  ioInstance.on("connection", (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    /* ---------------- GET PLAYERS ---------------- */

    socket.on("get_players", async ({ sessionId }) => {
      try {
        const players = await Player.findAll({
          where: { sessionId },
        });

        socket.emit("players_gotten", players);
      } catch (error) {
        socket.emit("error", { message: "Failed to fetch players" });
      }
    });

    /* ---------------- SESSION STATE ---------------- */

    socket.on("get_session_state", ({ sessionId }) => {
      emitSessionState(sessionId);
    });

    socket.on("reconnect_session", async ({ sessionId, playerId }) => {
      try {
        const player = await Player.findByPk(playerId);
        if (!player || player.sessionId !== sessionId) {
          socket.emit("error", { message: "Invalid session or player" });
          return;
        }

        const session = await Session.findByPk(sessionId);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        socket.join(getRoomKey(session.roomCode));
        socket.sessionId = sessionId;
        socket.userId = playerId;
        socket.roomCode = session.roomCode;

        // Send current session state (including timer/question)
        if (session.status === "active") {
          if (!getSessionState(sessionId)) {
            await initSessionState(session);
          }
          emitSessionState(sessionId);
          emitQuestion(sessionId);
        } else {
          socket.emit("session_waiting", { sessionId });
        }
      } catch (error) {
        console.error("Reconnect session error:", error);
        socket.emit("error", { message: "Failed to reconnect" });
      }
    });

    /* ---------------- JOIN SESSION ---------------- */

    socket.on("join_session", async (payload) => {
      try {
        const { roomCode, fullName } = payload;

        const normalizedRoom = roomCode.trim().toUpperCase();

        const session = await Session.findOne({
          where: { roomCode: normalizedRoom },
        });

        if (!session) {
          socket.emit("join_error", { message: "Invalid room code" });
          return;
        }

        if (session.status !== "waiting") {
          socket.emit("join_error", { message: "Game already started" });
          return;
        }

        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts.shift();
        const lastName = nameParts.join(" ");

        const existingPlayer = await Player.findOne({
          where: {
            sessionId: session.id,
            firstName,
            lastName,
          },
        });

        if (existingPlayer) {
          socket.emit("join_error", { message: "Name already taken" });
          return;
        }

        const player = await Player.create({
          firstName,
          lastName,
          sessionId: session.id,
          totalScore: 0,
          socketId: socket.id,
        });

        socket.join(getRoomKey(normalizedRoom));

        socket.sessionId = session.id;
        socket.userId = player.id;
        socket.roomCode = normalizedRoom;
        socket.firstName = firstName;
        socket.lastName = lastName;

        socket.emit("session_joined", {
          sessionId: session.id,
          roomCode: normalizedRoom,
          player: {
            id: player.id,
            firstName,
            lastName,
          },
        });

        await emitParticipants(normalizedRoom);

        if (session.status === "active") {
          // Ensure the in-memory session state exists for active sessions
          if (!getSessionState(session.id)) {
            await initSessionState(session);
          }
          emitSessionState(session.id);
          // Also emit current question if there's an active quiz
          const state = getSessionState(session.id);
          if (state && state.currentActivity?.type === 'quiz') {
            emitQuestion(session.id);
          }
        }

        console.log(`👤 Player ${fullName} joined session ${normalizedRoom}`);
      } catch (error) {
        console.error("Join session error:", error);
        socket.emit("join_error", { message: "Failed to join session" });
      }
    });

    /* ---------------- WATCH SESSION (ADMIN) ---------------- */

    socket.on("watch_session", async ({ sessionId, roomCode }) => {
      try {
        const session = sessionId
          ? await Session.findByPk(sessionId)
          : await Session.findOne({
              where: { roomCode: roomCode?.trim().toUpperCase() },
            });

        if (!session) {
          socket.emit("error", { message: "Invalid session" });
          return;
        }

        const normalizedRoom = session.roomCode;
socket.join(`admin:${session.adminId}`);

        socket.join(getRoomKey(normalizedRoom));

        socket.sessionId = session.id;
        socket.currentSessionId = session.id;
        socket.adminId = session.adminId;
        await emitParticipants(normalizedRoom);
        if (session.status === "active") {
          if (!getSessionState(session.id)) {
            await initSessionState(session);
          }
          emitSessionState(session.id);
        }
      } catch (error) {
        console.error("Watch session error:", error);
        socket.emit("error", { message: "Failed to watch session" });
      }
    });

    /* ---------------- SUBMIT QUIZ ANSWER ---------------- */

    socket.on("submit_quiz_answer", async (payload) => {
      try {
        const { questionId, selectedOption: rawSelectedOption } = payload;
        const selectedOption = Number(rawSelectedOption);

        if (!socket.sessionId || !socket.userId) {
          socket.emit("error", { message: "Not in a session" });
          return;
        }

        const session = await Session.findByPk(socket.sessionId);

        const state = getSessionState(session.id);
        if (!state || state.currentActivity?.type !== "quiz") {
          socket.emit("error", { message: "No active quiz question" });
          return;
        }

        // Resolve the active question for this session state (avoid relying on client-supplied IDs)
        const activeQuestion = state.currentActivity?.questions?.[state.questionIndex];

        if (!activeQuestion) {
          socket.emit("error", { message: "No active question" });
          return;
        }

        const existingAnswer = await Answer.findOne({
          where: {
            userId: socket.userId,
            questionId: activeQuestion.id,
          },
        });

        if (existingAnswer) {
          socket.emit("error", { message: "Already answered this question" });
          return;
        }

        const isCorrect = selectedOption === Number(activeQuestion.correctIndex);
        const score = isCorrect ? 25 : 0;

        await Answer.create({
          userId: socket.userId,
          questionId: activeQuestion.id,
          answer: selectedOption,
          timeSubmitted: new Date(),
          pointsAwarded: score,
        });

        if (score > 0) {
          const player = await Player.findByPk(socket.userId);
          player.totalScore += score;
          await player.save();
        }

        const player = await Player.findByPk(socket.userId);

        // Emit to admin for real-time display
        ioInstance
          .to(`admin:${session.adminId}`)
          .emit("player_answer_submitted", {
            playerName: `${player.firstName} ${player.lastName}`,
            score,
            isCorrect,
          });

        socket.emit("answer_submitted", {
          isCorrect,
          score,
          correctAnswer: activeQuestion.correctIndex,
          totalScore: player.totalScore,
        });

        // Send updated leaderboard to all participants
        const leaderboard = await getLeaderboard(session.id);
        ioInstance.to(getRoomKey(session.roomCode)).emit("leaderboard_updated", {
          leaderboard,
        });
      } catch (error) {
        console.error("Submit answer error:", error);
        socket.emit("error", { message: "Failed to submit answer" });
      }
    });

    /* ---------------- PUZZLE SCORE ---------------- */

    socket.on("submit_puzzle_score", async (payload) => {
      try {
        const { correctCount } = payload;

        if (!socket.sessionId || !socket.userId) {
          socket.emit("error", { message: "Not in a session" });
          return;
        }

        const session = await Session.findByPk(socket.sessionId);

        const sessionTemplate = sessionLoader.getSessionTemplate();

        const currentActivity = sessionTemplate.activities.find(
          (activity) => activity.id === session.currentActivityId
        );

        if (!currentActivity || currentActivity.type !== "puzzle_assembly") {
          socket.emit("error", { message: "No active puzzle activity" });
          return;
        }

        const score =
          correctCount * currentActivity.scoring.points_per_correct;

        ioInstance.to(`admin:${session.adminId}`).emit("puzzle_score_pending", {
          userId: socket.userId,
          firstName: socket.firstName,
          lastName: socket.lastName,
          correctCount,
          score,
        });

        socket.emit("puzzle_score_submitted", { pending: true });
      } catch (error) {
        console.error("Submit puzzle score error:", error);
        socket.emit("error", { message: "Failed to submit puzzle score" });
      }
    });

    /* ---------------- ADMIN JOIN ---------------- */

    socket.on("admin_join_session", async ({ sessionId }) => {
      try {
        const session = await Session.findByPk(sessionId);

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        socket.join(`admin:${session.adminId}`);
        socket.currentSessionId = sessionId;
        socket.adminId = session.adminId;

        socket.emit("admin_session_joined", { session });
      } catch (error) {
        console.error("Admin join session error:", error);
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    /* ---------------- FINISH SESSION (ADMIN) ---------------- */

    socket.on("finish_session", async () => {
      try {
        const sessionId = socket.currentSessionId || socket.sessionId;
        if (!sessionId) {
          socket.emit("error", { message: "Not in an admin session" });
          return;
        }

        const session = await Session.findByPk(sessionId);
        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Delete all associated data in the correct order
        const activities = await Activity.findAll({ where: { sessionId: session.id } });
        const activityIds = activities.map((a) => a.id);

        const questions = await Question.findAll({ where: { activityId: activityIds } });
        const questionIds = questions.map((q) => q.id);

        if (questionIds.length) {
          await Answer.destroy({ where: { questionId: questionIds } });
        }

        if (activityIds.length) {
          await Question.destroy({ where: { activityId: activityIds } });
          await Activity.destroy({ where: { id: activityIds } });
        }

        await Player.destroy({ where: { sessionId: session.id } });
        await Session.destroy({ where: { id: session.id } });

        // Clear in-memory state
        clearSessionState(session.id);

        ioInstance.to(getRoomKey(session.roomCode)).emit("game_finished", {
          sessionId: session.id,
        });

        socket.emit("session_finished_confirmed", { sessionId: session.id });
      } catch (error) {
        console.error("Finish session error:", error);
        socket.emit("error", { message: "Failed to finish session" });
      }
    });

    /* ---------------- CONFIRM PUZZLE SCORES ---------------- */

    socket.on("confirm_puzzle_scores", async ({ scores }) => {
      try {
        for (const scoreData of scores) {
          const player = await Player.findByPk(scoreData.userId);

          if (player) {
            player.totalScore += scoreData.score;
            await player.save();
          }
        }

        const leaderboard = await getLeaderboard(socket.currentSessionId);

        ioInstance
          .to(getRoomKey(socket.roomCode))
          .emit("puzzle_scores_confirmed", { leaderboard });
      } catch (error) {
        console.error("Confirm puzzle scores error:", error);
        socket.emit("error", { message: "Failed to confirm scores" });
      }
    });

    /* ---------------- ADMIN ADVANCE QUESTION ---------------- */

    socket.on("advance_question", async ({ sessionId }) => {
      try {
        const state = getSessionState(sessionId);
        if (!state) return;

        const session = await Session.findByPk(sessionId);

        state.questionIndex++;

        if (state.questionIndex < state.currentActivity.questions.length) {
          // Next question in current activity
          await startTimerForSession(sessionId);
        } else {
          // End of current activity, advance to next activity
          const currentStep = state.currentActivityStep;

          const nextActivity = await Activity.findOne({
            where: { sessionId: sessionId, step: currentStep + 1 },
          });

          if (nextActivity) {
            const nextQuestions = await Question.findAll({
              where: { activityId: nextActivity.id },
              order: [['id', 'ASC']],
            });

            // Advance to next activity
            session.currentActivityId = nextActivity.id;
            session.currentStep = nextActivity.step;
            session.currentQuestionIndex = 0;
            await session.save();

            // Update session state
            state.currentActivityId = nextActivity.id;
            state.currentActivityStep = nextActivity.step;
            state.currentActivity = {
              ...nextActivity.toJSON(),
              questions: nextQuestions.map((q) => q.toJSON()),
            };
            state.questionIndex = 0;

            // Start the next activity
            await startTimerForSession(sessionId);
          } else {
            // No more activities, end session
            session.status = 'finished';
            await session.save();
            state.status = 'finished';
            clearSessionState(sessionId);

            ioInstance.to(getRoomKey(state.roomCode)).emit("session_finished", { sessionId });
          }
        }
      } catch (error) {
        console.error("Advance question error:", error);
      }
    });

    /* ---------------- DISCONNECT ---------------- */

    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        await Player.update(
          { socketId: null },
          { where: { id: socket.userId } }
        );
      }

      if (socket.roomCode) {
        await emitParticipants(socket.roomCode);
      }
    });
  });

  return ioInstance;
}

/* ---------------- GET IO INSTANCE ---------------- */

function getIo() {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized");
  }
  return ioInstance;
}

module.exports = {
  initSocket,
  getIo,
  initSessionState,
  startTimerForSession,
  pauseTimer,
  resumeTimer,
  clearSessionState,
};