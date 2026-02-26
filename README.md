# BodyLang - AI Body Language & Face Reading Analyzer

AI-powered body language, face reading (โหงวเฮ้ง), palm reading (หัตถศาสตร์), and numerology analyzer using Google Gemini AI.

## Features

- **Face Reading (โหงวเฮ้ง)** - Chinese physiognomy analysis from uploaded photos. Analyzes facial features (eyes, nose, mouth, forehead, chin) based on ancient Chinese 五官 Mien Shiang principles
- **Palm Reading (หัตถศาสตร์)** - Comprehensive palm analysis covering major lines (Heart, Head, Life, Fate, Sun, Health, Marriage), mounts, finger shapes, and special markings. References Cheiro, William Benham, Samudrik Shastra, and Thai palmistry traditions
- **Numerology (เลขศาสตร์)** - Life Path Number and Name Number calculation using both Cheiro's Chaldean system and Thai numerology. Deterministic server-side computation for accuracy
- **Follow-up Chat** - Ask follow-up questions about your analysis results
- **PDF Report Export** - Download detailed analysis as a PDF report
- **Analysis History** - Save and revisit past readings (localStorage)
- **Multi-user Sessions** - Session-based context for concurrent users

## Tech Stack

- **Backend:** Node.js, Express, express-session
- **AI:** Google Gemini API (`@google/generative-ai`)
- **Image Processing:** Sharp
- **Frontend:** Vanilla HTML/CSS/JS with responsive dark theme
- **PDF:** jsPDF + html2canvas

## Quick Start

### Prerequisites

- Node.js >= 18
- [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/nuiel9/Bodylang.git
cd Bodylang
npm install
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `SESSION_SECRET` | Recommended | Session encryption key (auto-generated if missing) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for secure cookies |

## Deployment

Supports Vercel, Docker, Hostinger VPS, and any Node.js hosting. See [DEPLOY.md](DEPLOY.md) for detailed instructions.

```bash
# Docker
docker build -t bodylang .
docker run -d -p 3000:3000 -e GEMINI_API_KEY=your-key bodylang

# Vercel
vercel --prod

# PM2
npm run pm2:start
```

## Project Structure

```
Bodylang/
  server.js          # Express server, AI prompts, API endpoints
  public/
    index.html       # Main HTML page
    app.js           # Frontend logic, PDF export
    style.css        # Responsive dark theme styles
  uploads/           # Temporary image uploads
  .env.example       # Environment variable template
  Dockerfile         # Docker support
  vercel.json        # Vercel configuration
  ecosystem.config.js # PM2 configuration
  DEPLOY.md          # Deployment guide
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyze uploaded image (face or palm mode) |
| `POST` | `/api/chat` | Follow-up questions about analysis |
| `POST` | `/api/recommend` | Get personalized recommendations |

## References

- **Cheiro** - "Palmistry for All", "Language of the Hand"
- **William Benham** - "The Laws of Scientific Hand Reading"
- **Samudrik Shastra** - Indian classical palm reading
- **Thai หัตถศาสตร์** - Thai palmistry traditions with Buddhist karma/merit context
- **ดร.วิชิต สุรพนานนท์ชัย** - Thai Chinese physiognomy reference

## License

MIT
