import { useState, type FormEvent } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    roomCode: string;
    name: string;
    maxParticipants: number;
  }) => void;
  isLoading?: boolean;
};

export default function CreateSessionModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(10);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    onCreate({
      roomCode,
      name,
      maxParticipants,
    });

    setRoomCode("");
    setName("");
    setMaxParticipants(10);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Create Session</h2>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Room Code</label>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            required
            style={inputStyle}
            placeholder="e.g., 48392"
          />

          <label style={labelStyle}>Session Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
            placeholder="JavaScript Quiz"
          />

          <label style={labelStyle}>Max Participants</label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            min={1}
            style={inputStyle}
          />

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#4f46e5",
                color: "white",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.75 : 1,
                transition: "all 0.2s ease",
                border: "none",
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#e5e7eb",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#ffffff",
  padding: "28px",
  borderRadius: "14px",
  width: "380px",
  boxShadow: "0 12px 40px rgba(15, 23, 42, 0.2)",
  display: "flex",
  flexDirection: "column" as const,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  marginBottom: "12px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 500,
  color: "#374151",
};