import { Icon } from './Icons'
import { Logo } from './Logo'
import type { Page } from '../types'

export function Topbar({ page, onMenu }: { page: Page; onMenu: () => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><Logo compact /></div>
      <button className="mobile-menu" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <div className="breadcrumb"><span>FitKit</span><b>/</b><strong>{page}</strong></div>
      <div className="top-actions">
        <div className="search-box"><Icon name="search" size={17} /><input placeholder="Search" /></div>
        <button className="icon-btn"><Icon name="bell" size={19} /><i /></button>
        <div className="top-avatar">ST</div>
      </div>
    </header>
  )
}
