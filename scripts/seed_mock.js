const Typesense = require('typesense');

const client = new Typesense.Client({
    nodes: [
        {
            host: 'localhost',
            port: 8108,
            protocol: 'http',
        },
    ],
    apiKey: 'xyz',
    connectionTimeoutSeconds: 2,
});

const schema = {
    name: 'events',
    fields: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', optional: true },
        { name: 'category', type: 'string', facet: true },
        { name: 'venue', type: 'string' },
        { name: 'location', type: 'geopoint' },
        { name: 'date', type: 'string' },
        { name: 'image', type: 'string', optional: true },
    ],
};

const mockEvents = [
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

async function run() {
    try {
        try { await client.collections('events').delete(); } catch (e) { }
        await client.collections().create(schema);
        console.log('Schema created.');
        await client.collections('events').documents().import(mockEvents);
        console.log('Seeded 5 mock events.');
    } catch (error) {
        console.error(error);
    }
}

run();
