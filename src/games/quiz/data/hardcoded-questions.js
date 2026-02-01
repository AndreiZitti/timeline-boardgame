// Hardcoded questions for Quiz Game
// 25 questions: 5 categories × 5 point values (100-500)

export const HARDCODED_QUESTIONS = [
  // ==================== SCIENCE ====================
  {
    id: 1,
    question: "What is H2O commonly called?",
    answers: ["Water", "water"],
    category: "Science",
    difficulty: "easy",
    value: 100,
    source: "manual"
  },
  {
    id: 2,
    question: "How many planets are in our solar system?",
    answers: ["8", "Eight", "eight"],
    category: "Science",
    difficulty: "easy",
    value: 200,
    source: "manual"
  },
  {
    id: 3,
    question: "What gas do plants absorb from the air?",
    answers: ["Carbon dioxide", "CO2", "carbon dioxide", "co2"],
    category: "Science",
    difficulty: "medium",
    value: 300,
    source: "manual"
  },
  {
    id: 4,
    question: "What's the chemical symbol for gold?",
    answers: ["Au", "au", "AU"],
    category: "Science",
    difficulty: "hard",
    value: 400,
    source: "manual"
  },
  {
    id: 5,
    question: "What is the hardest natural substance on Earth?",
    answers: ["Diamond", "diamond", "Diamonds", "diamonds"],
    category: "Science",
    difficulty: "hard",
    value: 500,
    source: "manual"
  },

  // ==================== HISTORY ====================
  {
    id: 6,
    question: "What's the capital of Japan?",
    answers: ["Tokyo", "tokyo"],
    category: "History",
    difficulty: "easy",
    value: 100,
    source: "manual"
  },
  {
    id: 7,
    question: "How many continents are there on Earth?",
    answers: ["7", "Seven", "seven"],
    category: "History",
    difficulty: "easy",
    value: 200,
    source: "manual"
  },
  {
    id: 8,
    question: "In which year did World War II end?",
    answers: ["1945"],
    category: "History",
    difficulty: "medium",
    value: 300,
    source: "manual"
  },
  {
    id: 9,
    question: "Which country gifted the Statue of Liberty to the USA?",
    answers: ["France", "france"],
    category: "History",
    difficulty: "hard",
    value: 400,
    source: "manual"
  },
  {
    id: 10,
    question: "Which river is the longest in Africa?",
    answers: ["Nile", "The Nile", "nile", "the nile"],
    category: "History",
    difficulty: "hard",
    value: 500,
    source: "manual"
  },

  // ==================== ENTERTAINMENT ====================
  {
    id: 11,
    question: "What sport does LeBron James play?",
    answers: ["Basketball", "basketball"],
    category: "Entertainment",
    difficulty: "easy",
    value: 100,
    source: "manual"
  },
  {
    id: 12,
    question: "Which band sang 'Bohemian Rhapsody'?",
    answers: ["Queen", "queen"],
    category: "Entertainment",
    difficulty: "easy",
    value: 200,
    source: "manual"
  },
  {
    id: 13,
    question: "In which fictional city does Batman live?",
    answers: ["Gotham", "Gotham City", "gotham", "gotham city"],
    category: "Entertainment",
    difficulty: "medium",
    value: 300,
    source: "manual"
  },
  {
    id: 14,
    question: "What movie features a character named Jack Dawson?",
    answers: ["Titanic", "titanic"],
    category: "Entertainment",
    difficulty: "hard",
    value: 400,
    source: "manual"
  },
  {
    id: 15,
    question: "What video game features a plumber named Mario?",
    answers: ["Super Mario", "Mario", "Super Mario Bros", "mario", "Mario Bros"],
    category: "Entertainment",
    difficulty: "hard",
    value: 500,
    source: "manual"
  },

  // ==================== LANGUAGE ====================
  {
    id: 16,
    question: "What is the plural of 'mouse'?",
    answers: ["Mice", "mice"],
    category: "Language",
    difficulty: "easy",
    value: 100,
    source: "manual"
  },
  {
    id: 17,
    question: "How many letters are in the English alphabet?",
    answers: ["26", "Twenty-six", "twenty-six", "Twenty six"],
    category: "Language",
    difficulty: "easy",
    value: 200,
    source: "manual"
  },
  {
    id: 18,
    question: "What word means the opposite of 'ancient'?",
    answers: ["Modern", "modern", "New", "new"],
    category: "Language",
    difficulty: "medium",
    value: 300,
    source: "manual"
  },
  {
    id: 19,
    question: "What punctuation mark ends a question?",
    answers: ["Question mark", "?", "question mark"],
    category: "Language",
    difficulty: "hard",
    value: 400,
    source: "manual"
  },
  {
    id: 20,
    question: "What language has the most native speakers?",
    answers: ["Mandarin", "Chinese", "Mandarin Chinese", "mandarin", "chinese"],
    category: "Language",
    difficulty: "hard",
    value: 500,
    source: "manual"
  },

  // ==================== RANDOM ====================
  {
    id: 21,
    question: "How many sides does a triangle have?",
    answers: ["3", "Three", "three"],
    category: "Random",
    difficulty: "easy",
    value: 100,
    source: "manual"
  },
  {
    id: 22,
    question: "What do you call frozen water?",
    answers: ["Ice", "ice"],
    category: "Random",
    difficulty: "easy",
    value: 200,
    source: "manual"
  },
  {
    id: 23,
    question: "Which day comes after Friday?",
    answers: ["Saturday", "saturday"],
    category: "Random",
    difficulty: "medium",
    value: 300,
    source: "manual"
  },
  {
    id: 24,
    question: "What color are school buses typically in the U.S.?",
    answers: ["Yellow", "yellow"],
    category: "Random",
    difficulty: "hard",
    value: 400,
    source: "manual"
  },
  {
    id: 25,
    question: "What instrument has black and white keys?",
    answers: ["Piano", "piano", "Keyboard", "keyboard"],
    category: "Random",
    difficulty: "hard",
    value: 500,
    source: "manual"
  }
]

// Categories in display order
export const CATEGORIES = ['Science', 'History', 'Entertainment', 'Language', 'Random']

// Get questions for Quick Mode (random 10)
export function getRandomQuestions(count = 10) {
  const shuffled = [...HARDCODED_QUESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(q => ({
    id: q.id,
    question: q.question,
    answer: q.answers[0],
    acceptable_answers: q.answers,
    category: q.category,
    difficulty: q.difficulty,
    type: 'open'
  }))
}

// Build board for Classic Mode (5×5 grid)
export function buildBoard() {
  const board = []

  for (const category of CATEGORIES) {
    const categoryQuestions = HARDCODED_QUESTIONS
      .filter(q => q.category === category)
      .sort((a, b) => a.value - b.value)

    for (const q of categoryQuestions) {
      board.push({
        id: q.id,
        question: q.question,
        answer: q.answers[0],
        acceptable_answers: q.answers,
        category: q.category,
        difficulty: q.difficulty,
        value: q.value,
        used: false,
        type: 'open'
      })
    }
  }

  return { board, categories: CATEGORIES }
}
