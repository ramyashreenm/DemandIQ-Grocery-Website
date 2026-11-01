const pool = require("./db");

async function test() {
    try {
        const [rows] = await pool.query("SELECT 1 AS connected");
        console.log("MySQL connected:", rows[0].connected);
    } catch (err) {
        console.error("MySQL connection failed:", err.message);
    } finally {
        await pool.end();
    }
}

test();