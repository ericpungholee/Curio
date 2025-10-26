import './App.css'
import { useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Edge,
  type Connection,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import Signup from './Signup'
import Login from './Login'
import Profile from './Profile'
import CreatePost from './CreatePost'

// Types
interface PostData {
  id?: string
  avatar: string
  name: string
  username: string
  content: string
  image: string | null
  image_url?: string
  title?: string
  created_at?: string
  likes_count?: number
  is_liked?: boolean
  author_id?: string
  comments?: Comment[]
}

interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: {
    username: string
  }
  likes_count?: number
  is_liked?: boolean
}

interface PostCardNodeProps {
  data: PostData
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  postData: PostData | null
}

// Modal component for full card view
const PostModal = ({ isOpen, onClose, postData }: ModalProps) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [currentPost, setCurrentPost] = useState<PostData | null>(null)
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    if (isOpen && postData) {
      console.log('PostModal opened with postData:', postData)
      console.log('Image URL:', postData.image_url)
      console.log('Image:', postData.image)
      setCurrentPost(postData)
      setLikesCount(postData.likes_count || 0)
      setIsLiked(postData.is_liked || false)
      if (postData.id) {
        fetchComments(postData.id)
      }
    }
  }, [isOpen, postData])

  const fetchComments = async (postId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    setIsLoadingComments(true)
    try {
      const response = await fetch(`http://localhost:5000/api/post/post/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.post.comments || [])
        setLikesCount(data.post.likes_count || 0)
        setIsLiked(data.post.is_liked || false)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleLikePost = async () => {
    if (!currentPost?.id) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      alert('Please log in to like posts')
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/post/like-post/${currentPost.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.liked)
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1)
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleSubmitComment = async () => {
    if (!currentPost?.id || !newComment.trim()) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      alert('Please log in to comment')
      return
    }

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`http://localhost:5000/api/post/comment/${currentPost.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prev => [...prev, data.comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`http://localhost:5000/api/post/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleClose = () => {
    setComments([])
    setNewComment('')
    setCurrentPost(null)
    onClose()
  }

  if (!isOpen || !currentPost) return null

  return (
    <div className="post-detail-modal-overlay" onClick={handleClose}>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-detail-header">
          <h2 className="post-detail-title">{currentPost.title || currentPost.content.substring(0, 50)}</h2>
          <button 
            className="post-detail-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="post-detail-user-info">
          <div className="post-detail-avatar">{currentPost.avatar}</div>
          <div>
            <strong>{currentPost.name}</strong>
            <span className="post-detail-username">@{currentPost.username}</span>
          </div>
        </div>
        
        {(currentPost.image_url || currentPost.image) && (
          <div className="post-detail-image">
            <img 
              src={currentPost.image_url || currentPost.image || ''} 
              alt={currentPost.title || "Post"}
              loading="lazy"
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                width: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                console.error('Image failed to load:', currentPost.image_url || currentPost.image)
                e.currentTarget.style.display = 'none'
              }}
              onLoad={(e) => {
                const img = e.currentTarget
                console.log('Image loaded successfully')
                console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight)
                console.log('Displayed dimensions:', img.width, 'x', img.height)
                console.log('Image aspect ratio:', img.naturalWidth / img.naturalHeight)
              }}
            />
          </div>
        )}
        
        <div className="post-detail-content">
          <p className="post-detail-text">{currentPost.content}</p>
          <div className="post-detail-footer">
            <div className="post-detail-actions">
              <button
                className={`post-like-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLikePost}
                aria-label={isLiked ? 'Unlike post' : 'Like post'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{likesCount}</span>
              </button>
            </div>
            <div className="post-detail-meta">
              <span className="post-detail-date">
                {currentPost.created_at ? new Date(currentPost.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <h3 className="comments-title">Comments ({comments.length})</h3>
          
          {/* Add Comment Form */}
          <div className="add-comment-form">
            <textarea
              className="comment-input"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={isSubmittingComment}
            />
            <button
              className="comment-submit-btn"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </div>

          {/* Comments List */}
          <div className="comments-list">
            {isLoadingComments ? (
              <div className="comments-loading">
                <div className="loading-spinner"></div>
                <p>Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">
                      @{comment.profiles?.username || 'Unknown'}
                    </span>
                    <span className="comment-date">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <button
                      className="comment-delete-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      aria-label="Delete comment"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </div>
              ))
            ) : (
              <div className="no-comments">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom node component that looks like a Twitter post card
const PostCardNode = ({ data }: PostCardNodeProps) => {
  return (
    <div className="post-card-node">
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Left} />
      <Handle type="source" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Bottom} />
      
      <div className="post-header">
        <div className="post-avatar">{data.avatar}</div>
        <div className="post-user-info">
          <strong>{data.name}</strong>
          <span className="post-username">@{data.username}</span>
        </div>
      </div>
      <div className="post-content">{data.content}</div>
      {(data.image_url || data.image) && (
        <div className="post-image">
          <img src={data.image_url || data.image || ''} alt="Post" />
        </div>
      )}
      <div className="post-footer">
        <button className="post-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          12
        </button>
        <button className="post-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          5
        </button>
        <button className="post-action">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          8
        </button>
      </div>
    </div>
  )
}

// Constants
const NODE_TYPES = {
  postCard: PostCardNode,
} as const

// Center coordinates to center nodes on screen
const CENTER_X = 400
const CENTER_Y = 300

const INITIAL_NODES: Node[] = [
  {
    id: '1',
    type: 'postCard',
    position: { x: CENTER_X - 350, y: CENTER_Y - 200 },
    data: {
      avatar: '👤',
      name: 'John Doe',
      username: 'johndoe',
      content: 'Just shipped a new feature! 🚀 The team worked incredibly hard on this one. #webdev #coding',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
    },
  },
  {
    id: '2',
    type: 'postCard',
    position: { x: CENTER_X + 200, y: CENTER_Y - 200 },
    data: {
      avatar: '👨‍💻',
      name: 'Jane Smith',
      username: 'janesmith',
      content: 'Love working with React Flow! The customization options are amazing. What libraries are you using this week?',
      image: null,
    },
  },
  {
    id: '3',
    type: 'postCard',
    position: { x: CENTER_X - 350, y: CENTER_Y + 150 },
    data: {
      avatar: '🧑‍💼',
      name: 'Bob Wilson',
      username: 'bobwilson',
      content: 'Data visualization is the future! 📊 Creating beautiful graphs and interactive dashboards.',
      image: null,
    },
  },
  {
    id: '4',
    type: 'postCard',
    position: { x: CENTER_X + 200, y: CENTER_Y + 150 },
    data: {
      avatar: '👩‍🎨',
      name: 'Alice Johnson',
      username: 'alicej',
      content: 'Typography matters more than people think. Good design is invisible, bad design is everywhere! ✨',
      image: null,
    },
  },
]

const INITIAL_EDGES: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    style: { stroke: '#ffffff', strokeWidth: 4, opacity: 1 },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    style: { stroke: '#ffffff', strokeWidth: 4, opacity: 1 },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    style: { stroke: '#ffffff', strokeWidth: 4, opacity: 1 },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    style: { stroke: '#ffffff', strokeWidth: 4, opacity: 1 },
  },
]

function App() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null)
  const [currentPage, setCurrentPage] = useState<'home' | 'signup' | 'login' | 'profile' | 'create-post'>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleCardClick = useCallback((postData: PostData) => {
    setSelectedPost(postData)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedPost(null)
  }, [])

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'postCard') {
      handleCardClick(node.data as PostData)
    }
  }, [handleCardClick])

  const handleNavigateToSignup = useCallback(() => {
    setCurrentPage('signup')
  }, [])

  const handleNavigateToLogin = useCallback(() => {
    setCurrentPage('login')
  }, [])

  const handleBackToHome = useCallback(() => {
    setCurrentPage('home')
  }, [])

  const handleSignupSuccess = useCallback(() => {
    setCurrentPage('login')
  }, [])

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true)
    setCurrentPage('home')
  }, [])

  const handleLogout = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    
    if (token) {
      try {
        // Call backend logout endpoint
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.error('Logout API call failed:', error)
        // Continue with logout even if API call fails
      }
    }
    
    // Always clear local storage and update state
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    setIsLoggedIn(false)
    setCurrentPage('home')
  }, [])

  const handleNavigateToProfile = useCallback(() => {
    setCurrentPage('profile')
  }, [])

  const handleNavigateToCreatePost = useCallback(() => {
    setCurrentPage('create-post')
  }, [])

  const handlePostCreated = useCallback(() => {
    setCurrentPage('home')
    // TODO: Refresh posts or add new post to the graph
  }, [])

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token')
      const userId = localStorage.getItem('user_id')
      
      if (token && userId) {
        try {
          // Verify token is still valid by making a request to profile endpoint
          const response = await fetch('http://localhost:5000/api/auth/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            setIsLoggedIn(true)
          } else if (response.status === 401) {
            // Only clear storage on 401 (Unauthorized)
            localStorage.removeItem('access_token')
            localStorage.removeItem('user_id')
            setIsLoggedIn(false)
          } else {
            // Other errors (network, server errors), keep user logged in
            setIsLoggedIn(true)
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          // Network error, keep user logged in to avoid signouts
          setIsLoggedIn(true)
        }
      } else {
        setIsLoggedIn(false)
      }
      setIsLoading(false)
    }

    checkAuthStatus()
  }, [])

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (currentPage === 'signup') {
    return <Signup onBackToHome={handleBackToHome} onSignupSuccess={handleSignupSuccess} onNavigateToLogin={handleNavigateToLogin} />
  }

  if (currentPage === 'login') {
    return <Login onBackToHome={handleBackToHome} onLogin={handleLogin} onNavigateToSignup={handleNavigateToSignup} />
  }

  if (currentPage === 'profile') {
    return <Profile onBackToHome={handleBackToHome} onLogout={handleLogout} />
  }

  if (currentPage === 'create-post') {
    return <CreatePost onBackToHome={handleBackToHome} onPostCreated={handlePostCreated} />
  }

  return (
    <div className="app">
      <header className="header">
        <nav className="nav">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
            />
            <div className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          <div className="nav-links">
            {isLoggedIn && (
              <button className="nav-icon-btn" title="Create Post" onClick={handleNavigateToCreatePost}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14m-7-7h14"/>
                </svg>
              </button>
            )}
            <button className="nav-icon-btn" title="Profile" onClick={handleNavigateToProfile}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="3"/>
              </svg>
            </button>
            {!isLoggedIn && (
              <button className="signup-nav-btn" onClick={handleNavigateToSignup}>
                Sign Up
              </button>
            )}
            {isLoggedIn && (
              <button className="signup-nav-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </nav>
      </header>
      
      {/* Floating Logo */}
      <div className="floating-logo" onClick={handleBackToHome}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>
      
      <div className="graph-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Background gap={20} size={2} color="rgba(255, 255, 255, 0.2)" />
        </ReactFlow>
      </div>
      
      <PostModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        postData={selectedPost} 
      />
    </div>
  )
}

export default App
