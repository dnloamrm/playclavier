/* Auto-jam's poems, grouped by emotional concept. Each concept sets the typing tempo: `delay` +/- `randomVariation` (ms) between characters, plus a
   breathing pause after punctuation (see auto-type-v1.js). This is DATA: tests/specs/autojam.spec.js checks that every poem is a complete text with
   one final full stop and lasts at least MIN_MS; nothing is filtered at runtime. */
export const CONCEPTS = [
  { id: 'melancholy', delay: 350, randomVariation: 150, poems: [
      "Play the silence between the notes.\nListen as the echoes drift into the dark,\nleaving only a gentle resonance behind.",
      "The house is quiet now, and the piano waits.\nEvery key still holds a little of the rain,\na little of the light that used to stay.",
      "Some songs are only ever half remembered.\nI let the last chord ring until it fades,\nand sit inside the stillness it leaves.",
      "Nothing moves but the dust in the window light.\nA single note, then another, then the long quiet\nthat gathers where the music used to be." ] },
  { id: 'nostalgia', delay: 220, randomVariation: 80, poems: [
      "A distant melody lingers in the evening air.\nEvery key brings back a memory soft as shadow\nand golden as dusk, a waltz we once knew\nby heart, still turning somewhere in the dark.",
      "The streetlights come on one by one.\nSomewhere a window glows in a minor key,\nand the whole afternoon folds itself away\nlike a letter we meant to answer, long ago.",
      "We were younger in that last chord.\nThe evening keeps the tune we forgot,\nand hums it back to us, slow and warm,\nthe way old houses remember footsteps.",
      "Summer ends the way a song does,\nnot with a sound but with a softer light.\nWe stand a while at the edge of it,\nlistening to everything we used to be." ] },
  { id: 'ecstasy', delay: 90, randomVariation: 30, poems: [
      "Let the rhythm overflow with sudden light,\ncascading through every key like a storm\nof sound and pure motion!\nFaster, brighter, higher: the whole room is singing,\nthe whole sky is a glissando,\nand nothing, nothing at all, is standing still.\nOpen every window and let the music out;\nlet it run down the street, laughing, shining.",
      "Joy takes the stairs two at a time,\ntumbling up the keyboard in a shower of gold!\nEvery note is a spark, every spark a sunrise,\nand the music runs ahead of us, laughing,\nwide open, unstoppable, impossibly bright.\nDon't stop now; don't even breathe.\nThe whole world is spinning in three-four time,\nand we are the ones holding the light.",
      "The whole sky is a glissando, and we are in it!\nHands like wings, a flood of silver notes,\nrunning, leaping, spinning into the light.\nLet it cascade, let it overflow, let it blaze,\nuntil the last bright chord breaks over us like the sea.\nAgain, again, faster: the night is ours,\nand every heartbeat is a drum, a drum, a drum." ] }
];

export const PAUSE_CHARS = ',.;:!?\n', PAUSE_MIN = 200, PAUSE_MAX = 400;
/* every poem lasts at least this long (expected duration = concept delay per character + the mean pause on punctuation / newlines) */
export const MIN_MS = 30000;
export function estimateMs(concept, text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) n += concept.delay + (PAUSE_CHARS.indexOf(text.charAt(i)) > -1 ? (PAUSE_MIN + PAUSE_MAX) / 2 : 0);
  return n;
}
