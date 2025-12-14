export function HiddenScreen({ category, playerName, isHost, onPeek, onReveal }) {
  return (
    <div className="screen hidden-screen">
      {playerName && <h2 className="player-name-header">{playerName}</h2>}
      <div className="category-reminder">{category}</div>

      <div className="hidden-display" onClick={onPeek}>
        <div className="pattern"></div>
        <p className="peek-hint">Tap to peek</p>
      </div>

      {isHost ? (
        <button className="btn btn-primary" onClick={onReveal}>
          Reveal Numbers
        </button>
      ) : (
        <div className="waiting-for-host">
          <p>Waiting for host to reveal...</p>
        </div>
      )}
    </div>
  )
}
