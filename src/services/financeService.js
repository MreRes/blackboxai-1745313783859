const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const moment = require('moment');

class FinanceService {
    constructor() {
        const adapter = new FileSync(path.join(process.env.DB_PATH, 'transactions.json'));
        this.db = low(adapter);
        
        // Initialize db with default structure
        this.db.defaults({ transactions: [], categories: [] }).write();
    }

    async addTransaction(type, amount, description, category = 'uncategorized') {
        const transaction = {
            id: Date.now().toString(),
            type,
            amount: parseFloat(amount),
            description,
            category,
            timestamp: new Date().toISOString()
        };

        await this.db.get('transactions')
            .push(transaction)
            .write();

        return transaction;
    }

    async getTransactionsByDateRange(startDate, endDate) {
        return this.db.get('transactions')
            .filter(t => {
                const date = moment(t.timestamp);
                return date.isBetween(startDate, endDate, 'day', '[]');
            })
            .value();
    }

    async getDailyReport() {
        const today = moment().startOf('day');
        const transactions = await this.getTransactionsByDateRange(today, moment());
        
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            income,
            expense,
            balance: income - expense,
            transactions
        };
    }

    async getMonthlyReport() {
        const startOfMonth = moment().startOf('month');
        const transactions = await this.getTransactionsByDateRange(startOfMonth, moment());
        
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const categoryExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});

        return {
            income,
            expense,
            balance: income - expense,
            categoryExpenses,
            transactions
        };
    }

    async getYearlyReport() {
        const startOfYear = moment().startOf('year');
        const transactions = await this.getTransactionsByDateRange(startOfYear, moment());
        
        const monthlyData = transactions.reduce((acc, t) => {
            const month = moment(t.timestamp).format('MMMM');
            if (!acc[month]) {
                acc[month] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                acc[month].income += t.amount;
            } else {
                acc[month].expense += t.amount;
            }
            return acc;
        }, {});

        return monthlyData;
    }

    async getTopExpenses(limit = 5) {
        return this.db.get('transactions')
            .filter({ type: 'expense' })
            .orderBy('amount', 'desc')
            .take(limit)
            .value();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    formatReport(data) {
        return `📊 *LAPORAN KEUANGAN*\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `💰 Pemasukan: ${this.formatCurrency(data.income)}\n` +
               `💸 Pengeluaran: ${this.formatCurrency(data.expense)}\n` +
               `💵 Saldo: ${this.formatCurrency(data.balance)}\n\n` +
               `📝 *Detail Transaksi Terakhir:*\n` +
               data.transactions.slice(0, 5).map(t => 
                   `• ${t.type === 'expense' ? '🔴' : '🟢'} ${t.description}: ${this.formatCurrency(t.amount)}`
               ).join('\n');
    }
}

module.exports = FinanceService;
