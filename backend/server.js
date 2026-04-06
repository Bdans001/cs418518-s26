const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// MILESTONE 1: AUTHENTICATION ROUTES
// ==========================================

app.post('/register', async (req, res) => {
    const { firstName, lastName, email, uin, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (row) return res.status(400).json({ error: "Email already exists." });
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            db.run(`INSERT INTO users (first_name, last_name, email, uin, password, verification_token) VALUES (?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, email, uin, hashedPassword, verificationToken],
                function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: "Failed to register user." });
                    res.status(201).json({ message: "Registration successful.", token: verificationToken });
                }
            );
        } catch (error) {
            res.status(500).json({ error: "Error encrypting password." });
        }
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (!row) return res.status(400).json({ error: "User not found." });
        
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(400).json({ error: "Invalid password." });
        
        if (row.is_verified === 0) return res.status(400).json({ error: "Please verify your email first." });
        
        // Critical: Sending email back so M2 frontend knows whose records to pull
        res.status(200).json({ 
            message: "Login successful!", 
            user: { email: row.email, firstName: row.first_name, isAdmin: row.is_admin } 
        });
    });
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email], function(err) {
            if (err) return res.status(500).json({ error: "Database error" });
            if (this.changes === 0) return res.status(404).json({ error: "User not found" });
            res.json({ message: "Password updated successfully!" });
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/update-profile', (req, res) => {
    const { email, firstName, lastName, uin } = req.body;
    db.run("UPDATE users SET first_name = ?, last_name = ?, uin = ? WHERE email = ?", 
    [firstName, lastName, uin, email], (err) => {
        if (err) return res.status(500).json({ error: "Profile update failed." });
        res.json({ message: "Profile updated successfully!" });
    });
});

app.post('/verify-2fa', (req, res) => {
    const { code } = req.body;
    if (code === "123456") res.json({ message: "2FA Verified!" });
    else res.status(400).json({ error: "Invalid 2FA code." });
});

// ==========================================
// MILESTONE 2: COURSE ADVISING ROUTES
// ==========================================

app.get('/api/advising-history/:email', (req, res) => {
    const { email } = req.params;
    db.all("SELECT id, date_submitted, current_term, status FROM advising_records WHERE user_email = ? ORDER BY date_submitted DESC", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error." });
        res.json(rows);
    });
});

app.post('/api/submit-advising', (req, res) => {
    const { email, lastTerm, lastGpa, currentTerm, pastCourses, plannedCourses } = req.body;
    
    // Prevent taking courses from last term
    const overlap = plannedCourses.some(plan => pastCourses && pastCourses.includes(plan.course_name));
    if (overlap) return res.status(400).json({ error: "Rule Violation: Cannot plan courses taken last term." });

    db.run(
        `INSERT INTO advising_records (user_email, last_term_attended, last_gpa, current_term, status) VALUES (?, ?, ?, ?, 'Pending')`,
        [email, lastTerm, lastGpa, currentTerm],
        function (err) {
            if (err) return res.status(500).json({ error: "Failed to create record." });
            const recordId = this.lastID;
            
            const stmt = db.prepare(`INSERT INTO planned_courses (record_id, level, course_name) VALUES (?, ?, ?)`);
            plannedCourses.forEach(course => stmt.run(recordId, course.level, course.course_name));
            stmt.finalize();
            
            res.status(201).json({ message: "Advising entry submitted.", recordId });
        }
    );
});

app.get('/api/advising-record/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM advising_records WHERE id = ?", [id], (err, record) => {
        if (err || !record) return res.status(404).json({ error: "Record not found." });
        
        db.all("SELECT * FROM planned_courses WHERE record_id = ?", [id], (err, courses) => {
            if (err) return res.status(500).json({ error: "Failed to fetch courses." });
            res.json({ ...record, plannedCourses: courses });
        });
    });
});

app.put('/api/update-advising/:id', (req, res) => {
    const { id } = req.params;
    const { lastTerm, lastGpa, currentTerm, plannedCourses } = req.body;

    db.get("SELECT status FROM advising_records WHERE id = ?", [id], (err, record) => {
        if (err || !record) return res.status(404).json({ error: "Record not found." });
        if (record.status !== 'Pending') return res.status(403).json({ error: "Read-only: Cannot edit an Approved or Rejected record." });

        db.run("UPDATE advising_records SET last_term_attended = ?, last_gpa = ?, current_term = ? WHERE id = ?",
            [lastTerm, lastGpa, currentTerm, id], (err) => {
                if (err) return res.status(500).json({ error: "Update failed." });
                
                db.run("DELETE FROM planned_courses WHERE record_id = ?", [id], (err) => {
                    const stmt = db.prepare(`INSERT INTO planned_courses (record_id, level, course_name) VALUES (?, ?, ?)`);
                    plannedCourses.forEach(course => stmt.run(id, course.level, course.course_name));
                    stmt.finalize();
                    res.json({ message: "Record updated." });
                });
            });
    });
});

// Server Start
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});