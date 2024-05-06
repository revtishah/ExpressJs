const express = require('express');
const redis = require('redis');
const mysql = require('mysql2');

const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

const pool = mysql.createPool({
    connectionLimit: 10, // The maximum number of connections to create at once.
    host: 'localhost', // replace with your database host, usually 'localhost'
    user: 'revti', // replace with your database username
    password: 'rr@271122', // replace with your database password
    database: 'myDB' ,// replace with your database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
debugger;
// Promisify for Node.js async/await.
const promisePool = pool.promise();

// Create a Redis client
const redisClient = redis.createClient();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis');
        // Other Express app setup here...
    } catch (err) {
        console.log('Error connecting to Redis', err);
        process.exit(1);
    }
})();

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

//Get Name from redis
app.get('/get-message/:name', async (req, res) => {
    const name = req.params.name;

    try {
        // Try to fetch the message from Redis cache first
        const cachedMessage = await redisClient.get(name);

        if (cachedMessage) {
            // If a cached message is found, return it directly
            return res.json({ name, message: cachedMessage });
        }

        // If no cached message, query the MySQL database
        const sql = 'SELECT message FROM information WHERE name = ? LIMIT 1';
        const [rows] = await promisePool.execute(sql, [name]);
        
        if (rows.length > 0) {
            const message = rows[0].message;

            // Before sending the response, cache the message in Redis
            // Set an expiration time as needed (e.g., 3600 seconds for 1 hour)
            await redisClient.setEx(name, 3600, message);

            return res.json({ name, message });
        } else {
            return res.status(404).send('No message found for this name.');
        }
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).send('Error retrieving message');
    }
});

//Get all data from redis
// Assuming redisClient has been created and connected as shown in previous examples

app.get('/get-message', async (req, res) => {
    const pageSize = parseInt(req.query.pageSize, 10) || 10; // how many items per page
    const page = parseInt(req.query.page, 10) || 1; // which page to display

    const cacheKey = `get-message-${page}-${pageSize}`;

    try {
        // Check cache first
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Returning cached data');
            return res.json(JSON.parse(cachedData));
        }

        const offset = (page - 1) * pageSize;
        const sql = `SELECT name, message FROM information LIMIT ${offset}, ${pageSize}`;
        const countQuery = 'SELECT COUNT(*) AS total FROM information';

        // Execute queries
        const [results] = await promisePool.query(sql);
        const [countResults] = await promisePool.query(countQuery);
        const allDataCount = countResults[0].total;

        const response = {
            data: results,
            currentPage: page,
            pageSize: pageSize,
            totalCount: allDataCount
        };

        // Cache the serialized response with an expiration time (e.g., 10 minutes)
        await redisClient.setEx(cacheKey, 600, JSON.stringify(response));

        res.json(response);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
