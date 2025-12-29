import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./JoinRoomScreen.css";

interface JoinRoomScreenProps {
  onBack: () => void;
  onJoinRoom: (code: string, name: string) => void;
  loading?: boolean;
  error?: string;
  savedName?: string;
  initialCode?: string;
}

export function JoinRoomScreen({
  onBack,
  onJoinRoom,
  loading = false,
  error,
  savedName = "",
  initialCode = "",
}: JoinRoomScreenProps) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialCode);

  // Update code if initialCode changes (e.g., from URL params)
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !loading) {
      onJoinRoom(code.toUpperCase(), name.trim());
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    setCode(value.slice(0, 4));
  };

  const isValidName = name.trim().length > 0 && name.trim().length <= 12;
  const isValidCode = code.length === 4;
  const isValid = isValidName && isValidCode;

  return (
    <motion.div
      className="secret-hitler-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="btn-back" onClick={onBack}>
        &larr; Back
      </button>

      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        JOIN ROOM
      </motion.h1>
      <motion.p
        className="subtitle"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Enter a room code to join
      </motion.p>

      <motion.form
        onSubmit={handleSubmit}
        className="join-room-form"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="form-group">
          <label htmlFor="room-code">Room Code</label>
          <input
            id="room-code"
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="XXXX"
            maxLength={4}
            autoComplete="off"
            autoFocus
            className="room-code-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="player-name">Your Name</label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            placeholder="Enter your name"
            maxLength={12}
            autoComplete="off"
          />
          <span className="char-count">{name.length}/12</span>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || loading}
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
      </motion.form>
    </motion.div>
  );
}

export default JoinRoomScreen;
