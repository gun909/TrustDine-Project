const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────── Middleware ────────────────────
app.use(cors());
app.use(express.json());

// ──────────────────── MySQL Connection ────────────────────
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trustdine',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    console.error('❌ Connection details:', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'trustdine'
    });
    process.exit(1);
  }
  console.log('✅ Connected to MySQL Database');
});

// Routes
// 🌐 Ping route
app.get('/', (req, res) => {
  res.send('TrustDish Backend is running');
});

// 👤 User signup
app.post('/signup', async (req, res) => {
  const { name, email, password, admin = false } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO user_login (name, email, password, admin) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, email, hashedPassword, admin], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already exists.' });
        }
        return res.status(500).json({ error: 'Server error.' });
      }
      res.status(201).json({ message: 'User registered successfully.' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Encryption error.' });
  }
});

//Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM user_login WHERE email = ?';

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Server error.' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = results[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password.' });
      }

      res.json({
        message: 'Login successful.',
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
          admin: user.admin === 1,
        },
      });
    } catch (compareError) {
      console.error('[COMPARE ERROR]', compareError);
      return res.status(500).json({ error: 'Password comparison failed.' });
    }
  });
});

//Forgot password: create transporter
function createSmtpTransporter() {
  const hasSmtpHost = Boolean(process.env.MAIL_HOST);
  if (hasSmtpHost) {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: String(process.env.MAIL_SECURE).toLowerCase() === 'true' || Number(process.env.MAIL_PORT) === 465,
      auth: process.env.MAIL_USER && process.env.MAIL_PASS ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      } : undefined,
      pool: true,
    });
  }

  const service = process.env.MAIL_SERVICE || 'Gmail';
  return nodemailer.createTransport({
    service,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    pool: true,
  });
}

//Test SMTP
app.get('/smtp-verify', async (req, res) => {
  try {
    const transporter = createSmtpTransporter();
    await transporter.verify();
    res.json({ ok: true, message: 'SMTP connection successful' });
  } catch (e) {
    console.error('[SMTP VERIFY ERROR]', e);
    res.status(500).json({ ok: false, error: 'SMTP verify failed', details: e.message });
  }
});

//Forgot password request
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000;

  const sql = 'UPDATE user_login SET reset_token=?, reset_expires=? WHERE email=?';
  db.query(sql, [token, expires, email], (err, result) => {
    if (err || result.affectedRows === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const transporter = createSmtpTransporter();
    const frontendBase = process.env.FRONTEND_URL || 'https://trustdish-reset.netlify.app';
    const link = `${frontendBase.replace(/\/$/, '')}/reset?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject: 'Reset your password',
      html: `<p>Click the link to reset your password:</p><p><a href="${link}">${link}</a></p>`,
    };

    transporter.sendMail(mailOptions, (mailErr) => {
      if (mailErr) {
        console.error('[MAIL ERROR]', mailErr);
        return res.status(500).json({ error: 'Failed to send email.' });
      }
      res.json({ message: 'Reset email sent. Please check your inbox.' });
    });
  });
});

//Reset password
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const sql =
      'UPDATE user_login SET password=?, reset_token=NULL, reset_expires=NULL WHERE reset_token=? AND reset_expires > ?';
    db.query(sql, [hashed, token, Date.now()], (err, result) => {
      if (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Server error.' });
      }
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: 'Invalid or expired token.' });
      }
      res.json({ message: 'Password updated successfully.' });
    });
  } catch (hashErr) {
    console.error('[HASH ERROR]', hashErr);
    res.status(500).json({ error: 'Encryption error.' });
  }
});

//Test endpoint to check what regions exist in database
app.get('/api/test-regions', (req, res) => {
  const sql = 'SELECT DISTINCT Location_Region, COUNT(*) as count FROM google_reviews GROUP BY Location_Region ORDER BY Location_Region';
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Test regions query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('🔍 Available regions in database:', results);
    res.json(results);
  });
});

//Search restaurants by region
app.get('/api/search', (req, res) => {
  const { regions } = req.query;

  if (!regions) {
    return res.status(400).json({ error: 'Missing region parameter' });
  }

  const regionArray = regions.split(',').map(r => r.trim().replace(/'/g, ''));
  const placeholders = regionArray.map(() => '?').join(',');
  const sql = `SELECT * FROM google_reviews WHERE Location_Region IN (${placeholders})`;

  db.query(sql, regionArray, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('🔍 API - Query results count:', results.length);
    console.log('🔍 API - Regions searched:', regionArray);
    
    // Group results by Location_Region to see distribution
    const regionCounts = {};
    results.forEach(row => {
      const region = row.Location_Region;
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    console.log('🔍 API - Results by region:', regionCounts);

    res.json(results);
  });
});

// Search trust endpoint
app.get('/api/search-trust', (req, res) => {
  console.log('🔍 Trust Search API - Request received');
  console.log('🔍 Trust Search API - Query params:', req.query);
  
  const { restaurantName } = req.query;
  console.log('🔍 Trust Search - Received restaurant name:', restaurantName);
  
  if (!restaurantName) {
    console.log('❌ Trust Search API - No restaurant name provided');
    return res.status(400).json({ error: 'Restaurant name is required' });
  }

  console.log('✅ Trust Search API - Restaurant name received:', restaurantName);

  // Use Tripadvisor_TrustView table to define Status
  const sql = 'SELECT * FROM Tripadvisor_TrustView WHERE Rest_Name LIKE ?';
  
  const searchTerm = `%${restaurantName}%`;
  
  console.log('🔍 Trust Search - SQL query:', sql);
  console.log('🔍 Trust Search - Search term:', searchTerm);
  
  db.query(sql, [searchTerm], (err, results) => {
    if (err) {
      console.error('❌ Trust Search API - Database error:', err);
      console.error('❌ Trust Search API - Error details:', {
        code: err.code,
        errno: err.errno,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage
      });
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log('✅ Trust Search API - Query successful');
    console.log('📊 Trust Search - Results count:', results.length);
    console.log('📊 Trust Search - All results:', results);
    
    if (results.length === 0) {
      console.log('⚠️ Trust Search API - No results found for search term:', searchTerm);
    }
    
    res.json(results);
  });
});

// Search restaurant by ID endpoint
app.get('/api/search-restaurant', (req, res) => {
  const { restaurantId } = req.query;
  
  if (!restaurantId) {
    return res.status(400).json({ error: 'Restaurant ID is required' });
  }

  const sql = 'SELECT Rest_ID, Rest_Name, Latitude, Longitude FROM google_reviews WHERE Rest_ID = ?';
  
  db.query(sql, [restaurantId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Submit review endpoint
app.post('/api/submit-review', (req, res) => {
  const { Rest_ID, Description, Review_New, Upload_Image, Approval } = req.body;
  
  if (!Rest_ID || !Description) {
    return res.status(400).json({ error: 'Rest_ID and Description are required' });
  }

  const sql = 'INSERT INTO User_Reviews (Rest_ID, Description, Review_New, Upload_Image, Approval, Review_Date) VALUES (?, ?, ?, ?, ?, NOW())';
  
  console.log('🔍 Submit Review - SQL:', sql);
  console.log('🔍 Submit Review - Data:', { Rest_ID, Description, Review_New, Upload_Image, Approval });
  
  db.query(sql, [Rest_ID, Description, Review_New, Upload_Image, Approval], (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('✅ Review submitted successfully:', results);
    res.json({ success: true, id: results.insertId });
  });
});

// Test endpoint to check available regions
app.get('/api/test-regions', (req, res) => {
  const sql = 'SELECT DISTINCT Location_Region, COUNT(*) as count FROM google_reviews GROUP BY Location_Region ORDER BY Location_Region';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('🔍 Available regions in database:', results);
    res.json(results);
  });
});

// Get user reviews with restaurant names
app.get('/api/user-reviews', (req, res) => {
  console.log('🔍 User Reviews API - Request received');
  const sql = `
    SELECT 
      ur.Review_Record,
      ur.User_ID,
      ur.Rest_ID,
      tt.Rest_Name,
      ur.Review_Date,
      ur.Review_New,
      ur.Unique_Review,
      ur.Updated_TATable
    FROM User_Reviews ur
    LEFT JOIN Tripadvisor_TrustView tt ON ur.Rest_ID = tt.Rest_ID
    ORDER BY ur.Review_Record DESC
  `;
  
  console.log('🔍 User Reviews - SQL:', sql);
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ User Reviews API - Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('✅ User Reviews - Results count:', results.length);
    res.json(results);
  });
});

// Check if user is admin
app.get('/api/check-admin', (req, res) => {
  const { userId } = req.query;
  console.log('🔍 Check Admin - User ID:', userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const sql = 'SELECT admin FROM user_login WHERE user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('❌ Check Admin - Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isAdmin = results[0].admin === 1;
    console.log('✅ Check Admin - Is admin:', isAdmin);
    res.json({ isAdmin });
  });
});

// Update reviews (admin only)
app.post('/api/update-reviews', (req, res) => {
  const { reviewRecords } = req.body;
  console.log('🔍 Update Reviews - Records to update:', reviewRecords);
  
  if (!reviewRecords || reviewRecords.length === 0) {
    return res.status(400).json({ error: 'No records to update' });
  }
  
  // Start transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error('❌ Update Reviews - Transaction error:', err);
      return res.status(500).json({ error: 'Transaction error' });
    }
    
    let completed = 0;
    let hasError = false;
    
    reviewRecords.forEach((record, index) => {
      // Update Tripadvisor_TrustView
      const updateTrustSQL = `
        UPDATE Tripadvisor_TrustView 
        SET 
          TripAdv_Rating = (TripAdv_Reviews * TripAdv_Rating + ?) / (TripAdv_Reviews + 1),
          TripAdv_Reviews = TripAdv_Reviews + 1,
          TimeStamp = ?
        WHERE Rest_ID = ?
      `;
      
      db.query(updateTrustSQL, [record.Review_New, record.Review_Date, record.Rest_ID], (err) => {
        if (err) {
          console.error('❌ Update Tripadvisor_TrustView error:', err);
          hasError = true;
          return db.rollback(() => {
            res.status(500).json({ error: 'Failed to update Tripadvisor_TrustView' });
          });
        }
        
        // Update User_Reviews
        const updateUserSQL = 'UPDATE User_Reviews SET Updated_TATable = 1 WHERE Review_Record = ?';
        db.query(updateUserSQL, [record.Review_Record], (err) => {
          if (err) {
            console.error('❌ Update User_Reviews error:', err);
            hasError = true;
            return db.rollback(() => {
              res.status(500).json({ error: 'Failed to update User_Reviews' });
            });
          }
          
          completed++;
          if (completed === reviewRecords.length && !hasError) {
            db.commit((err) => {
              if (err) {
                console.error('❌ Commit error:', err);
                return db.rollback(() => {
                  res.status(500).json({ error: 'Failed to commit transaction' });
                });
              }
              console.log('✅ Update Reviews - All records updated successfully');
              res.json({ success: true, updated: completed });
            });
          }
        });
      });
    });
  });
});

//Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
