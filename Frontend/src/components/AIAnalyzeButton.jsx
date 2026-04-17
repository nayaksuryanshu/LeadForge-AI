function AIAnalyzeButton({ onAnalyze, isAnalyzing, disabled }) {
  return (
    <button className="primary-button ai-analyze-button" type="button" onClick={onAnalyze} disabled={disabled || isAnalyzing}>
      {isAnalyzing ? 'Analyzing website...' : 'Analyze with AI'}
    </button>
  )
}

export default AIAnalyzeButton
