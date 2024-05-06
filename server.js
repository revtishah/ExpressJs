const express = require('express');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Define the GET route
app.get('/echo', (req, res) => {
    // Check if there's a query parameter named 'text'
    if (req.query.text) {
        // Send back the same text as JSON
        res.json({ text: req.query.text });
    } else {
        // If no text found, send an error message
        res.status(400).json({ error: 'No text provided' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
