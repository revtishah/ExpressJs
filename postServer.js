const express = require('express'); // Get Express, the library we use to build the server
const app = express(); // Create our app using Express

app.use(express.json()); // Tell the app to understand JSON data

// This is our in-memory storage
const messages = {};

// Create a POST API to store messages
app.post('/store-message', (req, res) => {
  const { name, message } = req.body; // Get name and message from the request

  if (name && message) {
    messages[name] = message; // Store the message with the name as the key
    res.send({ success: true, message: 'Message stored successfully!' });
  } else {
    res.status(400).send({ success: false, message: 'Please provide both a name and a message.' });
  }
});

// Create a GET API to retrieve a message by name
app.get('/get-message/:name', (req, res) => {
    const name = req.params.name;
  
    const message = messages[name];
  //console.log(message);
    if (message) {
      res.json({ message });
    } else {
      res.status(404).json({ error: 'Message not found for the given name.' });
    }
  });

// Set up the app to listen on port 3000
const PORT = 3800;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
