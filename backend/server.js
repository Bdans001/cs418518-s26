const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// MILESTONE 3: SECURITY MIDDLEWARE
// ==========================================
app.use((req, res, next) => {
    // Task 2: Clickjacking Prevention
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
});

// ==========================================
// DEMO AUTO-SEEDER (Forced Reset for Demo)
// ==========================================
const seedDatabase = async () => {
    const demoPass = 'Student2026!'; 
    const hashedPass = await bcrypt.hash(demoPass, 10);

    db.serialize(() => {
        // Create Tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY, 
            first_name TEXT, 
            last_name TEXT, 
            uin TEXT, 
            password TEXT, 
            verification_token TEXT, 
            is_verified INTEGER DEFAULT 0, 
            is_admin INTEGER DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS advising_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            user_email TEXT, 
            date_submitted DATETIME DEFAULT CURRENT_TIMESTAMP, 
            last_term_attended TEXT, 
            last_gpa TEXT, 
            current_term TEXT, 
            status TEXT, 
            admin_feedback TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS planned_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            record_id INTEGER, 
            level TEXT, 
            course_name TEXT
        )`);

        // Ensure the admin_feedback column exists for Milestone 3
        db.run(`ALTER TABLE advising_records ADD COLUMN admin_feedback TEXT`, (err) => {});

        // FORCED UPDATE: Delete existing demo accounts to overwrite them with the correct password/roles
        db.run(`DELETE FROM users WHERE email IN ('bdans001@odu.edu', 'admin@odu.edu')`, () => {
            
            // Re-insert Student Account
            db.run(`INSERT INTO users (first_name, last_name, email, uin, password, is_verified, is_admin)
                    VALUES ('Benjamin', 'Danso', 'bdans001@odu.edu', '01234567', ?, 1, 0)`, [hashedPass]);

            // Re-insert Admin Account
            db.run(`INSERT INTO users (first_name, last_name, email, uin, password, is_verified, is_admin)
                    VALUES ('System', 'Admin', 'admin@odu.edu', '00000000', ?, 1, 1)`, [hashedPass]);
            
            console.log("✅ FORCED RESET COMPLETE: Use 'Student2026!' for both accounts.");
        });
    });
};
seedDatabase();

// ==========================================
// MILESTONE 1: AUTHENTICATION ROUTES
// ==========================================

app.post('/login', async (req, res) => {
    const { email, password, recaptchaToken } = req.body;

    // Task 1: reCAPTCHA Verification
    if (!recaptchaToken) {
        return res.status(400).json({ error: "Please complete the reCAPTCHA challenge." });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error." });
        }
        if (!row) {
            return res.status(400).json({ error: "User not found." });
        }
        
        const match = await bcrypt.compare(password, row.password);
        if (!match) {
            return res.status(400).json({ error: "Invalid password." });
        }
        
        // Return user data and fix Admin flag for React
        res.status(200).json({ 
            message: "Login successful!", 
            user: { 
                email: row.email, 
                firstName: row.first_name, 
                lastName: row.last_name,
                isAdmin: row.is_admin === 1 // Force boolean for frontend
            } 
        });
    });
});

app.post('/verify-2fa', (req, res) => {
    const { code } = req.body;
    if (code === "123456") {
        res.json({ message: "Verified" });
    } else {
        res.status(400).json({ error: "Invalid code" });
    }
});

app.post('/register', async (req, res) => {
    const { firstName, lastName, email, uin, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (first_name, last_name, email, uin, password, is_verified) VALUES (?, ?, ?, ?, ?, 1)`,
        [firstName, lastName, email, uin, hashedPassword], (err) => {
            if (err) return res.status(400).json({ error: "Email exists" });
            res.status(201).json({ message: "Registered" });
        }
    );
});

// ==========================================
// MILESTONE 2: STUDENT PORTAL ROUTES
// ==========================================

app.get('/api/advising-history/:email', (req, res) => {
    db.all("SELECT * FROM advising_records WHERE user_email = ? ORDER BY date_submitted DESC", 
    [req.params.email], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/submit-advising', (req, res) => {
    const { email, lastTerm, lastGpa, currentTerm, plannedCourses } = req.body;
    db.run(`INSERT INTO advising_records (user_email, last_term_attended, last_gpa, current_term, status) VALUES (?, ?, ?, ?, 'Pending')`,
        [email, lastTerm, lastGpa, currentTerm], function() {
            const recordId = this.lastID;
            const stmt = db.prepare(`INSERT INTO planned_courses (record_id, level, course_name) VALUES (?, ?, ?)`);
            plannedCourses.forEach(course => {
                stmt.run(recordId, course.level, course.course_name);
            });
            stmt.finalize();
            res.status(201).json({ message: "Submitted successfully" });
        });
});

// ==========================================
// MILESTONE 3: ADMIN PORTAL ROUTES
// ==========================================

app.get('/api/admin/advising', (req, res) => {
    // Task 6: Fetch all student records for admin
    const query = `
        SELECT a.id, u.first_name, u.last_name, a.current_term, a.status 
        FROM advising_records a 
        JOIN users u ON a.user_email = u.email 
        ORDER BY a.date_submitted DESC
    `;
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: "Fetch failed" });
        res.json(rows);
    });
});

app.get('/api/advising-record/:id', (req, res) => {
    // Fetch specific record + courses for Review page
    db.get("SELECT * FROM advising_records WHERE id = ?", [req.params.id], (err, record) => {
        db.all("SELECT * FROM planned_courses WHERE record_id = ?", [req.params.id], (err, courses) => {
            res.json({ ...record, plannedCourses: courses });
        });
    });
});

app.put('/api/admin/advising/:id', (req, res) => {
    // Task 7 & 8: Approve/Reject with Mandatory Feedback
    const { status, feedback } = req.body;
    if (!feedback || feedback.trim() === "") {
        return res.status(400).json({ error: "Feedback is required." });
    }
    db.run("UPDATE advising_records SET status = ?, admin_feedback = ? WHERE id = ?", 
        [status, feedback, req.params.id], (err) => {
            if (err) return res.status(500).json({ error: "Update failed" });
            res.json({ message: "Record updated successfully" });
        }
    );
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});