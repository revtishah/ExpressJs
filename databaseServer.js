const mysql = require('mysql2'); //import mysql2 

//Create Connection
const connection = mysql.createConnection({
    connectionLimit: 10, // The maximum number of connections to create at once.
    host: 'localhost', // replace with your database host, usually 'localhost'
    user: 'revti', // replace with your database username
    password: 'rr@271122', // replace with your database password
    database: 'myDB' // replace with your database name
});

//Connect to mySQL
connection.connect(error => {
    if (error) {
      console.error('An error occurred while connecting to the DB');
      throw error;
    }
    
    console.log('Connected to MySQL!');
  });

  //Use the connection
  connection.query('SELECT * FROM information', (error, results, fields) => {
    if (error) throw error;
    
    // 'results' is an array with row objects
    console.log(results);

    //Close the connection
    connection.end();
  });



  
  