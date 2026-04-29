const assert = require('assert');

async function runTests() {
    console.log("=====================================");
    console.log("INITIATING BACKEND SECURITY TESTS...");
    console.log("=====================================\n");
    
    // TEST 1: Admin API Accessibility
    const res1 = await fetch('http://localhost:5000/api/admin/advising');
    assert.strictEqual(res1.status, 200, "Test 1 Failed: Admin route is down.");
    console.log("✅ TEST 1 PASSED: Admin advising route is online and responding (Status 200).");

    // TEST 2: reCAPTCHA Security Block
    const res2 = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "bdans001@odu.edu", password: "Student2026!" })
    });
    assert.strictEqual(res2.status, 400, "Test 2 Failed: Allowed login without reCAPTCHA token.");
    console.log("✅ TEST 2 PASSED: Backend securely blocked login attempt missing reCAPTCHA token.");

    // TEST 3: Course Overlap Business Logic
    const res3 = await fetch('http://localhost:5000/api/submit-advising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: "bdans001@odu.edu", lastTerm: "Fall", lastGpa: "3.0", currentTerm: "Spring",
            pastCourses: ["CS410"], plannedCourses: [{ level: "Undergraduate", course_name: "CS410" }]
        })
    });
    assert.strictEqual(res3.status, 400, "Test 3 Failed: Allowed overlapping courses.");
    console.log("✅ TEST 3 PASSED: System successfully prevented duplicate past/planned courses.\n");
    
    console.log("ALL TESTS EXECUTED SUCCESSFULLY.");
}

runTests().catch(err => console.error("Test execution failed:", err));