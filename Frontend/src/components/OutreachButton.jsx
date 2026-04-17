function OutreachButton({ onClick, isWorking, disabled, label = 'Generate & Send', loadingLabel = 'Working...' }) {
  return (
    <button className="primary-button outreach-button" type="button" onClick={onClick} disabled={disabled || isWorking}>
      {isWorking ? loadingLabel : label}
    </button>
  )
}

export default OutreachButton
