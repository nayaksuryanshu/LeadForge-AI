function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString()
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|•|\-|\*/)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  return []
}

export default function formatAIResponse(input) {
  const source = input && typeof input === 'object' ? input : {}

  return {
    summary: String(source.summary || source.aiAnalysis || '').trim(),
    aiGap: String(source.aiGap || source.gap || '').trim(),
    suggestions: toList(source.suggestions),
    lastAnalyzedLabel: formatDateTime(source.lastAnalyzed),
  }
}
