import { aiEventEmitter } from './aiEventEmitter';

const DEFAULT_BENCHMARKS = [
  {
    input: 'Team sync tomorrow at 3pm',
    expected: { title: 'Team sync', hasTime: true, hasDate: true }
  },
  {
    input: 'Dinner with Sara on 5/12 at 7pm',
    expected: { title: 'Dinner with Sara', hasTime: true, hasDate: true }
  },
  {
    input: 'Yoga class next Friday morning',
    expected: { title: 'Yoga class', hasTime: false, hasDate: true }
  }
];

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const titleMatches = (actual, expected) => {
  if (!expected) return true;
  if (!actual) return false;
  return actual.toLowerCase().includes(expected.toLowerCase());
};

const timeMatches = (draft, expected) => {
  if (expected === undefined) return true;
  if (!draft?.start) return false;
  const start = new Date(draft.start);
  const hasTime = start.getUTCHours() !== 0 || start.getUTCMinutes() !== 0;
  return expected === hasTime;
};

const dateMatches = (draft, expected) => {
  if (expected === undefined) return true;
  return Boolean(draft?.start) === expected;
};

export const createWebLLMEvaluator = ({ benchmarks = DEFAULT_BENCHMARKS } = {}) => {
  let cachedResult = null;

  const evaluate = async ({ parseEvent }) => {
    if (!parseEvent) {
      cachedResult = { ready: false, latencyMs: Infinity, accuracy: 0 };
      return cachedResult;
    }

    const results = [];
    let totalLatency = 0;
    let correct = 0;

    for (const benchmark of benchmarks) {
      const start = nowMs();
      try {
        const draft = await parseEvent(benchmark.input);
        const latency = nowMs() - start;
        totalLatency += latency;
        const isAccurate =
          titleMatches(draft?.title, benchmark.expected.title) &&
          timeMatches(draft, benchmark.expected.hasTime) &&
          dateMatches(draft, benchmark.expected.hasDate);
        if (isAccurate) correct += 1;
        results.push({ input: benchmark.input, latencyMs: latency, accurate: isAccurate });
      } catch (error) {
        const latency = nowMs() - start;
        totalLatency += latency;
        results.push({ input: benchmark.input, latencyMs: latency, accurate: false, error: error.message });
      }
    }

    const accuracy = results.length ? correct / results.length : 0;
    const latencyMs = results.length ? totalLatency / results.length : Infinity;
    cachedResult = {
      ready: latencyMs <= 2000 && accuracy >= 0.9,
      latencyMs,
      accuracy,
      results
    };

    aiEventEmitter.emit('calai-webllm-benchmark', cachedResult);

    return cachedResult;
  };

  const getCached = () => cachedResult;

  return { evaluate, getCached };
};
