import { motion } from 'framer-motion'

export function ResultsScreen({
  playerScore,
  gameScore,
  roundHistory,
  onPlayAgain,
  onExit
}) {
  const playerWon = playerScore > gameScore
  const tied = playerScore === gameScore

  const getResultTitle = () => {
    if (tied) return 'It\'s a Tie!'
    return playerWon ? 'You Win!' : 'Game Wins!'
  }

  const getResultEmoji = () => {
    if (tied) return '&#129309;'
    return playerWon ? '&#127881;' : '&#128546;'
  }

  return (
    <motion.div
      className="screen results-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Result header */}
      <motion.div
        className={`results-header ${playerWon ? 'win' : tied ? 'tie' : 'lose'}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <span
          className="results-emoji"
          dangerouslySetInnerHTML={{ __html: getResultEmoji() }}
        />
        <h1>{getResultTitle()}</h1>
      </motion.div>

      {/* Final score */}
      <motion.div
        className="final-score"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="final-score-item you">
          <span className="final-score-label">Your Team</span>
          <span className="final-score-value">{playerScore}</span>
        </div>
        <div className="final-score-vs">vs</div>
        <div className="final-score-item game">
          <span className="final-score-label">The Game</span>
          <span className="final-score-value">{gameScore}</span>
        </div>
      </motion.div>

      {/* Round history */}
      <motion.div
        className="round-history"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h3>Round Summary</h3>
        <div className="history-list">
          {roundHistory.map((round, index) => (
            <motion.div
              key={index}
              className={`history-item ${round.result.zone}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 + index * 0.1 }}
            >
              <div className="history-round">R{index + 1}</div>
              <div className="history-details">
                <span className="history-psychic">{round.psychic}</span>
                <span className="history-spectrum">
                  {round.spectrum.left} - {round.spectrum.right}
                </span>
                <span className="history-clue">&ldquo;{round.clue}&rdquo;</span>
              </div>
              <div className="history-score">
                {round.result.playerPoints > 0 ? (
                  <span className="points-gained">+{round.result.playerPoints}</span>
                ) : (
                  <span className="points-lost">-{round.result.gamePoints}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="button-group"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <button className="btn btn-primary" onClick={onPlayAgain}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={onExit}>
          Back to Menu
        </button>
      </motion.div>
    </motion.div>
  )
}
