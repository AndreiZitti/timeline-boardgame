// Test question pack with minimal questions for UI testing

export default {
  id: 'test-pack',
  name: 'Test Pack',
  categories: [
    {
      name: 'Science',
      questions: [
        { value: 100, q: "This planet is known as the Red Planet", a: "Mars", alt: [] },
        { value: 200, q: "H2O is the chemical formula for this", a: "Water", alt: ["h2o"] },
        { value: 300, q: "This scientist developed the theory of relativity", a: "Einstein", alt: ["Albert Einstein"] },
        { value: 400, q: "The powerhouse of the cell", a: "Mitochondria", alt: ["mitochondrion"] },
        { value: 500, q: "This element has atomic number 79", a: "Gold", alt: ["Au"] }
      ]
    },
    {
      name: 'Geography',
      questions: [
        { value: 100, q: "This is the largest country by area", a: "Russia", alt: [] },
        { value: 200, q: "The capital of France", a: "Paris", alt: [] },
        { value: 300, q: "This river is the longest in the world", a: "Nile", alt: ["the nile", "nile river"] },
        { value: 400, q: "The smallest continent", a: "Australia", alt: ["oceania"] },
        { value: 500, q: "This desert is the largest hot desert in the world", a: "Sahara", alt: ["sahara desert"] }
      ]
    },
    {
      name: 'History',
      questions: [
        { value: 100, q: "This war ended in 1945", a: "World War 2", alt: ["ww2", "wwii", "world war ii", "world war two"] },
        { value: 200, q: "This ancient wonder was located in Egypt", a: "Pyramids", alt: ["great pyramid", "pyramids of giza", "pyramid"] },
        { value: 300, q: "The first president of the United States", a: "George Washington", alt: ["washington"] },
        { value: 400, q: "This empire was ruled from Constantinople", a: "Byzantine", alt: ["byzantine empire", "eastern roman empire"] },
        { value: 500, q: "The year the Berlin Wall fell", a: "1989", alt: [] }
      ]
    },
    {
      name: 'Movies',
      questions: [
        { value: 100, q: "The movie where a shark terrorizes a beach town", a: "Jaws", alt: [] },
        { value: 200, q: "This 1994 film features a box of chocolates quote", a: "Forrest Gump", alt: [] },
        { value: 300, q: "The director of Inception and The Dark Knight", a: "Christopher Nolan", alt: ["nolan"] },
        { value: 400, q: "The highest-grossing film of all time (unadjusted)", a: "Avatar", alt: [] },
        { value: 500, q: "This 1941 film's last word is 'Rosebud'", a: "Citizen Kane", alt: [] }
      ]
    },
    {
      name: 'Sports',
      questions: [
        { value: 100, q: "The number of players on a soccer team on the field", a: "11", alt: ["eleven"] },
        { value: 200, q: "This country has won the most FIFA World Cups", a: "Brazil", alt: [] },
        { value: 300, q: "The sport Tiger Woods is famous for", a: "Golf", alt: [] },
        { value: 400, q: "The Olympic Games originated in this ancient country", a: "Greece", alt: [] },
        { value: 500, q: "This basketball player is known as 'The King'", a: "LeBron James", alt: ["lebron"] }
      ]
    },
    {
      name: 'Music',
      questions: [
        { value: 100, q: "The 'King of Pop'", a: "Michael Jackson", alt: ["mj", "jackson"] },
        { value: 200, q: "This band performed 'Bohemian Rhapsody'", a: "Queen", alt: [] },
        { value: 300, q: "The number of strings on a standard guitar", a: "6", alt: ["six"] },
        { value: 400, q: "This composer wrote the 'Moonlight Sonata'", a: "Beethoven", alt: ["ludwig van beethoven"] },
        { value: 500, q: "The woodwind instrument also called a 'licorice stick'", a: "Clarinet", alt: [] }
      ]
    }
  ]
}
