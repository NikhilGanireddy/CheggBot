const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URL;

if (!url) {
    throw new Error('MONGODB_URL environment variable is not set.');
}

if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URL must start with "mongodb://" or "mongodb+srv://".');
}

const client = new MongoClient(url);
const dbName = 'telegramBotDB';

async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);
        const users = db.collection('users');
        return { users };
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

module.exports = { connect };
