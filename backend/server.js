const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    res.send("DemandIQ Backend is running!");
});

// Database test
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1 AS connected");
        res.json({
            message: "Database connected successfully!",
            connected: rows[0].connected
        });
    } catch (error) {
        res.status(500).json({ error: "Database connection failed" });
    }
});

// User registration
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful!"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed" });
    }
});

// User login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful!",
            token: token,
            name: user.name
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Login failed" });
    }
});
// Get all grocery products
app.get("/api/products", async (req, res) => {
    try {
        const [products] = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Could not fetch products" });
    }
});

// Add a grocery product
app.post("/api/products", async (req, res) => {
    try {
        const { name, category, price, stock } = req.body;

        if (!name || price == null || stock == null) {
            return res.status(400).json({
                message: "Name, price and stock are required"
            });
        }

        const [result] = await pool.query(
            "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)",
            [name, category || null, price, stock]
        );

        res.status(201).json({
            message: "Product saved successfully!",
            productId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: "Could not save product" });
    }
});
// Get all demand plans
app.get("/api/demand-plans", async (req, res) => {
    try {
        const [plans] = await pool.query(`
            SELECT
                dp.*,
                p.name AS product_name,
                p.stock AS current_stock
            FROM demand_plans dp
            JOIN products p ON dp.product_id = p.id
            ORDER BY dp.id DESC
        `);

        res.json(plans);
    } catch (error) {
        res.status(500).json({
            message: "Could not fetch demand plans"
        });
    }
});
// Create and save a demand plan
app.post("/api/demand-plans", async (req, res) => {
    try {
        const {
            product_id,
            weekly_sales,
            demand_change,
            safety_stock
        } = req.body;

        if (
            !Number.isInteger(Number(product_id)) ||
            weekly_sales == null ||
            demand_change == null ||
            safety_stock == null ||
            !Number.isFinite(Number(weekly_sales)) ||
            !Number.isFinite(Number(demand_change)) ||
            !Number.isFinite(Number(safety_stock)) ||
            Number(weekly_sales) < 0 ||
            Number(safety_stock) < 0
        ) {
            return res.status(400).json({
                message: "Please enter valid demand plan details"
            });
        }

        const [products] = await pool.query(
            "SELECT stock FROM products WHERE id = ?",
            [product_id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const currentStock = Number(products[0].stock);

        const projectedDemand = Math.ceil(
            Number(weekly_sales) * (1 + Number(demand_change) / 100)
        );

        const buffer = Math.ceil(
            projectedDemand * Number(safety_stock) / 100
        );

        const suggestedOrder = Math.max(
            0,
            projectedDemand + buffer - currentStock
        );

        const [result] = await pool.query(
            `INSERT INTO demand_plans
            (product_id, weekly_sales, demand_change, safety_stock, suggested_order)
            VALUES (?, ?, ?, ?, ?)`,
            [
                product_id,
                weekly_sales,
                demand_change,
                safety_stock,
                suggestedOrder
            ]
        );

        res.status(201).json({
            message: "Demand plan saved successfully!",
            suggested_order: suggestedOrder,
            planId: result.insertId
        });

    } catch (error) {
        res.status(500).json({
            message: "Could not save demand plan"
        });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`DemandIQ server running on port ${PORT}`);
});