# Hyperlocal Event Discovery App

## Overview
A full-stack mobile application for discovering events nearby, featuring a personalized "For You" feed driven by implicit user signals and a time-decay ranking algorithm.

## Features
- **Geospatial Search**: Find events within a specific radius of your location.
- **Fuzzy Search**: Typo-tolerant event search powered by Typesense.
- **Personalized Feed**: Content-based filtering that learns your preferences (e.g., Music, Sports) and boosts them in your feed.
- **Time-Decay**: Newer interactions weighted more heavily than older ones.
- **High-Performance UI**: Smooth scrolling with Shopify's FlashList.

---

## Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Expo Go app on your mobile device (to preview the app)

### 2. Setup Environment
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Get a free API key from [Ticketmaster Developer Portal](https://developer.ticketmaster.com/) and add it to `.env`:
   `TICKETMASTER_API_KEY=your_key_here`

### 3. Run the Backend Stack
Start the search engine and API using Docker Compose:
```bash
docker-compose up --build
```
This will start:
- **API**: http://localhost:8000
- **Typesense**: http://localhost:8108

### 4. Seed the Data
Run the script to fetch events from Ticketmaster and index them:
```bash
cd scripts
npm install
node seed.js
```

### 5. Run the Mobile App
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code with your Expo Go app.

---

## Personalization Logic
The app uses **Implicit Content-Based Filtering**.
- Every time you view an event for more than 5 seconds, a `view` signal is sent.
- Clicking "Save" sends a `save` signal.
- The backend calculates a "preference score" per category using:
  $Weight = \sum (ActionMultiplier \times e^{-0.0041 \times \Delta t})$
- The "For You" tab re-ranks events using these scores to boost your favorite categories.

For a detailed comparison with Collaborative Filtering, see [docs/personalization_writeup.md](docs/personalization_writeup.md).
