const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const moment = require('moment');

const app = express();
const PORT = 3000;

//Set port for requests
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// Set MySQL database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'jware',
});

connection.connect();

// Middlewares
app.use(bodyParser.json());

// Register route
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  // Encrypt password before storing it in the database
  const hashedPassword = bcrypt.hashSync(password, 10);

  // User registration in the database
  connection.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to register user' });
      } else {
        res.status(201).json({ message: 'User registered successfully' });
      }
    }
  );
});

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validate provided email
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).json({ message: 'Failed to login' });
      } else if (results.length == 0) {
        res.status(401).json({ message: 'Invalid credentials' });
      } else {
        // Compare password with hashed password stored in the database
        const passwordMatch = bcrypt.compareSync(password, results[0].password);

        if (passwordMatch) {
          // Generate JWT token and send it in the response
          const token = jwt.sign({ id: results[0].id }, 'secret', {
            expiresIn: '1h',
          });
          res.json({ message: 'Login successful', token: token });
        } else {
          res.status(401).json({ message: 'Invalid credentials' });
        }
      }
    }
  );
});

// Protected route

app.get('/nic-to-dob/:nic', (req, res) => {
  const { nic } = req.params;

  // Validate JWT token before allowing access to the route
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ message: 'Missing authorization header' });
  } else {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, 'secret', (err, decoded) => {
      if (err) {
        res.status(401).json({ message: 'Invalid token' });
      } else {
        // Convert NIC number into date of birth and gender
        if (nic.length < 10 || nic === null) {
          res.status(401).json({ message: 'Invalid NIC' });
        } else {
          const year = parseInt(nic.substring(0, 2));
          let days = parseInt(nic.substring(2, 5));
          const gender = days < 500 ? 'Male' : 'Female';

          if (gender === 'Female') {
            days = days - 500;
          }

          const startOfYear = moment({ year: 1900 + year, month: 0, day: 1 });
          const dob = startOfYear.clone().add(days - 1, 'days');

          // Return the date of birth as a JSON response
          res.json({
            dob: dob.format('YYYY-MM-DD'),
            gender: gender,
          });
        }
      }
    });
  }
});
