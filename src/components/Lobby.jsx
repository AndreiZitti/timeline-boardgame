import { useState } from 'react'

const CATEGORIES = {
  safe: {
    label: 'Safe',
    items: [
      "Superpowers from least to most powerful",
      "Worst to best places to start dancing uncontrollably",
      "Dance moves from worst to best",
      "Fragrances and smells from worst to best",
      "Easiest to hardest things to give up for the rest of your life",
      "Worst to best thing to have the ability to conjure from thin air",
      "Celebrities from weakest to strongest in a fight",
      "Things you could purchase for $10,000 from least to most practical",
      "Scenarios from least to most annoying",
      "Worst to best reasons to go on a quest",
      "Things that are least to most cute",
      "Worst to best things you could do if you could freeze time",
      "Memes from least to most funny",
      "Things you can poke your finger in from worst to best",
      "Worst to best things to give as a gift",
      "Worst to best things to be able to control with your mind",
      "Musical artists or acts from worst to best",
      "Things that would least to most improve your day",
      "Celebrities from least to most talented",
      "Animals and fantasy creatures from least to most cool to have as a pet",
      "Movies and TV shows from least to most likely to make you laugh",
      "Movies or TV show moments from least to most likely to make you cry",
      "Worst to best things to do if you were suddenly transported back to the medieval ages",
      "Desserts or sweets from worst to best",
      "Worst to best superhero names",
      "Fast food menu items from worst to best",
      "Things that would least to most likely scare you",
      "Animals and fantasy creatures you'd most to least likely beat in a fist fight",
      "Fictional characters from weakest to strongest in a fight",
      "Experiences from least to most impactful on someone's life",
      "Worst to best times in history you would travel to if you could time travel",
      "Worst to best things to serve at a 5 star restaurant",
      "Hobbies from least to most interesting",
      "Things you would do if you had a free day to yourself from least to most likely",
      "Things that are easiest to hardest to learn",
      "Worst to best wish you would make if you could make any wish",
      "People from poorest to richest",
      "Worst to best things to do everyday",
      "Worst to best ways to travel 1000 kilometres",
      "Sounds and noises from worst to best",
      "Songs from worst to best",
      "Beverages from worst to best",
      "Fictional worlds or settings you'd least to most like to live in",
      "People you'd least to most want to swap bodies with for a day",
      "People or things you'd least to most want on a deserted island with you",
      "Things to pack for lunch from worst to best",
      "Songs you'd hear at a karaoke night from least to most likely",
      "Worst to best things to write a song about",
      "Animals from most to least common",
      "World records from least to most impressive",
      "Things to put on your resume from least to most impressive",
      "Things you can cook at home from easiest to hardest",
      "Worst to best places to get food in your city",
      "Worst to best person to represent you in a criminal trial",
      "Worst to best things to do at a restaurant",
      "Things you least to most want to happen 10 years from now",
      "Jobs or professions from easiest to hardest",
      "Worst to best excuses for being late to work",
      "Things to do as a group from least to most exciting",
      "Worst to best things to do if you had an audience with the queen",
      "Things that least to most likely indicate someone is old",
      "Things that least to most likely indicate someone is young",
      "Items or things people are least to most likely to own",
      "Worst to best things to do if you are stranded on tropical island",
      "Items from least to most useful in a fight",
      "Worst to best things to make review videos of for a living",
      "Celebrities from least to most likeable",
      "Worst to best flavours of ice cream",
      "Worst to best people from history to have dinner with",
      "Things to eat for breakfast from worst to best",
      "Worst to best things you would do if you could time travel",
      "Worst to best mottos to live by",
      "Worst to best reasons to pursue a career in medicine",
      "Things you've done in your life from least to most often",
      "Things you least to most want to happen 300 years from now",
      "Worst to best things to do in a crowded elevator",
      "Fictional characters you'd most want to be friends with",
      "Worst to best reasons to write a strongly worded letter",
      "Things you least to most want to happen at your wedding",
      "Worst to best things about being a vampire",
      "Worst to best reasons to become a supervillain",
      "Worst to best things to see happen on a stage",
      "Things you would put in a mansion you were building from least to most practical",
      "Least to most intimidating villains from fiction",
      "Worst to best things to have to wear as your uniform at work",
      "Worst to best things to catch while going fishing",
      "Investments from least to most stable",
      "Worst to best things to carry in your purse",
      "Worst to best things to do if you are a teacher",
      "Things you would do if you were a bird from least to most interesting",
      // Additional safe categories
      "Video games from least to most fun",
      "Sports from easiest to hardest to learn",
      "Countries from least to most interesting to visit",
      "Historical figures from least to most influential",
      "Inventions from least to most important",
      "Fruits from worst to best",
      "Pizza toppings from worst to best",
      "Seasons from worst to best",
      "Holidays from least to most enjoyable",
      "Board games from least to most fun",
      "Types of weather from worst to best",
      "School subjects from worst to best",
      "Cartoon characters from least to most annoying",
      "Ways to spend a rainy day from worst to best",
      "Things to find in a treasure chest from worst to best",
      "Dinosaurs from least to most terrifying",
      "Mythological creatures from least to most dangerous",
      "Types of cheese from worst to best",
      "Sandwiches from worst to best",
      "Things to do at a theme park from least to most exciting"
    ]
  },
  nsfw: {
    label: 'NSFW 🔥',
    items: [
      "Worst to best ways to commit a murder and try to get away with it",
      "Worst to best things to challenge the grim reaper at to save your life",
      "Worst to best reasons to start a fight",
      "Worst to best things to get tattooed",
      "Worst to best things to do if you are stopped by the police",
      "Worst to best ways to make money",
      "Worst to best people, characters or creatures to watch have sex",
      "Worst to best things to fight over during a divorce",
      "Things you would do if you had no money and were homeless from least to most likely",
      "Things you would do if you knew you would die tomorrow from worst to best",
      "Things to put on your dating profile that would make you least to most successful",
      "Things to do just before you quit your job from worst to best",
      "Ways to make a child cry from least to most cruel",
      "Things you would do if you ruled the world from least to most cruel",
      "Reasons to have sex from worst to best",
      "Ways to get high from worst to best",
      "Worst to best reasons for a riot to happen",
      "Female celebrities from least to most attractive",
      "Social issues from least to most important",
      "Horror movies you would least to most likely survive",
      "Fantasy creatures that you least to most want to have sex with",
      "Things that least to most turn you on",
      "Couples from the real world or fiction you'd most want to join in a threesome",
      "Places to hide a body from worst to best",
      "Crimes from most to least easy to get away with",
      "Worst to best things to share on social media",
      "Worst to best ways to answer 'Where do you see yourself in 5 years?'",
      "Best to worst things your parents did while you grew up",
      "Worst to best things your boss could tell you",
      "Reasons to divorce from worst to best",
      "Alcoholic drinks from worst to best",
      "Things to wipe your butt with from worst to best",
      "Fetishes from most normal to strangest",
      "Personality traits from least to most attractive",
      "Porn scenarios from least to most exciting",
      "Male celebrities from least to most attractive",
      "Things you would do if you were the only person left on Earth from least to most likely",
      "Magical curses you would inflict on your worst enemy from least to most cruel",
      "Worst to best ways to propose marriage to someone",
      "Things that least to most likely indicate someone is male",
      "Things that least to most likely indicate someone is female",
      "Things that happened in highschool from worst to best",
      "Places to fart loudly from best to worst",
      "Things you would do if you could turn invisible from worst to best",
      "Worst to best things to do on a first date",
      "Worst to best things to do with a dildo",
      "Worst to best things to use as lubricant while being intimate",
      "Worst to best things to learn about your parents",
      "Worst to best thing to do if you found a dead body",
      "Worst to best excuses for cheating on your significant other",
      "People or things you'd least to most want to kiss",
      "Least to most enjoyable part of a furry convention",
      "Things your partner could dress up as from least to most hot",
      "Worst to best things to do in a zombie apocalypse",
      "Worst to best ways to break up with someone",
      "Things that least to most likely indicate a man is gay",
      "Things that least to most likely indicate a woman is a lesbian",
      "Least to most likely thing for a cult to worship",
      "Worst to best questions to ask on a first date",
      "Worst to best ways to have sex",
      "Worst to best things to describe as 'sexy'",
      "Worst to best ways to describe someone's sexual performance",
      "Least to most important things to consider when organising an orgy",
      "Worst to best things to do at a strip joint",
      "Worst to best ways to get everyone's attention",
      "Things worse than being kicked in the balls from most to least comparable",
      "Worst to best things you could say about someone",
      "Worst to best reasons to drop out of school",
      "Things that least to most disgust you",
      "Worst to best ways to assert dominance",
      "Worst to best places to take a piss",
      "Worst to best things to lie about",
      "Worst to best reasons to never have sex",
      "Easiest to hardest things to steal",
      "Easiest to hardest people to assassinate",
      "Worst to best ways to die",
      "Worst to best things to search up on google",
      "Easiest to hardest things to have to tell your parents",
      "Worst to best things to do naked",
      "Worst to best things to nickname your genitals",
      "Things that cause the least to the most pain",
      "Worst to best things to break",
      "Worst to best places to go swimming",
      "Reasons to get married from worst to best",
      "Worst to best ways to get yourself to fall asleep",
      "The worst to best movies to make a porn parody of",
      "Things you would do for $100 from easiest to hardest",
      "Things to do on the internet from least to most entertaining",
      "Worst to best nicknames to have",
      "Fictional characters with the easiest to the hardest lives",
      "Problems that need to be solved by humanity from least to most important",
      "Worst to best things you could use to blackmail someone with",
      // Additional NSFW categories
      "Worst to best things to yell during sex",
      "Things that would make a priest uncomfortable from least to most",
      "Worst to best things to be caught doing by your parents",
      "Celebrity scandals from least to most shocking",
      "Worst to best things to whisper to a stranger",
      "Red flags in a relationship from smallest to biggest"
    ]
  },
  classic: {
    label: 'Classic',
    items: [
      "How spicy do you like your food?",
      "How much do you enjoy mornings?",
      "How adventurous are you?",
      "How much do you like small talk?",
      "How organized is your desk?",
      "How likely are you to cry at movies?",
      "How comfortable are you with public speaking?",
      "How much do you enjoy cooking?",
      "How patient are you in traffic?",
      "How often do you exercise?",
      "How risk-averse are you?",
      "How competitive are you?",
      "How tech-savvy are you?",
      "How much do you enjoy parties?",
      "How good are you at keeping secrets?",
      "How punctual are you?",
      "How much do you procrastinate?",
      "How good is your sense of direction?",
      "How much do you care about fashion?",
      "How squeamish are you?"
    ]
  }
}

export function Lobby({ room, isHost, onSetCategory, onStartRound, onLeave }) {
  const [category, setCategory] = useState(room.category || '')
  const [showPicker, setShowPicker] = useState(false)
  const [enabledGroups, setEnabledGroups] = useState(['safe', 'classic'])
  const [selectedGroup, setSelectedGroup] = useState('safe')

  const handleCategoryChange = (value) => {
    setCategory(value)
    onSetCategory(value)
  }

  const handleCategorySelect = (cat) => {
    handleCategoryChange(cat)
    setShowPicker(false)
  }

  const toggleGroup = (group) => {
    setEnabledGroups(prev => {
      if (prev.includes(group)) {
        // Don't allow disabling all groups
        if (prev.length === 1) return prev
        return prev.filter(g => g !== group)
      }
      return [...prev, group]
    })
  }

  const getRandomCategory = () => {
    const allEnabled = enabledGroups.flatMap(g => CATEGORIES[g].items)
    const random = allEnabled[Math.floor(Math.random() * allEnabled.length)]
    handleCategoryChange(random)
  }

  const canStart = room.players.length >= 2 && category.trim()

  // Get categories for selected group
  const currentGroupCategories = CATEGORIES[selectedGroup]?.items || []

  return (
    <div className="screen lobby">
      <button className="btn-back" onClick={onLeave}>&larr; Leave</button>

      <div className="room-code-display">
        <span className="label">Room Code</span>
        <span className="code">{room.code}</span>
      </div>

      <div className="players-list">
        <h3>Players ({room.players.length})</h3>
        <ul>
          {room.players.map((player, index) => (
            <li key={player.id}>
              {player.name}
              {index === 0 && <span className="host-badge">Host</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <div className="host-controls">
          <div className="input-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              placeholder="Enter a category or pick one..."
              autoComplete="off"
            />
            <div className="category-buttons">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => setShowPicker(!showPicker)}
              >
                {showPicker ? 'Hide' : 'Browse'}
              </button>
              <button
                type="button"
                className="btn btn-small btn-random"
                onClick={getRandomCategory}
              >
                🎲 Random
              </button>
            </div>
          </div>

          {showPicker && (
            <div className="category-picker">
              <div className="group-toggles">
                <span className="toggles-label">Include:</span>
                {Object.entries(CATEGORIES).map(([key, group]) => (
                  <button
                    key={key}
                    className={`toggle-chip ${enabledGroups.includes(key) ? 'active' : ''} ${key === 'nsfw' ? 'nsfw' : ''}`}
                    onClick={() => toggleGroup(key)}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              <div className="group-tabs">
                {Object.entries(CATEGORIES).map(([key, group]) => (
                  <button
                    key={key}
                    className={`tab ${selectedGroup === key ? 'active' : ''} ${key === 'nsfw' ? 'nsfw' : ''}`}
                    onClick={() => setSelectedGroup(key)}
                  >
                    {group.label} ({group.items.length})
                  </button>
                ))}
              </div>

              <div className="category-list">
                {currentGroupCategories.map((cat, i) => (
                  <button
                    key={i}
                    className="category-item"
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={onStartRound}
            disabled={!canStart}
          >
            {room.players.length < 2
              ? 'Waiting for players...'
              : !category.trim()
              ? 'Pick a category to start'
              : 'Start Round'}
          </button>
        </div>
      ) : (
        <div className="waiting-state">
          {room.category ? (
            <div className="category-preview">
              <span className="label">Category</span>
              <span className="value">{room.category}</span>
            </div>
          ) : (
            <p>Waiting for host to set a category...</p>
          )}
        </div>
      )}
    </div>
  )
}
