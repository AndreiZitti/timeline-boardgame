export function Home({ onCreateRoom, onJoinRoom, onOpenProfile, playerName }) {
  return (
    <div className="screen home">
      <button className="profile-button" onClick={onOpenProfile}>
        {playerName ? playerName.charAt(0).toUpperCase() : '?'}
      </button>

      <h1>HOT TAKE</h1>
      <p className="subtitle">Where do you stand?</p>

      <div className="how-to-play">
        <ul>
          <li>Everyone gets a secret number (1-100)</li>
          <li>A theme is announced — like "scary things"</li>
          <li>Describe your number using that theme — no numbers allowed!</li>
          <li>Arrange everyone from lowest to highest based on descriptions alone</li>
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
    </div>
  )
}
