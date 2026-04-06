const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Using serialize ensures tables are created safely without locking
        db.serialize(() => {
            // 1. Original Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                uin TEXT NOT NULL,
                password TEXT NOT NULL,
                is_verified BOOLEAN DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                verification_token TEXT,
                reset_token TEXT
            )`, (err) => {
                if (!err) {
                    // Ensure the 1 required admin exists
                    checkAndCreateAdmin();
                }
            });

            // 2. New Advising Records Table
            db.run(`CREATE TABLE IF NOT EXISTS advising_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                last_term_attended TEXT,
                last_gpa TEXT,
                current_term TEXT,
                status TEXT DEFAULT 'Pending',
                date_submitted DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_email) REFERENCES users(email)
            )`);

            // 3. New Planned Courses Table
            db.run(`CREATE TABLE IF NOT EXISTS planned_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER,
                level TEXT,
                course_name TEXT,
                FOREIGN KEY (record_id) REFERENCES advising_records(id)
            )`);
        });
    }
});

function checkAndCreateAdmin() {
    db.get("SELECT * FROM users WHERE is_admin = 1", (err, row) => {
        if (!row) {
            const adminEmail = "admin@odu.edu";
            const adminPass = bcrypt.hashSync("AdminPass123!", 10); // Encrypts password for the rubric
            db.run(`INSERT INTO users (first_name, last_name, email, uin, password, is_verified, is_admin) 
                    VALUES ('System', 'Admin', ?, '00000000', ?, 1, 1)`, 
                    [adminEmail, adminPass], (insertErr) => {
                if (!insertErr) console.log('Default admin created: admin@odu.edu / AdminPass123!');
            });
        }
    });
}

module.exports = db;