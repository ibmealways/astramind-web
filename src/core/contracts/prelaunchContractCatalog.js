export const PRELAUNCH_CONTRACTS = Object.freeze([
  { id:"identity", name:"Identity & Access", path:"/login", api:"/api/auth", capability:"identity.manage", authority:"identity", repository:"authRoutes", persistence:"users", featureFlag:null, providers:[] },
  { id:"conversation", name:"AstraMind Chat", path:"/chat", api:"/api/chat", capability:"conversation.execute", authority:"conversation", repository:"conversation-memory", persistence:"conversations", featureFlag:"memorySystem", providers:["openai"] },
  { id:"memory", name:"Persistent Memory", path:"/chat", api:"/api/chat", capability:"memory.manage", authority:"memory", repository:"conversation-memory", persistence:"conversation_memory", featureFlag:"memorySystem", providers:["openai"] },
  { id:"research", name:"Research Workspace", path:"/research", api:"/api/agent-workflow/research-summary", capability:"research.execute", authority:"research", repository:"research-os", persistence:"research_sources", featureFlag:null, providers:["openai","newsapi"] },
  { id:"mission-control", name:"Mission Control", path:"/control-center", api:"/api/workflows/run", capability:"mission.orchestrate", authority:"mission", repository:"mission-runtime", persistence:"missions", featureFlag:null, providers:["openai"] },
  { id:"creator", name:"Creator Identity", path:"/setup", api:"/api/creator-brain/profile", capability:"creator.manage", authority:"creator", repository:"creator-brain", persistence:"creator_profiles", featureFlag:"creatorSetup", providers:[] },
  { id:"finance", name:"Finance Hub", path:"/finance", api:"/api/finance/portfolio", capability:"finance.plan", authority:"finance", repository:"finance-ledger", persistence:"browser+sqlite", featureFlag:"financeHub", providers:["openai"] },
  { id:"journey", name:"Trip Planner", path:"/finance/income", api:null, capability:"journey.plan", authority:"finance", repository:"trip-planner-engine", persistence:"browser", featureFlag:"financeIncome", providers:[] },
  { id:"markets", name:"Pro Markets", path:"/finance/expenses", api:"/api/tradepilot/market-snapshot", capability:"markets.research", authority:"finance", repository:"market-intelligence", persistence:"browser", featureFlag:"financeExpenses", providers:["alpha-vantage","coingecko"] },
  { id:"wealth", name:"Wealth + Retirement Navigator", path:"/finance/savings", api:null, capability:"wealth.plan", authority:"finance", repository:"wealth-navigator-engine", persistence:"browser", featureFlag:"financeSavings", providers:[] },
  { id:"creator-studio", name:"Creator Studio", path:"/content", api:"/api/content/generate", capability:"content.create", authority:"content", repository:"content-pipeline", persistence:"content_projects", featureFlag:"contentCreator", providers:["openai"] },
  { id:"image", name:"Image Studio", path:"/content/image", api:"/api/ai-image/scene-visuals", capability:"image.generate", authority:"content", repository:"image-pipeline", persistence:"renders", featureFlag:"contentImage", providers:["openai"] },
  { id:"video", name:"Video Studio", path:"/content/video", api:"/api/cinematic-video/render", capability:"video.render", authority:"content", repository:"cinematic-video-pipeline", persistence:"server-renders", featureFlag:"contentVideo", providers:["openai","runway","ffmpeg","elevenlabs"] },
  { id:"audio", name:"Audio & Music Studio", path:"/content/audio", api:"/api/audio-studio/sessions", capability:"audio.compose", authority:"content", repository:"audio-composition-engine", persistence:"audio_sessions", featureFlag:"contentAudio", providers:["astramind-native","openai","elevenlabs"] },
  { id:"lyrics", name:"Lyric Architect", path:"/content/audio", api:"/api/audio-studio/lyrics/generate", capability:"lyrics.generate", authority:"content", repository:"lyrics-generation-service", persistence:"audio_sessions", featureFlag:"contentAudio", providers:["openai"] },
  { id:"script", name:"Script Writer", path:"/content/script", api:"/api/content/generate", capability:"script.write", authority:"content", repository:"writing-engine", persistence:"content_projects", featureFlag:"contentScript", providers:["openai"] },
  { id:"book", name:"Book Writer", path:"/content/book", api:"/api/book-project/create", capability:"book.write", authority:"content", repository:"book-writer-engine", persistence:"book_projects", featureFlag:"contentBook", providers:["openai"] },
  { id:"billing", name:"Subscription OS", path:"/pricing", api:"/api/billing", capability:"subscription.manage", authority:"subscription", repository:"subscription-store", persistence:"subscriptions+credit_ledger", featureFlag:"subscriptionOS", providers:["stripe"] },
  { id:"operations", name:"Operator Dashboard", path:"/operator-dashboard", api:"/api/platform/summary", capability:"platform.observe", authority:"platform", repository:"platform-analytics", persistence:"platform-core", featureFlag:null, providers:[] },
]);

export const PRELAUNCH_PROVIDERS = Object.freeze([
  { id:"openai", name:"OpenAI Intelligence", env:["OPENAI_API_KEY"], required:true },
  { id:"runway", name:"Runway Video", env:["RUNWAY_API_KEY"], required:false, requiredFor:["promotional-video"] },
  { id:"elevenlabs", name:"ElevenLabs Voice", env:["ELEVENLABS_API_KEY"], required:false, requiredFor:["voiceover"] },
  { id:"alpha-vantage", name:"Alpha Vantage Markets", env:["ALPHA_VANTAGE_KEY"], required:false, requiredFor:["live-markets"] },
  { id:"coingecko", name:"CoinGecko Markets", env:[], required:false },
  { id:"newsapi", name:"NewsAPI Research", env:["NEWS_API_KEY"], required:false, requiredFor:["live-news"] },
  { id:"stripe", name:"Stripe Billing", env:["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"], required:false, requiredFor:["subscriptions"] },
  { id:"ffmpeg", name:"FFmpeg Assembly", env:[], required:false, requiredFor:["promotional-video"] },
]);

export function contractCapabilities(){return PRELAUNCH_CONTRACTS.map((contract)=>({id:contract.capability,name:contract.name,version:"1.0.0",description:`${contract.name} contract capability`,scope:"contract",authority:contract.authority,action:contract.capability.split(".").slice(1).join(".")||"run",permissions:[],status:"active"}));}
