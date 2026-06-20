require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const isMockMode = !TICKETMASTER_API_KEY || TICKETMASTER_API_KEY === 'dummy_key';

const mockEvents = [
    { id: '1', name: 'Electronic Music Festival', category: 'Music', venue: 'Pier 17', date: '2026-07-15', image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400', description: 'Deep bass and neon lights.' },
    { id: '2', name: 'Gourmet Food Expo', category: 'Food', venue: 'Javits Center', date: '2026-07-16', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', description: 'The finest cuisines.' },
    { id: '3', name: 'Tech Startup Conference', category: 'Business', venue: 'Navy Yard', date: '2026-07-17', image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400', description: 'Future of innovation.' }
];

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.get('/api/events/nearby', async (req, res) => {
    console.log('GET /api/events/nearby', req.query);

    if (isMockMode) {
        return res.json(mockEvents);
    }

    try {
        const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
            params: {
                apikey: TICKETMASTER_API_KEY,
                latlong: `${req.query.lat},${req.query.lon}`,
                radius: Math.round(req.query.radius / 1609), // meters to miles
                unit: 'miles',
                size: 20
            }
        });

        if (!response.data._embedded) return res.json([]);

        const events = response.data._embedded.events.map(e => ({
            id: e.id,
            name: e.name,
            category: e.classifications?.[0]?.segment?.name || 'Event',
            venue: e._embedded?.venues?.[0]?.name || 'Venue',
            date: e.dates?.start?.localDate,
            image: e.images?.[0]?.url,
            description: e.info || e.name
        }));
        res.json(events);
    } catch (error) {
        console.error('Ticketmaster Fetch Error:', error.message);
        res.json(mockEvents); // Fallback to mock on error
    }
});

app.get('/api/events/foryou', async (req, res) => {
    console.log('GET /api/events/foryou', req.query);

    if (isMockMode) {
        return res.json(mockEvents.slice().reverse());
    }

    // For demo purposes, we'll just fetch general events if no sophisticated ranking is implemented in demo_server
    try {
        const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
            params: {
                apikey: TICKETMASTER_API_KEY,
                size: 10
            }
        });
        const events = response.data._embedded?.events.map(e => ({
            id: e.id,
            name: e.name,
            category: e.classifications?.[0]?.segment?.name || 'Event',
            venue: e._embedded?.venues?.[0]?.name || 'Venue',
            date: e.dates?.start?.localDate,
            image: e.images?.[0]?.url,
            description: e.info || e.name
        })) || mockEvents;
        res.json(events);
    } catch (error) {
        res.json(mockEvents.slice().reverse());
    }
});

app.get('/api/events/:id', (req, res) => {
    const event = mockEvents.find(e => e.id === req.params.id) || mockEvents[0];
    res.json(event);
});

app.post('/api/signals', (req, res) => {
    console.log('POST /api/signals', req.body);
    res.status(202).send();
});

app.listen(8000, () => {
    console.log('Demo API running on port 8000');
});
