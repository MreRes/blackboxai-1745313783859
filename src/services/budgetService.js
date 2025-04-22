const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const moment = require('moment');

class BudgetService {
    constructor() {
        const adapter = new FileSync(path.join(process.env.DB_PATH, 'budgets.json'));
        this.db = low(adapter);
        
        // Initialize db with default structure
        this.db.defaults({
            budgets: {},
            history: []
        }).write();
    }

    async setBudget(category, amount) {
        const budget = {
            limit: parseFloat(amount),
            used: 0,
            lastReset: new Date().toISOString(),
            category
        };

        await this.db.set(`budgets.${category}`, budget).write();
        return budget;
    }

    async updateBudgetUsage(category, amount) {
        const budget = await this.db.get(`budgets.${category}`).value();
        if (!budget) return null;

        const newUsed = budget.used + parseFloat(amount);
        await this.db.set(`budgets.${category}.used`, newUsed).write();

        // Add to history
        await this.db.get('history')
            .push({
                category,
                amount: parseFloat(amount),
                timestamp: new Date().toISOString(),
                totalUsed: newUsed
            })
            .write();

        return {
            ...budget,
            used: newUsed,
            remaining: budget.limit - newUsed,
            percentage: (newUsed / budget.limit) * 100
        };
    }

    async getBudgetStatus(category) {
        const budget = await this.db.get(`budgets.${category}`).value();
        if (!budget) return null;

        return {
            ...budget,
            remaining: budget.limit - budget.used,
            percentage: (budget.used / budget.limit) * 100
        };
    }

    async getAllBudgets() {
        const budgets = await this.db.get('budgets').value();
        return Object.entries(budgets).reduce((acc, [category, budget]) => {
            acc[category] = {
                ...budget,
                remaining: budget.limit - budget.used,
                percentage: (budget.used / budget.limit) * 100
            };
            return acc;
        }, {});
    }

    async resetMonthlyBudgets() {
        const budgets = await this.db.get('budgets').value();
        
        for (const [category, budget] of Object.entries(budgets)) {
            const lastReset = moment(budget.lastReset);
            const now = moment();
            
            if (now.diff(lastReset, 'months') >= 1) {
                // Store the previous month's data in history
                await this.db.get('history')
                    .push({
                        category,
                        type: 'reset',
                        previousUsed: budget.used,
                        timestamp: now.toISOString()
                    })
                    .write();

                // Reset the budget
                await this.db.set(`budgets.${category}`, {
                    ...budget,
                    used: 0,
                    lastReset: now.toISOString()
                }).write();
            }
        }
    }

    async getPredictedOverspend() {
        const budgets = await this.getAllBudgets();
        const today = moment();
        const daysInMonth = today.daysInMonth();
        const currentDay = today.date();
        
        return Object.entries(budgets).reduce((acc, [category, budget]) => {
            const dailyRate = budget.used / currentDay;
            const predictedMonthlyUse = dailyRate * daysInMonth;
            
            if (predictedMonthlyUse > budget.limit) {
                acc[category] = {
                    predicted: predictedMonthlyUse,
                    limit: budget.limit,
                    overspend: predictedMonthlyUse - budget.limit
                };
            }
            return acc;
        }, {});
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    }

    formatBudgetReport(budget) {
        const status = budget.percentage >= 80 ? '⚠️ WASPADA!' : 
                      budget.percentage >= 50 ? '⚡ Perhatikan pengeluaran' : 
                      '✅ Aman';

        return `📊 *Budget: ${budget.category}*\n` +
               `━━━━━━━━━━━━━━━━━━\n` +
               `💰 Limit: ${this.formatCurrency(budget.limit)}\n` +
               `💸 Terpakai: ${this.formatCurrency(budget.used)}\n` +
               `💵 Sisa: ${this.formatCurrency(budget.remaining)}\n` +
               `📈 Progress: ${Math.round(budget.percentage)}%\n` +
               `${status}\n`;
    }

    formatAllBudgetsReport(budgets) {
        return `📊 *LAPORAN BUDGET*\n` +
               `━━━━━━━━━━━━━━━━━━\n\n` +
               Object.values(budgets)
                   .map(budget => this.formatBudgetReport(budget))
                   .join('\n');
    }
}

module.exports = BudgetService;
