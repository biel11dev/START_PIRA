import React, { useContext } from "react";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import { AuthContext } from "../AuthContext";

const UserInfo = () => {
  const { auth, logout } = useContext(AuthContext);

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "8px 12px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        zIndex: 10000,
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <FaUser style={{ fontSize: "14px" }} />
        <span style={{ fontWeight: "600", fontSize: "12px" }}>
          {auth.userName || "Usuário"}
        </span>
      </div>
      
      <button
        onClick={logout}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          borderRadius: "6px",
          padding: "6px 10px",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
          fontWeight: "500",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <FaSignOutAlt style={{ fontSize: "11px" }} />
        Sair
      </button>
    </div>
  );
};

export default UserInfo;
