const NONCE_PATTERN = /\/nonce\s+\w+/gi;
const EXTRA_WHITESPACE = /\s{2,}/g;

const isMathExpression = (input) => {
  return /^\s*\d+(?:\.\d+)?\s*[+\-*/]\s*\d+(?:\.\d+)?\s*$/.test(input);
};

const evaluateMathExpression = (input) => {
  const match = input.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[3]);
  const op = match[2];

  if (Number.isNaN(left) || Number.isNaN(right)) return null;

  switch (op) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? null : left / right;
    default:
      return null;
  }
};

export const sanitizeAIOutput = (output, { input = '', verbose = false } = {}) => {
  if (typeof output !== 'string') return output;

  let cleaned = output.replace(NONCE_PATTERN, '').replace(EXTRA_WHITESPACE, ' ').trim();

  if (isMathExpression(input)) {
    const result = evaluateMathExpression(input);
    if (result !== null) {
      const cleanResult = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(4)));
      if (verbose) {
        return `${cleanResult} (from ${input.replace(/\s+/g, '')})`;
      }
      return cleanResult;
    }
  }

  return cleaned;
};
