const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'if',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'via',
]);

export function smartTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((word, i, arr) => {
      if (/^\s+$|^-$/.test(word)) return word;
      const isFirst = i === 0;
      const isLast = i === arr.length - 1;
      if (!isFirst && !isLast && SMALL_WORDS.has(word)) return word;
      return word[0].toUpperCase() + word.slice(1);
    })
    .join('');
}
