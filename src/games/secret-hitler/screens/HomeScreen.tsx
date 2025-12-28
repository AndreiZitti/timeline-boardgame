import React from "react";

interface HomeScreenProps {
  onBack: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function HomeScreen({ onBack, onCreateRoom, onJoinRoom }: HomeScreenProps) {
  return (
    <div className="secret-hitler-screen">
      <button className="btn-back" onClick={onBack}>
        &larr; Back to Games
      </button>

      <h1>SECRET HITLER</h1>
      <p className="subtitle">A game of political intrigue and betrayal</p>

      <div className="how-to-play">
        <ul>
          <li>Players are secretly divided into Liberals and Fascists</li>
          <li>Liberals must enact liberal policies or find and execute Hitler</li>
          <li>Fascists must enact fascist policies or elect Hitler as Chancellor</li>
          <li>Trust no one - anyone could be lying about their identity!</li>
        </ul>
      </div>

      <div className="button-group">
        <button className="btn btn-primary" onClick={onCreateRoom}>
          Create Room
        </button>
        <button className="btn btn-secondary" onClick={onJoinRoom}>
          Join Room
        </button>
      </div>

      <div className="credits">
        <p>
          Adapted from the original{" "}
          <a
            href="https://secrethitler.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Secret Hitler
          </a>{" "}
          board game by Goat, Wolf, & Cabbage.
        </p>
        <p>
          Licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
        </p>
      </div>
    </div>
  );
}

export default HomeScreen;
