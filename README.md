# ClosetAI

ClosetAI is a modern AI-powered fashion styling platform that helps users digitize their wardrobe, generate outfits from clothes they already own, recreate Pinterest-inspired looks, and receive AI-assisted shopping recommendations with price comparison.

## Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion, Zustand
- Backend: Node.js, Express
- Database: MongoDB with Mongoose schemas
- Auth: JWT-ready endpoints with Google auth placeholder
- AI placeholders: outfit generation, wardrobe tagging, Pinterest matching, shopping recommendations

## Project Structure

```text
.
├── apps
│   ├── server
│   │   └── src
│   │       ├── config
│   │       ├── controllers
│   │       ├── data
│   │       ├── middleware
│   │       ├── models
│   │       ├── routes
│   │       ├── services
│   │       └── utils
│   └── web
│       ├── app
│       ├── components
│       ├── lib
│       ├── public
│       └── store
├── .env.example
└── package.json
```

## Features Included

- Premium landing page with animated hero, feature grid, carousel, testimonials, and footer
- Auth flows for sign up, login, forgot password, and Google sign-in placeholder
- Digital wardrobe interface with search, favorites, upload/scan prompts, and item styling actions
- AI outfit generator with occasion, weather, anchor-item, and chat stylist interactions
- Pinterest-inspired outfit recreation studio with similarity matching and missing-piece suggestions
- AI shopping assistant with wardrobe gap notes and cross-store price comparison
- Personalized AI style profile with insights and visual analytics
- Weather-based styling endpoint placeholder
- Saved lookbooks, onboarding tutorial, notifications, and mobile bottom navigation
- Style-around-item panels with casual, elegant, office, and party alternatives
- Outfit rating, social sharing, saved image, and lookbook export controls
- Wardrobe analysis for clothing types, colors, patterns, aesthetics, gaps, and usage insights
- Fashion trend insights and seasonal recommendations matched to the user's style DNA
- Admin dashboard for analytics, moderation, and recommendation monitoring

## Environment Variables

Copy the root example file and update it:

```bash
cp .env.example .env
```

Required keys:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
MONGODB_URI=mongodb://127.0.0.1:27017/closetai
JWT_SECRET=replace-with-a-secure-secret
GOOGLE_CLIENT_SECRET=your-google-client-secret
WEATHER_API_KEY=your-weather-api-key
```

## Getting Started

Install dependencies:

```bash
npm install --cache .npm-cache
```

Run the frontend and backend together:

```bash
npm run dev
```

Frontend:

- [http://localhost:3000](http://localhost:3000)

Backend:

- [http://localhost:4000](http://localhost:4000)
- [http://localhost:4000/api/health](http://localhost:4000/api/health)

## Useful Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run seed
```

## API Overview

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/google`

Wardrobe:

- `GET /api/wardrobe`
- `POST /api/wardrobe`
- `POST /api/wardrobe/analyze`

Outfits:

- `GET /api/outfits`
- `POST /api/outfits/generate`
- `POST /api/outfits/style-item`
- `GET /api/outfits/weather?city=Mumbai`

AI stylist:

- `POST /api/stylist/chat`
- `POST /api/stylist/rate-outfit`
- `POST /api/stylist/share-outfit`

Pinterest:

- `POST /api/pinterest/analyze`

Shopping:

- `GET /api/shopping/recommendations`
- `GET /api/shopping/compare?product=Neutral%20Leather%20Sneakers`

Insights:

- `GET /api/insights/wardrobe`
- `GET /api/insights/trends`
- `GET /api/insights/notifications`

Profile and Admin:

- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/admin/overview`

## Notes

- The UI is intentionally built as a premium, production-style product scaffold with reusable components and responsive layouts.
- AI, computer vision, Pinterest integration, Google OAuth, and live price aggregation are stubbed with clean placeholders so you can wire real providers next without refactoring the app structure.
- The API continues to boot even if MongoDB is unavailable, which makes local UI development easier while wiring external services.

## Validation

Verified locally:

```bash
npm run typecheck
npm run build
```
