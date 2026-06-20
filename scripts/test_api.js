const axios = require('axios');

async function test() {
    const baseURL = 'http://localhost:8000';
    console.log('--- Testing API Endpoints ---');

    try {
        const health = await axios.get(`${baseURL}/health`);
        console.log('Health:', health.data);

        const nearby = await axios.get(`${baseURL}/api/events/nearby?lat=40.7128&lon=-74.0060&radius=1000`);
        console.log('Nearby Events Count:', nearby.data.length);

        const foryou = await axios.get(`${baseURL}/api/events/foryou?userId=test-user-123`);
        console.log('For You Events Count:', foryou.data.length);

        const detail = await axios.get(`${baseURL}/api/events/1`);
        console.log('Event Detail (ID 1):', detail.data.name);

        const signal = await axios.post(`${baseURL}/api/signals`, {
            userId: 'test-user-123',
            eventId: '1',
            action: 'view',
            metadata: { dwellTimeSeconds: 6, category: 'Music' }
        });
        console.log('Post Signal Status:', signal.status);

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

test();
