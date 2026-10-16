import React from 'react';
import '../styles/skeleton.css';

export default function SkeletonLoader({ type = 'page', rows = 5 }) {
  const row = <div className="skeleton-row"><span className="skeleton-box skeleton-avatar" /><div className="skeleton-lines"><span className="skeleton-box skeleton-line" /><span className="skeleton-box skeleton-line short" /></div></div>;
  const content = <><div className="skeleton-heading"><span className="skeleton-box skeleton-title" /><span className="skeleton-box skeleton-line short" /></div>
    {type === 'chat' ? <div className="skeleton-chat">{[0,1,2,3].map(i => <span key={i} className={`skeleton-box skeleton-bubble ${i % 2 ? 'outgoing' : ''}`} />)}</div>
    : type === 'table' || type === 'list' ? <div className="skeleton-panel">{Array.from({length:rows},(_,i)=><React.Fragment key={i}>{row}</React.Fragment>)}</div>
    : <><div className="skeleton-cards">{[0,1,2].map(i => <div className="skeleton-panel" key={i}><span className="skeleton-box skeleton-line" /><span className="skeleton-box skeleton-number" /><span className="skeleton-box skeleton-line short" /></div>)}</div><div className="skeleton-panel">{row}{row}</div></>}
  </>;
  if(type === 'card') return <div className="skeleton-panel" role="status" aria-label="Loading content">{row}</div>;
  return <div className={`app-skeleton ${type === 'page' ? 'skeleton-page' : ''}`} role="status" aria-label="Loading content" aria-busy="true">
    {type === 'page' && <><div className="skeleton-mobile-header"><span className="skeleton-box skeleton-avatar"/><span className="skeleton-box skeleton-line"/></div><aside className="skeleton-sidebar"><span className="skeleton-box skeleton-title"/>{Array.from({length:6},(_,i)=><span key={i} className="skeleton-box skeleton-line"/>)}</aside></>}
    <div className="skeleton-content">{content}</div>
  </div>;
}
