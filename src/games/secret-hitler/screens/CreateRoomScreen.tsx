import React, { useState } from "react";
import "./CreateRoomScreen.css";

export type ArtStyle = "original" | "voldemort";

interface CreateRoomScreenProps {
  onBack: () => void;
  onCreateRoom: (name: string, artStyle: ArtStyle) => void;
  loading?: boolean;
  error?: string;
  savedName?: string;
}

export function CreateRoomScreen({
  onBack,
  onCreateRoom,
  loading = false,
  error,
  savedName = "",
}: CreateRoomScreenProps) {
  const [name, setName] = useState(savedName);
  const [artStyle, setArtStyle] = useState<ArtStyle>("original");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !loading) {
      onCreateRoom(name.trim(), artStyle);
    }
  };

  const isValid = name.trim().length > 0 && name.trim().length <= 12;

  return (
    <div className="secret-hitler-screen">
      <button className="btn-back" onClick={onBack}>
        &larr; Back
      </button>

      <h1>CREATE ROOM</h1>
      <p className="subtitle">Set up a new game lobby</p>

      <form onSubmit={handleSubmit} className="create-room-form">
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
            autoFocus
          />
          <span className="char-count">{name.length}/12</span>
        </div>

        <div className="art-style-section">
          <label>Select Art Style</label>
          <div className="art-style-options">
            <div
              className={`art-style-card original ${artStyle === "original" ? "selected" : ""}`}
              onClick={() => setArtStyle("original")}
            >
              <div className="art-style-preview original-preview" />
              <div className="art-style-info">
                <h3>Original</h3>
                <p>Classic theme</p>
              </div>
              {artStyle === "original" && <div className="selected-badge">Selected</div>}
            </div>

            <div
              className={`art-style-card voldemort ${artStyle === "voldemort" ? "selected" : ""}`}
              onClick={() => setArtStyle("original")} // Still selects original for now
            >
              <div className="art-style-preview voldemort-preview" />
              <div className="art-style-info">
                <h3>Secret Voldemort</h3>
                <p>Coming soon</p>
              </div>
              <div className="coming-soon-overlay">
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || loading}
        >
          {loading ? "Creating..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}

export default CreateRoomScreen;
