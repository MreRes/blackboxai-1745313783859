require('dotenv').config();
const venom = require('venom-bot');
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

// Initialize WhatsApp bot
async function initializeBot() {
    try {
        const client = await venom.create(
            'finance-assistant',
            (base64Qr, asciiQR, attempts, urlCode) => {
                console.log('QR Code generated:', asciiQR);
            },
            (statusSession, session) => {
                console.log('Status Session:', statusSession);
            },
            {
                folderNameToken: process.env.SESSION_PATH,
                mkdirFolderToken: true,
                headless: true,
                useChrome: false,
                debug: false,
                logQR: true,
                browserArgs: ['--no-sandbox'],
                multidevice: true,
                disableWelcome: true,
                createPathFileToken: true,
            }
        );

        // Handle incoming messages
        client.onMessage(async (message) => {
            if (message.isGroupMsg) return; // Skip group messages

            try {
                const response = await messageHandler.handleMessage(message.body);
                await client.sendText(message.from, response);
                
                // Reset monthly budgets if needed (check daily)
                await budgetService.resetMonthlyBudgets();
            } catch (error) {
                console.error('Error handling message:', error);
                await client.sendText(
                    message.from,
                    '❌ Maaf, terjadi kesalahan. Silakan coba lagi atau ketik "bantuan" untuk panduan.'
                );
            }
        });

        // Handle disconnections
        client.onStateChange((state) => {
            console.log('State changed:', state);
            if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
                client.useHere();
            }
        });

        // Handle client disconnection
        client.onDisconnected((reason) => {
            console.log('Client disconnected:', reason);
            // Attempt to reconnect
            initializeBot();
        });

        return client;
    } catch (error) {
        console.error('Error creating client:', error);
        // Retry initialization after delay
        setTimeout(initializeBot, 5000);
    }
}

// Web Dashboard Routes
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}`);
});

// Initialize the WhatsApp bot
initializeBot().then(() => {
    console.log('WhatsApp bot initialized successfully');
}).catch((error) => {
    console.error('Failed to initialize WhatsApp bot:', error);
});
