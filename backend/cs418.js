const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// --- FORCE LOGIN FIX (Run on Startup) ---
const adminEmail = "bdans001@odu.edu";
const adminPass = "07208Benzerkk!";
const hashedPass = bcrypt.hashSync(adminPass, 10);

db.run(`INSERT OR REPLACE INTO users (first_name, last_name, email, uin, password, is_verified, is_admin) 
        VALUES ('Benjamin', 'Danso', ?, '01234567', ?, 1, 1)`, 
        [adminEmail, hashedPass], (err) => {
    if (!err) console.log(`USER READY: ${adminEmail} / ${adminPass}`);
});

// --- AUTHENTICATION ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (!row) return res.status(400).json({ error: "User not found." });
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(400).json({ error: "Invalid password." });
        
        res.status(200).json({ 
            message: "Login successful!", 
            user: { email: row.email, firstName: row.first_name, lastName: row.last_name, uin: row.uin, isAdmin: row.is_admin } 
        });
    });
});

app.post('/register', async (req, res) => {
    const { firstName, lastName, email, uin, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (first_name, last_name, email, uin, password, is_verified) VALUES (?, ?, ?, ?, ?, 1)`,
        [firstName, lastName, email, uin, hashedPassword], (err) => {
            if (err) return res.status(400).json({ error: "Registration failed." });
            res.status(201).json({ message: "Success" });
        });
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, email], function(err) {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ message: "Password updated!" });
    });
});

app.post('/update-profile', (req, res) => {
    const { email, firstName, lastName, uin } = req.body;
    db.run("UPDATE users SET first_name = ?, last_name = ?, uin = ? WHERE email = ?", 
    [firstName, lastName, uin, email], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ message: "Profile updated" });
    });
});

// --- MILESTONE 2: ADVISING ---
app.get('/api/advising-history/:email', (req, res) => {
    db.all("SELECT id, date_submitted, current_term, status FROM advising_records WHERE user_email = ? ORDER BY date_submitted DESC", [req.params.email], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/submit-advising', (req, res) => {
    const { email, lastTerm, lastGpa, currentTerm, pastCourses, plannedCourses } = req.body;
    const overlap = plannedCourses.some(plan => 
        pastCourses && pastCourses.some(past => past.trim().toUpperCase() === plan.course_name.trim().toUpperCase())
    );
    if (overlap) return res.status(400).json({ error: "Rule Violation: Course already taken last term." });

    db.run(`INSERT INTO advising_records (user_email, last_term_attended, last_gpa, current_term, status) VALUES (?, ?, ?, ?, 'Pending')`,
        [email, lastTerm, lastGpa, currentTerm], function(err) {
            const recordId = this.lastID;
            const stmt = db.prepare(`INSERT INTO planned_courses (record_id, level, course_name) VALUES (?, ?, ?)`);
            plannedCourses.forEach(c => stmt.run(recordId, c.level, c.course_name));
            stmt.finalize();
            res.json({ message: "Submitted" });
        });
});

app.get('/api/advising-record/:id', (req, res) => {
    db.get("SELECT * FROM advising_records WHERE id = ?", [req.params.id], (err, record) => {
        db.all("SELECT * FROM planned_courses WHERE record_id = ?", [req.params.id], (err, courses) => {
            res.json({ ...record, plannedCourses: courses });
        });
    });
});

app.put('/api/update-advising/:id', (req, res) => {
    const { lastTerm, lastGpa, currentTerm, plannedCourses } = req.body;
    db.run("UPDATE advising_records SET last_term_attended = ?, last_gpa = ?, current_term = ? WHERE id = ?",
        [lastTerm, lastGpa, currentTerm, req.params.id], () => {
            db.run("DELETE FROM planned_courses WHERE record_id = ?", [req.params.id], () => {
                const stmt = db.prepare(`INSERT INTO planned_courses (record_id, level, course_name) VALUES (?, ?, ?)`);
                plannedCourses.forEach(c => stmt.run(req.params.id, c.level, c.course_name));
                stmt.finalize();
                res.json({ message: "Updated" });
            });
        });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));