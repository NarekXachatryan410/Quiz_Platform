import React from "react";

export const Loading: React.FC<{ text?: string }> = ({ text = "Loading..." }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          padding: "32px 40px",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div className="spinner" />

        <p
          style={{
            margin: 0,
            fontSize: "15px",
            color: "#374151",
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      </div>

      <style>
        {`
          .spinner {
            width: 42px;
            height: 42px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};