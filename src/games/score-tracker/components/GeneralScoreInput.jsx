import { useState, useRef, useEffect } from "react";

export function GeneralScoreInput({
  currentPlayerName,
  currentPlayerTotal,
  onAddScore,
  onUndo,
  canUndo,
}) {
  const [score, setScore] = useState(0);
  const inputRef = useRef(null);

  // Focus input when player changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  }, [currentPlayerName]);

  const handleIncrement = (amount) => {
    setScore((prev) => prev + amount);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Allow empty, minus sign, or valid numbers
    if (value === "" || value === "-") {
      setScore(value === "-" ? "-" : 0);
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setScore(num);
    }
  };

  const handleSubmit = () => {
    const finalScore = typeof score === "string" ? 0 : score;
    onAddScore(finalScore);
    setScore(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const displayScore = typeof score === "string" ? score : score.toString();

  return (
    <div className="general-score-input">
      <div className="current-player-display">
        <span className="current-player-label">Current Player</span>
        <span className="current-player-name">{currentPlayerName}</span>
        <span className="current-player-total">
          Total: <strong>{currentPlayerTotal}</strong>
        </span>
      </div>

      <div className="score-input-controls">
        <div className="score-buttons-row">
          <button
            type="button"
            className="score-btn decrement"
            onClick={() => handleIncrement(-10)}
          >
            -10
          </button>
          <button
            type="button"
            className="score-btn decrement"
            onClick={() => handleIncrement(-5)}
          >
            -5
          </button>
          <button
            type="button"
            className="score-btn decrement"
            onClick={() => handleIncrement(-1)}
          >
            -1
          </button>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className="score-input-field"
            value={displayScore}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

          <button
            type="button"
            className="score-btn increment"
            onClick={() => handleIncrement(1)}
          >
            +1
          </button>
          <button
            type="button"
            className="score-btn increment"
            onClick={() => handleIncrement(5)}
          >
            +5
          </button>
          <button
            type="button"
            className="score-btn increment"
            onClick={() => handleIncrement(10)}
          >
            +10
          </button>
        </div>

        <div className="score-action-buttons">
          <button
            type="button"
            className="btn btn-primary add-score-btn"
            onClick={handleSubmit}
          >
            Add Score
          </button>
          <button
            type="button"
            className="btn btn-secondary undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
