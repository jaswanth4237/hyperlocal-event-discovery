require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const Typesense = require('typesense');

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || 'localhost';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT || 8108;
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || 'xyz';

const client = new Typesense.Client({
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: TYPESENSE_API_KEY,
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

async function createSchema() {
  try {
    await client.collections('events').delete();
  } catch (err) {
    // Ignore if doesn't exist
  }
  console.log('Creating schema...');
  await client.collections().create(schema);
}

async function fetchEvents(city = 'New York', size = 200) {
  console.log(`Fetching events for ${city}...`);
  let events = [];
  let page = 0;
  const pageSize = 50; // Ticketmaster per-page limit is often 20-100

  while (events.length < size) {
    try {
      const response = await axios.get(
        `https://app.ticketmaster.com/discovery/v2/events.json`,
        {
          params: {
            apikey: TICKETMASTER_API_KEY,
            city: city,
            size: pageSize,
            page: page,
          },
        }
      );

      if (!response.data._embedded || !response.data._embedded.events) {
        break;
      }

      const fetched = response.data._embedded.events.map((e) => {
        const venue = e._embedded?.venues?.[0] || {};
        const location = venue.location
          ? [parseFloat(venue.location.latitude), parseFloat(venue.location.longitude)]
          : null;

        return {
          id: e.id,
          name: e.name,
          description: e.info || e.description || '',
          category: e.classifications?.[0]?.segment?.name || 'Uncategorized',
          venue: venue.name || 'Unknown Venue',
          location: location,
          date: e.dates?.start?.localDate || '',
          image: e.images?.[0]?.url || '',
        };
      });

      // Filter out events without location
      const validEvents = fetched.filter((e) => e.location !== null);
      events = [...events, ...validEvents];
      
      console.log(`Fetched ${events.length} valid events so far...`);
      
      if (response.data.page.totalPages <= page + 1) break;
      page++;
      
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (error) {
      console.error('Error fetching from Ticketmaster:', error.message);
      break;
    }
  }

  return events.slice(0, size);
}

async function run() {
  if (!TICKETMASTER_API_KEY) {
    console.error('TICKETMASTER_API_KEY is missing in .env');
    return;
  }

  try {
    await createSchema();
    const events = await fetchEvents();
    
    if (events.length === 0) {
      console.log('No events found.');
      return;
    }

    console.log(`Indexing ${events.length} events...`);
    await client.collections('events').documents().import(events, { action: 'upsert' });
    console.log('Done!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

run();
