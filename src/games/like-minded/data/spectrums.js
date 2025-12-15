// Spectrum cards for Like Minded game
// Each spectrum has two endpoints representing opposite ends of a scale

export const spectrums = [
  { id: 1, left: "Hot", right: "Cold" },
  { id: 2, left: "Good", right: "Evil" },
  { id: 3, left: "Overrated", right: "Underrated" },
  { id: 4, left: "Dangerous", right: "Safe" },
  { id: 5, left: "Weird", right: "Normal" },
  { id: 6, left: "Famous", right: "Obscure" },
  { id: 7, left: "Cheap", right: "Expensive" },
  { id: 8, left: "Old", right: "Young" },
  { id: 9, left: "Guilty Pleasure", right: "Proudly Enjoy" },
  { id: 10, left: "Better as Book", right: "Better as Movie" },
  { id: 11, left: "80s", right: "90s" },
  { id: 12, left: "Marvel", right: "DC" },
  { id: 13, left: "Cat Person", right: "Dog Person" },
  { id: 14, left: "Night Owl", right: "Early Bird" },
  { id: 15, left: "Life of the Party", right: "Wallflower" },
  { id: 16, left: "Introvert", right: "Extrovert" },
  { id: 17, left: "Overthinking", right: "Winging It" },
  { id: 18, left: "Good Actor", right: "Bad Actor" },
  { id: 19, left: "Cringe", right: "Based" },
  { id: 20, left: "Would Start a Cult", right: "Would Join a Cult" },
  { id: 21, left: "Spontaneous", right: "Planned" },
  { id: 22, left: "Round", right: "Pointy" },
  { id: 23, left: "Soft", right: "Hard" },
  { id: 24, left: "Fast", right: "Slow" },
  { id: 25, left: "Loud", right: "Quiet" },
  { id: 26, left: "Sweet", right: "Salty" },
  { id: 27, left: "Urban", right: "Rural" },
  { id: 28, left: "Minimalist", right: "Maximalist" },
  { id: 29, left: "Practical", right: "Impractical" },
  { id: 30, left: "Timeless", right: "Trendy" },
  { id: 31, left: "Relaxing", right: "Stressful" },
  { id: 32, left: "Easy to Learn", right: "Hard to Master" },
  { id: 33, left: "Needs Ketchup", right: "Never Needs Ketchup" },
  { id: 34, left: "Good First Date", right: "Bad First Date" },
  { id: 35, left: "Breakfast Food", right: "Not Breakfast Food" },
  { id: 36, left: "Would Survive Horror Movie", right: "Dies First" },
  { id: 37, left: "Good Superhero Name", right: "Terrible Superhero Name" },
  { id: 38, left: "Looks Expensive", right: "Looks Cheap" },
  { id: 39, left: "Grandma Would Approve", right: "Grandma Would Not Approve" },
  { id: 40, left: "Socially Acceptable", right: "Frowned Upon" },
  { id: 41, left: "Instagram", right: "Reality" },
  { id: 42, left: "Forgettable", right: "Memorable" },
  { id: 43, left: "Comforting", right: "Unsettling" },
  { id: 44, left: "Genius", right: "Idiot" },
  { id: 45, left: "Hero", right: "Villain" },
  { id: 46, left: "Useful Skill", right: "Useless Skill" },
  { id: 47, left: "Mainstream", right: "Underground" },
  { id: 48, left: "Before Its Time", right: "Behind the Times" },
  { id: 49, left: "Tastes Good", right: "Tastes Bad" },
  { id: 50, left: "High Effort", right: "Low Effort" },
  { id: 51, left: "Beautiful", right: "Ugly" },
  { id: 52, left: "Healthy", right: "Unhealthy" },
  { id: 53, left: "Romantic", right: "Unromantic" },
  { id: 54, left: "Scary", right: "Not Scary" },
  { id: 55, left: "Addictive", right: "Boring" },
  { id: 56, left: "Childish", right: "Mature" },
  { id: 57, left: "Masculine", right: "Feminine" },
  { id: 58, left: "Legal", right: "Illegal" },
  { id: 59, left: "Ethical", right: "Unethical" },
  { id: 60, left: "Necessary", right: "Unnecessary" },
]

// Shuffle array using Fisher-Yates algorithm
export function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Get a random spectrum that hasn't been used
export function getRandomSpectrum(usedIds = []) {
  const available = spectrums.filter(s => !usedIds.includes(s.id))
  if (available.length === 0) {
    // Reset if all cards used
    return spectrums[Math.floor(Math.random() * spectrums.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}
