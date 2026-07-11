type MessageTree = Record<string, unknown>;

function isMessageTree(value: unknown): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeMessageFallbacks(
  fallback: MessageTree,
  translated: MessageTree,
): MessageTree {
  const merged: MessageTree = { ...fallback };

  for (const [key, translatedValue] of Object.entries(translated)) {
    const fallbackValue = fallback[key];
    merged[key] = isMessageTree(fallbackValue) && isMessageTree(translatedValue)
      ? mergeMessageFallbacks(fallbackValue, translatedValue)
      : translatedValue;
  }

  return merged;
}
