import logoImg from '../assets/fitkit-logo.png'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand compact' : 'brand'}>
      <img src={logoImg} alt="FitKit" />
      {!compact && <span>FIT<span>KIT</span></span>}
    </div>
  )
}
