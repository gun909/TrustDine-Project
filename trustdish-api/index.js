const express = require('express'); 
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MySQL Database
const db = mysql.createConnection({
  host: process.env.DB_HOST,       // e.g. sql12.freesqldatabase.com
  user: process.env.DB_USER,       // your DB username
  password: process.env.DB_PASSWORD, // your DB password
  database: process.env.DB_NAME    // your DB name
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL Database');
});

// Routes
app.get('/', (req, res) => {
  res.send('TrustDish Backend is running');
});

// Register new user
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

// Login
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

      // Login successful
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

// Forgot password placeholder
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// 1️⃣ 用户提交邮箱：生成 token、保存数据库并发送邮件
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000; // 1小时有效

  const sql = 'UPDATE user_login SET reset_token=?, reset_expires=? WHERE email=?';
  db.query(sql, [token, expires, email], (err, result) => {
    if (err || result.affectedRows === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    // 使用 Nodemailer 发送重置邮件
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // 或其他SMTP
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const link = `https://your-frontend-domain/reset?token=${token}`;
    const mailOptions = {
      to: email,
      subject: 'Reset your password',
      text: `Click the link to reset your password: ${link}`,
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

// 2️⃣ 用户点击邮件后，在前端输入新密码并提交 token
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


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
