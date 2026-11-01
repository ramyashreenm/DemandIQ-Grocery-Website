const pool = require("./db");

async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(100),
                price DECIMAL(10,2),
                stock INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS demand_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                weekly_sales INT NOT NULL,
                demand_change DECIMAL(5,2) DEFAULT 0,
                safety_stock DECIMAL(5,2) DEFAULT 0,
                suggested_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        console.log("All three tables created successfully!");
    } catch (error) {
        console.error("Error creating tables:", error.message);
    } finally {
        await pool.end();
    }
}

createTables();