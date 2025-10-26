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

// Types
interface PostData {
  avatar: string
  name: string
  username: string
  content: string
  image: string | null
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
  if (!isOpen || !postData) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        
        <div className="modal-post">
          <div className="modal-post-header">
            <div className="modal-post-avatar">{postData.avatar}</div>
            <div className="modal-post-user-info">
              <strong>{postData.name}</strong>
              <span className="modal-post-username">@{postData.username}</span>
            </div>
          </div>
          
          <div className="modal-post-content">{postData.content}</div>
          
          {postData.image && (
            <div className="modal-post-image">
              <img src={postData.image} alt="Post" />
            </div>
          )}
          
          <div className="modal-post-footer">
            <button className="modal-post-action">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14m-7-7h14" />
              </svg>
              12
            </button>
            <button className="modal-post-action">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              5
            </button>
            <button className="modal-post-action">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              8
            </button>
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
      {data.image && (
        <div className="post-image">
          <img src={data.image} alt="Post" />
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

const INITIAL_NODES: Node[] = [
  {
    id: '1',
    type: 'postCard',
    position: { x: 100, y: 100 },
    data: {
      avatar: '👤',
      name: 'John Doe',
      username: 'johndoe',
      content: 'Just shipped a new feature! 🚀 The team worked incredibly hard on this one. #webdev #coding',
      image: null,
    },
  },
  {
    id: '2',
    type: 'postCard',
    position: { x: 500, y: 100 },
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
    position: { x: 100, y: 450 },
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
    position: { x: 500, y: 450 },
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
  const [currentPage, setCurrentPage] = useState<'home' | 'signup' | 'login' | 'profile'>('home')
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
        await fetch('/api/auth/logout', {
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

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token')
      const userId = localStorage.getItem('user_id')
      
      if (token && userId) {
        try {
          // Verify token is still valid by making a request to profile endpoint
          const response = await fetch('/api/auth/profile', {
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
            <button className="nav-icon-btn" title="Add">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
            </button>
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
      <div className="floating-logo">
        <img src="/lof@curio.png" alt="Curio Logo" className="logo" />
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
