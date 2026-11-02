// Text commands, as typed into the original's terminal (Controller + Trie):
// any unambiguous prefix works ("lef", "ri", "cl"), and a leading number
// repeats the command ("3ri", "2dr").
import { COMMAND_NAMES } from "./game";

// Block letters (I, J, L, ...) must be typed exactly; word commands match by prefix.
const WORDS = COMMAND_NAMES.filter((name) => name.length > 1);

export const parseCommand = (input) => {
  const match = /^\s*(\d*)\s*([a-zA-Z]+)\s*$/.exec(input);
  if (!match) return { error: `Can't read "${input.trim()}".` };

  const times = match[1] === "" ? 1 : Number(match[1]);
  const word = match[2];
  if (COMMAND_NAMES.includes(word)) return { name: word, times };

  const candidates = WORDS.filter((name) => name.startsWith(word.toLowerCase()));
  if (candidates.length === 1) return { name: candidates[0], times };
  if (candidates.length === 0) return { error: `Unknown command "${word}".` };
  return { error: `"${word}" could be ${candidates.join(", ")}.` };
};
