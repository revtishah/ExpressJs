require('dotenv').config();
const mysql = require('mysql2');
const express = require('express');
const cors = require('cors');

// Database Connection Pool Setup
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0
});
console.log('Database Host:', process.env.DB_HOST);
console.log('Database User:', process.env.DB_USER);

const promisePool = pool.promise();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// POST route to add a message
app.post('/add-message', async (req, res) => {
    const { name, message } = req.body;
    const query = 'INSERT INTO information (name, message) VALUES (?, ?)';
    try {
        await promisePool.execute(query, [name, message]);
        res.send('Data added successfully');
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error adding data to the database');
    }
});
//GET all data from mySQL
const countQuery = 'SELECT COUNT(*) AS total FROM information';
// Simple in-memory cache
let cache = {};
let cacheTimeout = 5 * 60 * 1000; // 5 minutes

//GET all search data from mySQL
app.get('/global-search', async (req, res) => {
    const searchTerm = req.query.searchTerm || '';
    //Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    const cacheKey = `global-search-${searchTerm}-${page}-${pageSize}`;
    // debugger;
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < cacheTimeout) {
        console.log('Returning cached data');
        return res.json(cache[cacheKey].data);
    }

    // Assuming a simple search across 'name' and 'message' fields in the 'information' table
    // Always use parameterized queries to prevent SQL injection
    const sql = 'SELECT name, message FROM information WHERE name LIKE ? LIMIT ? OFFSET ?';
    const countSql = 'SELECT COUNT(*) AS total FROM information WHERE name LIKE ?';
    const likeTerm = `%${searchTerm}%`;

    console.log("Search Name/Term", likeTerm);
    try {
        const [results] = await promisePool.query(sql, [likeTerm,  pageSize, offset]);
        const [[{total}]] = await promisePool.query(countSql, [likeTerm]);

        const totalPages = Math.ceil(total / pageSize);

        const response = {
            data: results,
            currentPage: page,
            pageSize: pageSize,
            totalCount: total,
            totalPages: totalPages
        };

        // Update cache
        cache[cacheKey] = {
            timestamp: Date.now(),
            data: response
        };

        res.json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// GET route to retrieve all messages with pagination
app.get('/get-messages', async (req, res) => {
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * pageSize;
    const sql = `SELECT name, message FROM information LIMIT ?, ?`;
    const countQuery = 'SELECT COUNT(*) AS total FROM information';

    try {
        debugger;
        const [results] = await promisePool.query(sql, [offset, pageSize]);
        const [countResult] = await promisePool.query(countQuery);

        if (!countResult.length) {
            throw new Error('Count query returned no results');
        }

        const total = countResult[0].total;

        res.json({
            data: results,
            currentPage: page,
            pageSize: pageSize,
            totalCount: total
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error retrieving data from the database' });
    }
});

// GET route to fetch message by name
app.get('/get-message/:name', async (req, res) => {
    const { name } = req.params;
    const sql = 'SELECT message FROM information WHERE name = ? LIMIT 1';
    
    try {
        const [rows] = await promisePool.execute(sql, [name]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send({ message: 'No message found for this name.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ message: 'Error retrieving message from the database' });
    }
});

// PUT route to update a message
app.put('/update-message/:name', async (req, res) => {
    const { name } = req.params;
    const { message } = req.body;

    if (!message) {
        return res.status(400).send({ message: 'A new message is required.' });
    }

    const sql = 'UPDATE information SET message = ? WHERE name = ?';
    try {
        const [result] = await promisePool.execute(sql, [message, name]);
        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'User not found.' });
        } else {
            res.send({ message: 'Message updated successfully.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ message: 'Error updating message in the database.' });
    }
});

// DELETE route to delete a message
app.delete('/delete-message/:name', async (req, res) => {
    const { name } = req.params;
    const sql = 'DELETE FROM information WHERE name = ?';
    
    try {
        const [result] = await promisePool.execute(sql, [name]);
        if (result.affectedRows === 0) {
            res.status(404).send({ message: 'No message found for this name.' });
        } else {
            res.send({ message: 'Message deleted successfully.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ message: 'Error deleting message from the database' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
