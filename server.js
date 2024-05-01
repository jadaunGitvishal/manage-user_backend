const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5000;

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Vishal@123",
  database: "project_dev",
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to MySQL");
});

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Login route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  const sql =
    "SELECT * FROM login_users WHERE email = '" +
    email +
    "' and password= '" +
    password +
    "'";
  db.query(sql, (err, results) => {
    console.log(results.length);
    if (err) {
      console.error("Error retrieving user from database:", err);
      res.status(500).json({ error: "An unexpected error occurred" });
    } else if (results.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
    } else {
      const user = results[0];
      const passwordMatch = bcrypt.compareSync(password, user.password); // Compare the passwords
      console.log(passwordMatch);
      res.status(200).json({ message: "Login successful" });
    }
  });
});

//get country state and district from db table for form submission....
app.get("/countries", (req, res) => {
  const sql = "SELECT * FROM ms_country";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching countries:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.get("/countries/:countryId/states", (req, res) => {
  const countryId = parseInt(req.params.countryId);

  // Check if countryId is a valid number
  if (isNaN(countryId)) {
    res.status(400).json({ message: "Invalid countryId" });
    return;
  }

  const sql = "SELECT * FROM ms_state WHERE country_id = ?";
  db.query(sql, [countryId], (err, results) => {
    if (err) {
      console.error("Error fetching states:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.get("/states/:stateId/districts", (req, res) => {
  const stateId = parseInt(req.params.stateId);
  const sql = "SELECT * FROM ms_district WHERE state_id = ?";
  db.query(sql, [stateId], (err, results) => {
    if (err) {
      console.error("Error fetching districts:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json(results);
    }
  });
});

// API Endpoint for Form Submission...
app.post("/submit-form", async (req, res) => {
  const formData = req.body;
  console.log("Received form data:", formData);

  try {
    // Insert form data into form_data table with validated IDs
    const formSql =
      "INSERT INTO form_data (NAME, email, mobile, address, country_id, state_id, district_id, pincode, DATE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const formValues = [
      formData.name,
      formData.email,
      formData.mobile,
      formData.address,
      formData.country,
      formData.state,
      formData.district,
      formData.pincode,
      new Date(),
    ];

    console.log(formSql);
    await db.promise().query(formSql, formValues);

    console.log("Form data saved successfully");
    res.status(200).json({ message: "Form data saved successfully" });
  } catch (error) {
    console.error("Error saving form data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// API Endpoint for getting all users with country, state, and district names
app.get("/users", (req, res) => {
  const sql = `
    SELECT fd.id,
           fd.name,
           fd.mobile,
           fd.email,
           fd.address,
           mc.country_name,
           ms.state_name,
           md.district_name,
           fd.date
    FROM form_data fd
    LEFT JOIN ms_country mc ON fd.country_id = mc.country_id
    LEFT JOIN ms_state ms ON fd.state_id = ms.state_id
    LEFT JOIN ms_district md ON fd.district_id = md.district_id
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json(result);
    }
  });
});

// API Endpoint for editing a user
app.put("/users/:id", (req, res) => {
  const userId = req.params.id;
  const userData = req.body;

  const {
    name,
    mobile,
    email,
    address,
    pincode,
    date,
    country_id,
    state_id,
    district_id,
  } = userData;

  if (
    !name ||
    !mobile ||
    !email ||
    !address ||
    !pincode ||
    !date ||
    !country_id ||
    !state_id ||
    !district_id
  ) {
    res.status(400).json({ message: "Incomplete user data" });
    return;
  }

  const sql = `
    UPDATE form_data 
    SET 
      name = ?,
      mobile = ?,
      email = ?,
      address = ?,
      pincode = ?,
      date = ?,
      country_id = ?,
      state_id = ?,
      district_id = ?
    WHERE id = ?
  `;

  const userDataValues = [
    name,
    mobile,
    email,
    address,
    pincode,
    date,
    country_id,
    state_id,
    district_id,
    userId,
  ];

  db.query(sql, userDataValues, (err, result) => {
    if (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json({ message: "User updated successfully" });
    }
  });
});

// API Endpoint for getting a user by ID
app.get("/users/:id", (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT * FROM form_data WHERE id = ?";

  db.query(sql, userId, (err, result) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      if (result.length > 0) {
        res.status(200).json(result[0]); // Send the first user found (assuming ID is unique)
      } else {
        res.status(404).json({ message: "User not found" });
      }
    }
  });
});

// API Endpoint for deleting a user
app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;

  const sql = "DELETE FROM form_data WHERE id = ?";

  db.query(sql, userId, (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      res.status(200).json({ message: "User deleted successfully" });
    }
  });
});

// API Endpoint for Chart Data
app.get("/chart-data", (req, res) => {
  const sql =
    // "SELECT date, COUNT(id) AS idCount FROM form_data GROUP BY date ORDER BY date";
    "SELECT date, COUNT(id) AS idCount FROM form_data WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY date ORDER BY date";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching chart data:", err);
      res.status(500).json({ message: "Internal server error" });
    } else {
      // Send aggregated data to the frontend
      res.status(200).json(results);
    }
  });
});

//API Endpoint for getting user registrations in the last 7 days
app.get("/api/user-registrations", (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Query the database to get user registrations in the last 7 days
  const sql = `
      SELECT date, COUNT(id) AS count
      FROM form_data
      WHERE date >= ?
      GROUP BY date
      ORDER BY date
    `;

  db.query(sql, [sevenDaysAgo], (err, results) => {
    if (err) {
      console.error("Error fetching user registrations:", err);
      res.status(500).json({ error: "Internal server error" });
    } else {
      // Send the results as a single array
      res.status(200).json(results);
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
