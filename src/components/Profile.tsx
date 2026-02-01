"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Profile({ isOpen, onClose }: ProfileProps) {
  const {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    profile,
    updateName,
    getRecentActivity,
  } = useUser();

  const [name, setName] = useState(profile.name || "");
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'game' | 'tracker';
    name: string;
    playedAt: string;
    playersCount?: number;
    won?: boolean;
    players?: string[];
    scores?: number[];
    winnerIndex?: number;
  }>>([]);

  useEffect(() => {
    if (isOpen) {
      getRecentActivity(5).then(setRecentActivity);
    }
  }, [isOpen, getRecentActivity]);

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (name.trim()) {
      updateName(name.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setName(profile.name || "");
      setIsEditing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsSigningIn(true);

    const result = await signIn(email, password);
    if (!result.success) {
      setAuthError(result.error || "Failed to sign in");
    } else {
      // Clear form on success
      setEmail("");
      setPassword("");
    }

    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const formatActivityItem = (item: typeof recentActivity[0]) => {
    const date = new Date(item.playedAt);
    const isToday = date.toDateString() === new Date().toDateString();
    const dateStr = isToday ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (item.type === "game") {
      const parts = [item.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")];
      if (item.playersCount) parts.push(`${item.playersCount} players`);
      if (item.won === true) parts.push("won");
      if (item.won === false) parts.push("lost");
      return { text: parts.join(" - "), date: dateStr };
    } else {
      // Tracker: show condensed scores
      const name = item.name.charAt(0).toUpperCase() + item.name.slice(1);
      if (item.players && item.scores) {
        const scoreStr = item.players.map((p, i) => `${p} ${item.scores![i]}`).join(", ");
        return { text: `${name}: ${scoreStr}`, date: dateStr };
      }
      return { text: name, date: dateStr };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>

        <h2>Profile</h2>

        <div className="profile-section">
          <label>Name</label>
          {isEditing ? (
            <div className="profile-edit-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={20}
                autoFocus
              />
              <button
                className="btn btn-small btn-primary"
                onClick={handleSaveName}
              >
                Save
              </button>
            </div>
          ) : (
            <div className="profile-display-row">
              <span className="profile-value">{profile.name || "Not set"}</span>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => {
                  setName(profile.name || "");
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="profile-stats">
          <h3>Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{profile.gamesPlayed || 0}</span>
              <span className="stat-label">Games</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.gamesHosted || 0}</span>
              <span className="stat-label">Hosted</span>
            </div>
          </div>
        </div>

        {recentActivity.length > 0 && (
          <div className="profile-activity">
            <h3>Recent Activity</h3>
            <ul className="activity-list">
              {recentActivity.map((item) => {
                const formatted = formatActivityItem(item);
                return (
                  <li key={item.id} className="activity-item">
                    <span className="activity-icon">{item.type === 'game' ? '🎮' : '🃏'}</span>
                    <span className="activity-text">{formatted.text}</span>
                    <span className="activity-date">{formatted.date}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Auth Section */}
        <div className="auth-section">
          {isLoading ? (
            <p className="auth-pitch">Loading...</p>
          ) : isAuthenticated && user ? (
            <div className="signed-in-info">
              <p className="signed-in-email">
                Signed in as <strong>{user.email}</strong>
              </p>
              <button
                className="btn btn-secondary btn-small"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <h3>Sign In</h3>
              <p className="auth-pitch">
                Sign in to sync your stats across devices
              </p>

              <form className="auth-form" onSubmit={handleSignIn}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {authError && <div className="auth-error">{authError}</div>}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p className="auth-help">
                Don&apos;t have an account?{" "}
                <a
                  href="https://zitti.ro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact me at zitti.ro
                </a>
              </p>
            </>
          )}
        </div>

        <div className="profile-id">
          <span className="profile-id-label">Player ID</span>
          <span className="profile-id-value">
            {profile.id?.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  );
}
