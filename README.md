# 🧩 Curio — The Graph Feed for Ideas

##LINK 
https://curio-lake-two.vercel.app/

Curio reimagines the social feed as a semantic graph, where posts connect through shared meaning instead of hashtags or opaque engagement algorithms.

## 🌟 Inspiration

Modern feeds feel like noise machines:

• Hashtags are spammed and inconsistent  
• Subreddits are fragmented and lack semantic cohesion  
• For-You-Pages serve “personalized randomness”  
• There’s no way to *see* how ideas connect online  

Curio flips the feed from a scroll to a map.

Every post becomes a node in a semantic knowledge graph.  
Posts link automatically via vector embeddings that detect conceptual similarity.

Curio helps people **explore** ideas instead of merely **consume** them.

Imagine hackathons, research communities or niche creators seeing how their posts fit into a bigger constellation of innovation.

## 🚀 MVP Scope

The MVP focuses on three core interactions:

1. **Natural language search**
   Returns conceptually relevant posts using semantic vector search.

2. **Graph-based results**
   Interactive visualization using force-directed layouts.

3. **Post creation + instant graph sync**
   New posts are embedded and connected in real time.

Users click a node to view content, then “Branch Out” to explore related ideas.

## 🧠 Example: Cal Hacks Campaign

Hackers submit a brief about their project.  
Curio builds a live graph of the entire hackathon’s creativity:

• Agents → automation tools → IDE integrations  
• AI design → collaboration plugins → multimodal UIs  

People discover teammates, shared interests and emergent themes.

## 🏗 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | **Next.js + React** + `react-force-graph` | Graph visualization and UI |
| Backend | **FastAPI** (or Flask alternative) | Embeddings + RAG search + REST |
| Database | **Supabase Postgres + pgvector** | Stores posts and embeddings |
| Embeddings | **OpenAI text-embedding-3-large** | Semantic encoding |
| Retrieval Engine | LangChain / pgvector similarity search | Graph expansion + relevance |
| Hosting | Vercel + Railway/Render | Quick deploy + serverless scaling |

## ✅ Success Criteria

• Graph retrieval feels instant and meaningful  
• Branch-out exploration keeps ideas flowing  
• Posting content dynamically reshapes the graph  
• UI feels intuitive and fun to explore meaning  

---

Curio transforms scattered posts into a connected map of ideas.  
Build once. Explore forever. ✨
