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
import { API_BASE_URL } from './config'

// Types
interface PostData {
  id?: string
  avatar?: string
  name?: string
  username?: string
  email?: string
  content: string
  image?: string | null
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
  onBackToHome?: () => void
}

interface EdgeOverlayProps {
  isOpen: boolean
  onClose: () => void
  relationship: string
  similarity: number
  post1Id?: string
  post2Id?: string
  onBackToHome?: () => void
}

// Edge Overlay Component
const EdgeOverlay = ({ isOpen, onClose, relationship, similarity, post1Id, post2Id, onBackToHome }: EdgeOverlayProps) => {
  const [relationshipDetails, setRelationshipDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && post1Id && post2Id) {
      fetchRelationshipDetails()
    }
  }, [isOpen, post1Id, post2Id])

  const fetchRelationshipDetails = async () => {
    setIsLoading(true)
    const token = localStorage.getItem('access_token')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/graph/relationship-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          post1_id: post1Id,
          post2_id: post2Id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setRelationshipDetails(data)
      }
    } catch (error) {
      console.error('Error fetching relationship details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCurioClick = () => {
    onClose() // Just close the overlay, don't navigate
  }

  if (!isOpen) return null

  return (
    <div className="post-detail-modal-overlay" onClick={onClose}>
      {/* Floating Logo - close overlay when clicked */}
      <div className="floating-logo" onClick={handleCurioClick}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="post-detail-header">
          <h2 className="post-detail-title">Relationship Analysis</h2>
          <button 
            className="post-detail-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {isLoading ? (
          <div className="comments-loading">
            <div className="loading-spinner"></div>
            <p>AI is analyzing the relationship...</p>
          </div>
        ) : relationshipDetails ? (
          <>
            <div className="post-detail-content">
              <div className="post-detail-footer" style={{ marginBottom: '20px' }}>
                <div className="similarity-badge">
                  Similarity Score: {(similarity * 100).toFixed(1)}%
                </div>
              </div>

              {relationshipDetails.analysis && (
                                 <div className="relationship-section" style={{ 
                   background: 'rgba(255, 255, 255, 0.05)', 
                   padding: '20px', 
                   borderRadius: '12px',
                   marginBottom: '20px'
                 }}>
                   <h3 className="relationship-subtitle" style={{ marginBottom: '15px', color: '#fff' }}>
                     AI Analysis
                   </h3>
                  <div 
                    className="relationship-text" 
                    style={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: '1.8',
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    {relationshipDetails.analysis}
                  </div>
                </div>
              )}
              
              <div className="relationship-posts-preview">
                <div className="relationship-post-card">
                  <div className="relationship-post-header">
                    <div className="relationship-post-avatar">
                      {relationshipDetails.post1.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="relationship-post-info">
                      <strong>{relationshipDetails.post1.username || 'Unknown'}</strong>
                      <span style={{ fontSize: '12px', opacity: 0.7, marginLeft: '8px' }}>({relationshipDetails.post1.label || 'Post 1'})</span>
                    </div>
                  </div>
                  <h4 className="relationship-post-title">{relationshipDetails.post1.title || 'No title'}</h4>
                  <p className="relationship-post-content-preview">{relationshipDetails.post1.content_preview}</p>
                </div>
                
                <div className="relationship-posts-connector">→</div>
                
                <div className="relationship-post-card">
                  <div className="relationship-post-header">
                    <div className="relationship-post-avatar">
                      {relationshipDetails.post2.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="relationship-post-info">
                      <strong>{relationshipDetails.post2.username || 'Unknown'}</strong>
                      <span style={{ fontSize: '12px', opacity: 0.7, marginLeft: '8px' }}>({relationshipDetails.post2.label || 'Post 2'})</span>
                    </div>
                  </div>
                  <h4 className="relationship-post-title">{relationshipDetails.post2.title || 'No title'}</h4>
                  <p className="relationship-post-content-preview">{relationshipDetails.post2.content_preview}</p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// Modal component for full card view
const PostModal = ({ isOpen, onClose, postData, onBackToHome }: ModalProps) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [currentPost, setCurrentPost] = useState<PostData | null>(null)
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    if (isOpen && postData) {
      setCurrentPost(postData)
      setLikesCount(postData.likes_count || 0)
      setIsLiked(postData.is_liked || false)
      if (postData.id) {
        fetchComments(postData.id)
      }
    }
  }, [isOpen, postData])

  const fetchComments = async (postId: string) => {
    // Comments are now visible to everyone, including non-logged-in users
    const token = localStorage.getItem('access_token')

    setIsLoadingComments(true)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      // Only add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/post/post/${postId}`, {
        method: 'GET',
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.post.comments || [])
        setLikesCount(data.post.likes_count || 0)
        setIsLiked(data.post.is_liked || false)
        
        // Update currentPost with profile data if available
        if (data.post.profiles) {
          setCurrentPost(prev => prev ? {
            ...prev,
            username: data.post.profiles.username || prev.username,
            email: data.post.profiles.email || prev.email,
            avatar: data.post.profiles.profile_pic_url || prev.avatar
          } : prev)
        }
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
      const response = await fetch(`${API_BASE_URL}/api/post/like-post/${currentPost.id}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/post/comment/${currentPost.id}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/post/comment/${commentId}`, {
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

  const getAvatar = (username?: string, avatar?: string) => {
    if (avatar && avatar.startsWith('http')) {
      return <img src={avatar} alt={username || 'User'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
    }
    if (!username) return '👤'
    return username.charAt(0).toUpperCase()
  }

  const handleCurioClick = () => {
    handleClose() // Just close the modal, don't navigate
  }

  return (
    <div className="post-detail-modal-overlay" onClick={handleClose}>
      {/* Floating Logo - close modal when clicked */}
      <div className="floating-logo" onClick={handleCurioClick}>
        <img src="/curio.png" alt="Curio Logo" className="logo" />
      </div>
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
          <div className="post-detail-avatar">{getAvatar(currentPost.username, currentPost.avatar)}</div>
          <div>
            <strong>{currentPost.username || 'User'}</strong>
            {currentPost.email && <span className="post-detail-username">{currentPost.email}</span>}
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
                e.currentTarget.style.display = 'none'
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

        <div className="comments-section">
          <h3 className="comments-title">Comments ({comments.length})</h3>
          
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
  const isQueryNode = data.id === 'query_node' || data.id === 'query-root' || data.is_query
  const nodeTitle = data.title || data.content?.substring(0, 50) || 'Post'
  
  // Truncate content to max 150 characters for display
  const truncatedContent = data.content?.length > 150 
    ? data.content.substring(0, 150) + '...' 
    : data.content

  const renderAvatar = () => {
    if (isQueryNode) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      )
    }
    if (data.avatar && data.avatar.startsWith('http')) {
      return <img src={data.avatar} alt={data.username || 'User'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
    }
    return data.username?.charAt(0).toUpperCase() || '👤'
  }

  return (
    <div className="post-card-node">
      <Handle type="target" position={Position.Top} id="a" />
      <Handle type="target" position={Position.Left} id="b" />
      <Handle type="source" position={Position.Right} id="c" />
      <Handle type="source" position={Position.Bottom} id="d" />
      
      <div className="post-header">
        <div className="post-avatar">
          {renderAvatar()}
        </div>
        <div className="post-user-info">
          <strong>{data.username || 'User'}</strong>
        </div>
      </div>
      {isQueryNode ? (
        <div className="post-title">{nodeTitle}</div>
      ) : (
        <>
          {data.title && <div className="post-title">{data.title}</div>}
          <div className="post-content">{truncatedContent}</div>
        </>
      )}
      {!isQueryNode && (data.image_url || data.image) && (
        <div className="post-image">
          <img src={data.image_url || data.image || ''} alt="Post" />
        </div>
      )}
      {!isQueryNode && (
        <div className="post-footer">
          <button className="post-action">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {data.likes_count || 0}
          </button>
        </div>
      )}
    </div>
  )
}

// Constants
const NODE_TYPES = {
  postCard: PostCardNode,
} as const

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null)
  const [currentPage, setCurrentPage] = useState<'home' | 'signup' | 'login' | 'profile' | 'create-post'>('home')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [edgeOverlay, setEdgeOverlay] = useState({ 
    isOpen: false, 
    relationship: '', 
    similarity: 0,
    post1Id: '',
    post2Id: ''
  })

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
    // Don't allow clicking on query nodes
    if (node.id === 'query_node' || node.id === 'query-root') {
      return
    }
    
    if (node.type === 'postCard') {
      handleCardClick(node.data as PostData)
    }
  }, [handleCardClick])

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    // Don't show relationship details for edges connected to query node
    if (edge.source === 'query_node' || edge.target === 'query_node') {
      return
    }
    
    const edgeData = edge.data as { relationship: string, similarity: number }
    if (edgeData) {
      setEdgeOverlay({
        isOpen: true,
        relationship: edgeData.relationship,
        similarity: edgeData.similarity,
        post1Id: edge.source,
        post2Id: edge.target
      })
    }
  }, [])

  const handleCloseEdgeOverlay = useCallback(() => {
    setEdgeOverlay({ 
      isOpen: false, 
      relationship: '', 
      similarity: 0,
      post1Id: '',
      post2Id: ''
    })
  }, [])

  const handleNavigateToSignup = useCallback(() => {
    setCurrentPage('signup')
  }, [])

  const handleNavigateToLogin = useCallback(() => {
    setCurrentPage('login')
  }, [])

  const handleBackToHome = useCallback(() => {
    setCurrentPage('home')
    setNodes([])
    setEdges([])
    setSearchQuery('')
  }, [setNodes, setEdges])

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
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }
    
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
    loadGraphData()
  }, [])

  const loadGraphData = useCallback(async (query?: string) => {
    const token = localStorage.getItem('access_token')
    
    try {
      // Only search if query is provided
      if (!query || !query.trim()) {
        // Clear the graph when no search
        setNodes([])
        setEdges([])
        return
      }
      
      // Perform semantic search
      setIsSearching(true)
      const response = await fetch(`${API_BASE_URL}/api/graph/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
                     body: JSON.stringify({ 
             query, 
             limit: 50, 
             threshold: 0.25,  // Low threshold to allow typos and handle semantic variations
             edge_threshold: 0.40  // Lower threshold for more connections
           })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Check if there are no results
        if (data.posts.length === 0) {
          setNodes([])
          setEdges([])
          return
        }
        
        // Separate query node from posts
        const queryNode = data.posts.find((post: any) => post.id === 'query_node' || post.is_query)
        const actualPosts = data.posts.filter((post: any) => post.id !== 'query_node' && !post.is_query)
        
        // Create nodes from posts with force-directed layout
        const numPosts = actualPosts.length
        const graphNodes: Node[] = actualPosts.map((post: any, index: number) => {
          const profiles = post.profiles || {}
          
          // Force-directed layout with some randomness
          const angle = (index / numPosts) * 2 * Math.PI
          const radius = 300 + Math.random() * 200
          const x = Math.cos(angle) * radius + 400 + Math.random() * 100
          const y = Math.sin(angle) * radius + 300 + Math.random() * 100
          
          return {
            id: post.id,
            type: 'postCard',
            position: { x, y },
            data: {
              id: post.id,
              username: profiles.username || 'User',
              email: profiles.email,
              avatar: profiles.profile_pic_url,
              content: post.content,
              image_url: post.image_url,
              title: post.title,
              created_at: post.created_at,
              likes_count: post.likes_count || 0,
              is_liked: post.is_liked || false,
              author_id: post.author_id
            }
          }
        })
        
        // Add query node at the center if it exists
        if (queryNode) {
          const queryNodeElement: Node = {
            id: queryNode.id,
            type: 'postCard',
            position: { x: 400, y: 100 },
            data: {
              id: queryNode.id,
              username: 'Query',
              title: queryNode.title,
              content: queryNode.content,
              likes_count: 0,
              is_liked: false
            }
          }
          graphNodes.unshift(queryNodeElement)
        }
        
        // Create edges with relationship data
        const graphEdges: Edge[] = data.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
            style: { 
            stroke: '#ffffff', 
            strokeWidth: edge.source === 'query-root' ? 3 : Math.max(2, edge.similarity * 4), 
            opacity: Math.max(0.5, edge.similarity)
          },
          data: {
            relationship: edge.relationship,
            similarity: edge.similarity
          }
        }))
        
        setNodes(graphNodes)
        setEdges(graphEdges)
      }
    } catch (error) {
      console.error('Error loading graph data:', error)
    } finally {
      setIsSearching(false)
    }
  }, [setNodes, setEdges])

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      loadGraphData(searchQuery)
    }
  }, [searchQuery, loadGraphData])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setNodes([])
    setEdges([])
    loadGraphData()
  }, [loadGraphData, setNodes, setEdges])

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token')
      const userId = localStorage.getItem('user_id')
      
      if (token && userId) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            setIsLoggedIn(true)
          } else if (response.status === 401) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('user_id')
            setIsLoggedIn(false)
          } else {
            setIsLoggedIn(true)
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          setIsLoggedIn(true)
        }
      } else {
        setIsLoggedIn(false)
      }
      setIsLoading(false)
    }

    checkAuthStatus()
  }, [])

  // Load graph data on mount - don't auto-load, wait for search
  useEffect(() => {
    // Don't auto-load all posts, only show results when searching
    if (currentPage === 'home') {
      setNodes([])
      setEdges([])
    }
  }, [currentPage])

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
              placeholder="Search posts semantically..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <button 
              className="search-button" 
              onClick={handleSearch} 
              disabled={isSearching}
              title={isSearching ? 'Searching...' : 'Search'}
            >
              {isSearching ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>
      
      <div className="nav-buttons-top-right">
        {isLoggedIn && (
          <button className="nav-icon-btn" title="Create Post" onClick={handleNavigateToCreatePost}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
          </button>
        )}
        {isLoggedIn && (
          <button className="nav-icon-btn" title="Profile" onClick={handleNavigateToProfile}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="3"/>
            </svg>
          </button>
        )}
        {!isLoggedIn ? (
          <button className="nav-icon-btn" title="Sign Up" onClick={handleNavigateToSignup}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
            </svg>
          </button>
        ) : (
          <button className="nav-icon-btn" title="Logout" onClick={handleLogout}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        )}
      </div>
      
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
          onEdgeClick={onEdgeClick}
          nodeTypes={NODE_TYPES}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Background gap={20} size={2} color="rgba(255, 255, 255, 0.2)" />
        </ReactFlow>
      </div>
      
      <PostModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        postData={selectedPost}
        onBackToHome={handleBackToHome}
      />

      <EdgeOverlay
        isOpen={edgeOverlay.isOpen}
        onClose={handleCloseEdgeOverlay}
        relationship={edgeOverlay.relationship}
        similarity={edgeOverlay.similarity}
        post1Id={edgeOverlay.post1Id}
        post2Id={edgeOverlay.post2Id}
        onBackToHome={handleBackToHome}
      />
    </div>
  )
}

export default App
