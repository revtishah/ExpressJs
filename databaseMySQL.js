const mysql = require('mysql2');

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

// Promisify for Node.js async/await.
const promisePool = pool.promise();


const express = require('express'); // Get Express, the library we use to build the server

console.log("Express",express);
const app = express(); // Create our app using Express
const port = 3000;

const cors = require('cors');
app.use(cors());

app.use(express.json()); // Tell the app to understand JSON data

//POST in mySQL
app.post('/add-message', (req, res) => {
    const { name, message } = req.body;
    const query = 'INSERT INTO information (name, message) VALUES (?, ?)';

    pool.execute(query, [name, message], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Error adding data to the database');
        }
        res.send('Data added successfully');
    });
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

//GET all data from mySQL
app.get('/get-message', async (req, res) => {
    const pageSize = parseInt(req.query.pageSize, 10) || 10; // how many items per page
    const page = parseInt(req.query.page, 10) || 1; // which page to display

    const cacheKey = `get-message-${page}-${pageSize}`;
    console.log("Cache Key", cacheKey);
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < cacheTimeout) {
        console.log('Returning cached data');
        return res.json(cache[cacheKey].data);
    }

    const offset = (page - 1) * pageSize;

    // SQL query to get the paginated data
    const sql = `SELECT name, message FROM information LIMIT ${offset}, ${pageSize}`;

    // SQL query to get the total count of records
    //const countQuery = 'SELECT COUNT(*) AS total FROM information';
    //console.log("Offset:", offset, "Page Size:", pageSize); // Debug log

    try {
       
        const [results] = await promisePool.query(sql); // Changed to query without placeholders
        const [countResults] = await promisePool.query(countQuery);
        //console.log("Results", results);
        const allDataCount = countResults[0].total;

        const response = {
            data: results,
            currentPage: page,
            pageSize: pageSize,
            totalCount: allDataCount
        };

        // Update cache
        cache[cacheKey] = {
            timestamp: Date.now(),
            data: response
        };

        res.json(response);
        //console.log("Data Length ", results.length);
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

//Get Name from MySQL
app.get('/get-message/:name', async (req, res) => {
    const name = req.params.name;

    try {
        const sql = 'SELECT message FROM information WHERE name = ? LIMIT 1';
        const [rows] = await promisePool.execute(sql, [name]);
        
        if (rows.length > 0) {
            const message = rows[0].message;
            res.json({ name: name, message: message });
        } else {
            res.status(404).send({ message: 'No message found for this name.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ message: 'Error retrieving message from the database' });
    }
});

// Update Message
app.put('/update-message/:name', async (req, res) => {
    const { name } = req.params;
    const { message } = req.body; // The new message to update

    // Check if the message is provided
    if (!message) {
        return res.status(400).send({ message: 'A new message is required.' });
    }

    try {
        const sql = 'UPDATE information SET message = ? WHERE name = ?';
        const [result] = await promisePool.execute(sql, [message, name]);
        
        if (result.affectedRows === 0) {
            // If no rows are affected, it means the user was not found
            res.status(404).send({ message: 'User not found.' });
        } else {
            // If rows are affected, the update was successful
            res.send({ message: 'Message updated successfully.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send({ message: 'Error updating message in the database.' });
    }
});


  //Delete Message
  app.delete('/delete-message/:name', async (req, res) => {
    const { name } = req.params;

    try {
        const sql = 'DELETE FROM information WHERE name = ?';
        const [result] = await promisePool.execute(sql, [name]);
        
        if (result.affectedRows === 0) {
            // If no rows are affected, no user with the given name was found
            res.status(404).send({ message: 'No message found for this name.' });
        } else {
            // If rows are affected, the deletion was successful
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
