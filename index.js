require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const express = require('express');
const FinanceService = require('./src/services/financeService');
const BudgetService = require('./src/services/budgetService');
const MessageHandler = require('./src/services/messageHandler');

// Initialize services
const financeService = new FinanceService();
const budgetService = new BudgetService();
const messageHandler = new MessageHandler(financeService, budgetService);

// Initialize Express app for web dashboard
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static('public'));
app.use(express.json());

// Initialize WhatsApp bot using whatsapp-web.js
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: process.env.SESSION_PATH || 'tokens'
    }),
    puppeteer: {
        headless: false,
        args: []
    }
});

client.on('qr', (qr) => {
    // Display QR code in console
    console.log('QR RECEIVED', qr);
    // Optionally, you can generate and display QR code image here
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

client.on('message', async (message) => {
    if (message.from.includes('@g.us')) return; // Skip group messages

    try {
        const response = await messageHandler.handleMessage(message.body);
        await client.sendMessage(message.from, response);

        // Reset monthly budgets if needed (check daily)
        await budgetService.resetMonthlyBudgets();
    } catch (error) {
        console.error('Error handling message:', error);
        await client.sendMessage(
            message.from,
            '❌ Maaf, terjadi kesalahan. Silakan coba lagi atau ketik "bantuan" untuk panduan.'
        );
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out:', reason);
    client.initialize();
});

// Start the server
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/transactions', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'transactions.html'));
});

app.get('/budgets', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'budgets.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

// API Routes
app.get('/api/transactions', async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        
        const transactions = await financeService.getTransactionsByDateRange(startDate, endDate);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/budgets', async (req, res) => {
    try {
        const budgets = await budgetService.getAllBudgets();
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/monthly', async (req, res) => {
    try {
        const report = await financeService.getMonthlyReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}`);
});

client.initialize();
