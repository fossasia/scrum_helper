const DEFAULT_RULES = {
  bug: [
    /^fix(\(.+\))?:/,
    /\b(bug|error|crash|issue|defect|fault)\b/,
  ],
  docs: [
    /^docs(\(.+\))?:/,
    /\b(doc|readme|documentation|guide|comment)\b/,
  ],
  feature: [
    /^feat(\(.+\))?:/,
    /\b(add|implement|introduce|enhance|create)\b/,
  ],
  refactor: [
    /^(refactor|perf|style|test|build|ci|chore)(\(.+\))?:/,
    /\b(refactor|cleanup|simplify|reorganize|optimi[sz]e|improve)\b/,
  ],
};

function classifyCommit(message, rules = DEFAULT_RULES) {
  if (typeof message !== 'string' || message.trim() === '') {
    return 'other';
  }

  const msg = message.toLowerCase().trim();

  for (const [type, patterns] of Object.entries(rules)) {
    if (patterns.some((pattern) => pattern.test(msg))) {
      return type;
    }
  }

  return 'other';
}

function classifyBatch(messages, rules = DEFAULT_RULES) {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg) => classifyCommit(msg, rules));
}

function getWorkTypeSummary(messages, rules = DEFAULT_RULES) {
  if (!Array.isArray(messages)) return {
    feature: 0,
    bug: 0,
    docs: 0,
    refactor: 0,
    other: 0,
  };

  const summary = {
    feature: 0,
    bug: 0,
    docs: 0,
    refactor: 0,
    other: 0,
  };

  for (const msg of messages) {
    const type = classifyCommit(msg, rules);
    summary[type] = (summary[type] ?? 0) + 1;
  }

  return summary;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifyCommit,
    classifyBatch,
    getWorkTypeSummary,
    DEFAULT_RULES,
  };
}