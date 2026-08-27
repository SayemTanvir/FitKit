import { feed } from '../data'

export function FeedCard() {
  return <div className="feed-list">{feed.map(post => <article className="feed-card" key={post.id}>
    <div className="feed-avatar">{post.initials}</div>
    <div className="feed-content"><div className="feed-top"><strong>{post.name}</strong><span>{post.time}</span></div><p>{post.text}</p><div className="feed-actions"><button>♡ {post.likes}</button><button>{post.reaction} React</button><button>Comment</button></div></div>
  </article>)}</div>
}
