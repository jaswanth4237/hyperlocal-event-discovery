require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Typesense = require('typesense');
const setupDb = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const client = new Typesense.Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: process.env.TYPESENSE_PORT || 8108,
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 2,
});

const MOCK_EVENTS = [
    {
        id: 'e1',
        name: 'Electronic Music Festival',
        description: 'A night of immersive electronic beats in the heart of NYC.',
        category: 'Music',
        venue: 'Pier 17',
        location: [40.7061, -74.003],
        date: '2026-07-15',
        image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=400',
    },
    {
        id: 'e2',
        name: 'Gourmet Food Expo',
        description: 'Taste the best dishes from around the world.',
        category: 'Food',
        venue: 'Javits Center',
        location: [40.7589, -74.0017],
        date: '2026-07-16',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400',
    },
    {
        id: 'e3',
        name: 'Tech Startup Conference',
        description: 'Network with founders and investors.',
        category: 'Business',
        venue: 'Brooklyn Navy Yard',
        location: [40.6976, -73.9741],
        date: '2026-07-17',
        image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400',
    },
    {
        id: 'e4',
        name: 'Jazz in the Park',
        description: 'Relaxing jazz performances under the stars.',
        category: 'Music',
        venue: 'Central Park',
        location: [40.7850, -73.9682],
        date: '2026-07-20',
        image: 'https://images.unsplash.com/photo-1514525253361-b83f85df025c?auto=format&fit=crop&w=400',
    },
    {
        id: 'e5',
        name: 'Modern Art Workshop',
        description: 'Learn modern painting techniques.',
        category: 'Arts',
        venue: 'The Met',
        location: [40.7794, -73.9632],
        date: '2026-07-21',
        image: 'https://images.unsplash.com/photo-1460661419201-fd4cecea8f82?auto=format&fit=crop&w=400',
    }
];

const useMockData = !process.env.TICKETMASTER_API_KEY || process.env.TICKETMASTER_API_KEY === 'dummy_key';

let db;
setupDb().then((database) => {
    db = database;
    console.log('Signal database initialized.');
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Nearby events
app.get('/api/events/nearby', async (req, res) => {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon || !radius) {
        return res.status(400).json({ error: 'lat, lon, and radius are required' });
    }

    if (useMockData) {
        console.log('Serving mock events (nearby)');
        return res.json(MOCK_EVENTS);
    }

    try {
        const searchResults = await client.collections('events').documents().search({
            q: '*',
            query_by: 'name',
            filter_by: `location:(${lat}, ${lon}, ${radius}m)`,
            sort_by: `location(${lat}, ${lon}):asc`,
        });

        res.json(searchResults.hits.map(h => h.document));
    } catch (error) {
        console.error('Error fetching nearby events:', error);
        // Fallback to mock data on error if Typesense is not available
        res.json(MOCK_EVENTS);
    }
});

// Full-text search
app.get('/api/events/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Query parameter q is required' });
    }

    if (useMockData) {
        const filtered = MOCK_EVENTS.filter(e =>
            e.name.toLowerCase().includes(q.toLowerCase()) ||
            e.description.toLowerCase().includes(q.toLowerCase())
        );
        return res.json(filtered);
    }

    try {
        const searchResults = await client.collections('events').documents().search({
            q: q,
            query_by: 'name,description',
            num_typos: 2,
        });

        res.json(searchResults.hits.map(h => h.document));
    } catch (error) {
        console.error('Error searching events:', error);
        res.json(MOCK_EVENTS.filter(e => e.name.toLowerCase().includes(q.toLowerCase())));
    }
});

// Signals
app.post('/api/signals', async (req, res) => {
    const { userId, eventId, action, metadata } = req.body;

    if (!userId || !eventId || !action) {
        return res.status(400).json({ error: 'userId, eventId, and action are required' });
    }

    // Record signal asynchronously (background)
    const category = metadata?.category || 'Uncategorized';
    const dwellTimeSeconds = metadata?.dwellTimeSeconds || 0;

    // Filter low dwell time views as per requirements (>5s)
    if (action === 'view' && dwellTimeSeconds <= 5) {
        return res.status(202).send();
    }

    try {
        await db.run(
            'INSERT INTO signals (userId, eventId, action, category, dwellTimeSeconds) VALUES (?, ?, ?, ?, ?)',
            [userId, eventId, action, category, dwellTimeSeconds]
        );
        res.status(202).send();
    } catch (error) {
        console.error('Error saving signal:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Personalized "For You" feed
app.get('/api/events/foryou', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // 1. Fetch user signals
        const signals = await db.all(
            'SELECT category, action, timestamp FROM signals WHERE userId = ?',
            [userId]
        );

        // 2. Calculate category weights with time decay
        // weight = exp(-decay_rate * hours_since_event)
        const DECAY_RATE = 0.0041; // ~7 days half-life
        const actionMultipliers = {
            view: 1,
            save: 5,
            share: 3,
        };

        const categoryWeights = {};
        const now = new Date();

        signals.forEach((s) => {
            const signalTime = new Date(s.timestamp);
            const hoursSince = Math.abs(now - signalTime) / 36e5;
            const decayWeight = Math.exp(-DECAY_RATE * hoursSince);
            const actionWeight = actionMultipliers[s.action] || 1;

            const totalWeight = actionWeight * decayWeight;

            categoryWeights[s.category] = (categoryWeights[s.category] || 0) + totalWeight;
        });

        // 3. Construct Typesense query with boosts
        let searchOptions = {
            q: '*',
            query_by: 'name',
        };

        const sortedCategories = Object.entries(categoryWeights)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Take top 5 categories

        if (sortedCategories.length > 0) {
            // Use boost_by to influence the ranking based on category affinities
            const boostExpression = sortedCategories
                .map(([cat, weight]) => `category(${cat}: ${Math.min(Math.round(weight), 100)})`)
                .join(', ');

            searchOptions.boost_by = boostExpression;
        }

        if (useMockData) {
            return res.json(MOCK_EVENTS.slice().reverse());
        }

        const searchResults = await client.collections('events').documents().search(searchOptions);
        res.json(searchResults.hits.map(h => h.document));
    } catch (error) {
        console.error('Error generating personalized feed:', error);
        res.json(MOCK_EVENTS);
    }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
    if (useMockData) {
        const event = MOCK_EVENTS.find(e => e.id === req.params.id);
        return event ? res.json(event) : res.status(404).json({ error: 'Event not found' });
    }

    try {
        const event = await client.collections('events').documents(req.params.id).retrieve();
        res.json(event);
    } catch (error) {
        const event = MOCK_EVENTS.find(e => e.id === req.params.id);
        if (event) return res.json(event);
        res.status(404).json({ error: 'Event not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
});
