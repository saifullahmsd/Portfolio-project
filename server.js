require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const querystring = require("querystring");
const sql = require("mssql");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// SQL Server configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Helper function to send consistent JSON responses.
  function sendJsonResponse(res, statusCode, success, message, data = null) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success, message, ...data }));
  }

  // NEW: ADMIN USER SEARCH AUTCOMPLETE ROUTE
  if (
    req.method === "GET" &&
    req.url.startsWith("/admin/search-users-autocomplete")
  ) {
    const query = new URLSearchParams(req.url.split("?")[1]);
    const searchTerm = query.get("q") || "";
    const adminUser = query.get("adminUser"); // Get the username of the logged-in admin

    // A basic check to ensure the user making the request is an admin
    // REPLACE "admin_user" WITH YOUR ACTUAL ADMIN USERNAME
    if (adminUser !== "john") {
      sendJsonResponse(res, 403, false, "Permission denied.");
      return;
    }

    try {
      const pool = await sql.connect(dbConfig);
      // Use a LIKE query to find all usernames that match the search term
      const result = await pool
        .request()
        .input("searchTerm", sql.NVarChar, `%${searchTerm}%`)
        .query(
          "SELECT username FROM users WHERE username LIKE @searchTerm ORDER BY username"
        );

      const users = result.recordset.map((record) => record.username);
      sendJsonResponse(res, 200, true, "User list retrieved.", { users });

      await pool.close();
    } catch (err) {
      console.error("Admin user list error:", err);
      sendJsonResponse(res, 500, false, "Error fetching user list.");
    }
    return;
  }

  // EXISTING ADMIN SEARCH ROUTE - now takes a single username
  if (req.method === "GET" && req.url.startsWith("/admin/search-user")) {
    const query = new URLSearchParams(req.url.split("?")[1]);
    const username = query.get("username");

    if (!username) {
      sendJsonResponse(res, 400, false, "Username parameter is required.");
      return;
    }

    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(
          "SELECT username, email, phone FROM users WHERE username = @username"
        );

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        sendJsonResponse(res, 200, true, "User found.", { user });
      } else {
        sendJsonResponse(res, 404, false, `User "${username}" not found.`);
      }

      await pool.close();
    } catch (err) {
      console.error("Admin user search error:", err);
      sendJsonResponse(res, 500, false, "Error searching for user.");
    }
    return;
  }

  // EXISTING: USER INFO ROUTE (for the currently logged-in user)
  if (req.method === "GET" && req.url.startsWith("/user-info")) {
    const query = new URLSearchParams(req.url.split("?")[1]);
    const username = query.get("username");

    try {
      const pool = await sql.connect(dbConfig);
      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(
          "SELECT username, email, phone FROM users WHERE username = @username"
        );

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        sendJsonResponse(res, 200, true, "User found.", { user });
      } else {
        sendJsonResponse(res, 404, false, "User not found.");
      }

      await pool.close();
    } catch (err) {
      console.error("User info fetch error:", err);
      sendJsonResponse(res, 500, false, "Error fetching user data");
    }
    return;
  }

  // Serve static files
  if (req.method === "GET") {
    let filePath = "." + req.url;
    if (req.url === "/") filePath = "./index.html";

    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".mp4": "video/mp4",
    };

    const contentType = mimeTypes[extname] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("File not found");
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      }
    });
    return;
  }

  // LOGIN ROUTE
  if (req.method === "POST" && req.url === "/login") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const formData = querystring.parse(body);
      const username = formData.username?.trim() || "";
      const password = formData.password?.trim() || "";

      try {
        const pool = await sql.connect(dbConfig);
        const result = await pool
          .request()
          .input("username", sql.NVarChar, username)
          .query(
            "SELECT username, email, password, phone, role FROM users WHERE username = @username"
          );

        if (result.recordset.length > 0) {
          const user = result.recordset[0];
          const match = await bcrypt.compare(password, user.password);

          if (match) {
            // Include the role in the user object sent to the frontend
            const userData = {
              username: user.username,
              email: user.email,
              phone: user.phone,
              role: user.role,
            };
            sendJsonResponse(res, 200, true, "Login successful.", {
              user: userData,
            });
          } else {
            sendJsonResponse(res, 401, false, "Wrong username or password");
          }
        } else {
          sendJsonResponse(res, 401, false, "Wrong username or password");
        }
        await pool.close();
      } catch (err) {
        console.error("Login error:", err);
        sendJsonResponse(res, 500, false, "Error checking login");
      }
    });
    return;
  }

  // SIGNUP (REGISTRATION) ROUTE
  if (req.method === "POST" && req.url === "/signup") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const formData = querystring.parse(body);
      const username = formData.username?.trim() || "";
      const email = formData.email?.trim() || "";
      const password = formData.password?.trim() || "";
      const phone = formData.phone?.trim() || "";

      try {
        const pool = await sql.connect(dbConfig);
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await pool
          .request()
          .input("username", sql.NVarChar, username)
          .input("email", sql.NVarChar, email)
          .input("password", sql.NVarChar, hashedPassword.trim())
          .input("phone", sql.NVarChar, phone)
          .query(
            "INSERT INTO users (username, email, password, phone, role) VALUES (@username, @email, @password, @phone, 'user')"
          );

        sendJsonResponse(
          res,
          200,
          true,
          "Signup successful! You can now login."
        );

        await pool.close();
      } catch (err) {
        console.error("Signup error:", err);
        sendJsonResponse(
          res,
          500,
          false,
          "Error registering user (username may already exist)"
        );
      }
    });
    return;
  }

  // CONTACT FORM ROUTE
  if (req.method === "POST" && req.url === "/submit") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      const formData = querystring.parse(body);
      const email = formData.email?.trim() || "";
      const phone = formData.phone?.trim() || "";
      const message = formData.message?.trim() || "";

      try {
        const pool = await sql.connect(dbConfig);

        await pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("phone", sql.NVarChar, phone)
          .input("message", sql.NVarChar, message)
          .query(
            "INSERT INTO contacts (email, phone, message) VALUES (@email, @phone, @message)"
          );

        sendJsonResponse(
          res,
          200,
          true,
          "Your message has been sent successfully!"
        );
        await pool.close();
      } catch (err) {
        console.error("Form submission error:", err);
        sendJsonResponse(res, 500, false, "Error saving data");
      }
    });
    return;
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
