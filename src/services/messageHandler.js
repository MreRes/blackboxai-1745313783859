const moment = require('moment');
moment.locale('id');

class MessageHandler {
    constructor(financeService, budgetService) {
        this.financeService = financeService;
        this.budgetService = budgetService;
    }

    async handleMessage(message) {
        const text = message.toLowerCase().trim();
        
        try {
            // Perintah Laporan
            if (text === 'laporan' || text === 'report') {
                return await this.handleDailyReport();
            }
            if (text === 'laporan bulanan' || text === 'monthly report') {
                return await this.handleMonthlyReport();
            }
            if (text === 'laporan tahun ini' || text === 'yearly report') {
                return await this.handleYearlyReport();
            }
            if (text === 'top pengeluaran' || text === 'top expenses') {
                return await this.handleTopExpenses();
            }

            // Perintah Budget
            if (text === 'status budget' || text === 'budget status') {
                return await this.handleBudgetStatus();
            }
            if (text.startsWith('atur budget') || text.startsWith('set budget')) {
                return await this.handleSetBudget(text);
            }
            if (text.startsWith('prediksi budget') || text.startsWith('predict budget')) {
                return await this.handleBudgetPrediction();
            }

            // Perintah Transaksi
            if (text.startsWith('catat pengeluaran') || text.startsWith('expense')) {
                return await this.handleExpense(text);
            }
            if (text.startsWith('catat pemasukan') || text.startsWith('income')) {
                return await this.handleIncome(text);
            }

            // Bantuan
            if (text === 'bantuan' || text === 'help') {
                return this.showHelp();
            }

            return this.showUnknownCommand();
        } catch (error) {
            console.error('Error handling message:', error);
            return 'Maaf, terjadi kesalahan. Silakan coba lagi atau ketik "bantuan" untuk melihat panduan.';
        }
    }

    async handleDailyReport() {
        const report = await this.financeService.getDailyReport();
        return this.financeService.formatReport(report);
    }

    async handleMonthlyReport() {
        const report = await this.financeService.getMonthlyReport();
        const budgets = await this.budgetService.getAllBudgets();
        
        let response = `📊 *LAPORAN BULANAN*\n`;
        response += `📅 ${moment().format('MMMM YYYY')}\n`;
        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += `💰 Pemasukan: ${this.financeService.formatCurrency(report.income)}\n`;
        response += `💸 Pengeluaran: ${this.financeService.formatCurrency(report.expense)}\n`;
        response += `💵 Saldo: ${this.financeService.formatCurrency(report.balance)}\n\n`;
        
        response += `📊 *Pengeluaran per Kategori:*\n`;
        for (const [category, amount] of Object.entries(report.categoryExpenses)) {
            const budget = budgets[category];
            const percentage = budget ? (amount / budget.limit * 100).toFixed(1) : 'N/A';
            response += `• ${category}: ${this.financeService.formatCurrency(amount)} ${budget ? `(${percentage}% dari budget)` : ''}\n`;
        }
        
        return response;
    }

    async handleYearlyReport() {
        const report = await this.financeService.getYearlyReport();
        
        let response = `📊 *LAPORAN TAHUNAN ${moment().format('YYYY')}*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        for (const [month, data] of Object.entries(report)) {
            response += `📅 *${month}*\n`;
            response += `💰 Pemasukan: ${this.financeService.formatCurrency(data.income)}\n`;
            response += `💸 Pengeluaran: ${this.financeService.formatCurrency(data.expense)}\n`;
            response += `💵 Saldo: ${this.financeService.formatCurrency(data.income - data.expense)}\n\n`;
        }
        
        return response;
    }

    async handleTopExpenses() {
        const expenses = await this.financeService.getTopExpenses();
        
        let response = `🔝 *TOP 5 PENGELUARAN TERBESAR*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        expenses.forEach((expense, index) => {
            response += `${index + 1}. ${expense.description}\n`;
            response += `   💸 ${this.financeService.formatCurrency(expense.amount)}\n`;
            response += `   📅 ${moment(expense.timestamp).format('DD MMMM YYYY')}\n`;
            response += `   📝 Kategori: ${expense.category}\n\n`;
        });
        
        return response;
    }

    async handleBudgetStatus() {
        const budgets = await this.budgetService.getAllBudgets();
        return this.budgetService.formatAllBudgetsReport(budgets);
    }

    async handleSetBudget(text) {
        // Format: atur budget [kategori] [jumlah]
        const parts = text.split(' ');
        if (parts.length < 4) {
            return 'Format: atur budget [kategori] [jumlah]\nContoh: atur budget makanan 2000000';
        }

        const category = parts[2];
        const amount = parseFloat(parts[3].replace(/[.,]/g, ''));

        if (isNaN(amount) || amount <= 0) {
            return 'Jumlah budget harus berupa angka positif.\nContoh: atur budget makanan 2000000';
        }

        const budget = await this.budgetService.setBudget(category, amount);
        return this.budgetService.formatBudgetReport(budget);
    }

    async handleBudgetPrediction() {
        const predictions = await this.budgetService.getPredictedOverspend();
        
        if (Object.keys(predictions).length === 0) {
            return '✅ *Semua budget masih dalam jalur yang aman!*';
        }

        let response = `⚠️ *PREDIKSI BUDGET OVERRUN*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        for (const [category, data] of Object.entries(predictions)) {
            response += `📊 *${category}*\n`;
            response += `Prediksi: ${this.financeService.formatCurrency(data.predicted)}\n`;
            response += `Budget: ${this.financeService.formatCurrency(data.limit)}\n`;
            response += `Potensi Overrun: ${this.financeService.formatCurrency(data.overspend)}\n\n`;
        }
        
        return response;
    }

    async handleExpense(text) {
        // Format: catat pengeluaran [jumlah] [kategori] [deskripsi]
        const parts = text.split(' ');
        if (parts.length < 4) {
            return 'Format: catat pengeluaran [jumlah] [kategori] [deskripsi]\nContoh: catat pengeluaran 50000 makanan nasi padang';
        }

        const amount = parseFloat(parts[2].replace(/[.,]/g, ''));
        const category = parts[3];
        const description = parts.slice(4).join(' ');

        if (isNaN(amount) || amount <= 0) {
            return 'Jumlah pengeluaran harus berupa angka positif.\nContoh: catat pengeluaran 50000 makanan nasi padang';
        }

        const transaction = await this.financeService.addTransaction('expense', amount, description, category);
        const budget = await this.budgetService.updateBudgetUsage(category, amount);

        let response = `✅ *Pengeluaran Tercatat*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += `📝 ${description}\n`;
        response += `💸 ${this.financeService.formatCurrency(amount)}\n`;
        response += `🏷️ Kategori: ${category}\n`;

        if (budget) {
            response += `\n📊 *Status Budget ${category}*\n`;
            response += `Terpakai: ${this.financeService.formatCurrency(budget.used)} (${Math.round(budget.percentage)}%)\n`;
            response += `Sisa: ${this.financeService.formatCurrency(budget.remaining)}\n`;
            
            if (budget.percentage >= 80) {
                response += `\n⚠️ *PERINGATAN*\nBudget ${category} sudah mencapai ${Math.round(budget.percentage)}%!`;
            }
        }

        return response;
    }

    async handleIncome(text) {
        // Format: catat pemasukan [jumlah] [deskripsi]
        const parts = text.split(' ');
        if (parts.length < 3) {
            return 'Format: catat pemasukan [jumlah] [deskripsi]\nContoh: catat pemasukan 5000000 gaji bulanan';
        }

        const amount = parseFloat(parts[2].replace(/[.,]/g, ''));
        const description = parts.slice(3).join(' ');

        if (isNaN(amount) || amount <= 0) {
            return 'Jumlah pemasukan harus berupa angka positif.\nContoh: catat pemasukan 5000000 gaji bulanan';
        }

        const transaction = await this.financeService.addTransaction('income', amount, description);

        let response = `✅ *Pemasukan Tercatat*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += `📝 ${description}\n`;
        response += `💰 ${this.financeService.formatCurrency(amount)}\n`;

        return response;
    }

    showHelp() {
        return `🤖 *BANTUAN ASISTEN KEUANGAN*\n` +
               `━━━━━━━━━━━━━━━━━━\n\n` +
               `*Perintah Laporan:*\n` +
               `• laporan - Laporan hari ini\n` +
               `• laporan bulanan - Laporan bulan ini\n` +
               `• laporan tahun ini - Laporan tahunan\n` +
               `• top pengeluaran - 5 pengeluaran terbesar\n\n` +
               
               `*Perintah Budget:*\n` +
               `• atur budget [kategori] [jumlah]\n` +
               `  Contoh: atur budget makanan 2000000\n` +
               `• status budget - Cek semua budget\n` +
               `• prediksi budget - Prediksi pengeluaran\n\n` +
               
               `*Perintah Transaksi:*\n` +
               `• catat pengeluaran [jumlah] [kategori] [deskripsi]\n` +
               `  Contoh: catat pengeluaran 50000 makanan nasi padang\n` +
               `• catat pemasukan [jumlah] [deskripsi]\n` +
               `  Contoh: catat pemasukan 5000000 gaji bulanan\n\n` +
               
               `*Tips:*\n` +
               `• Gunakan angka tanpa titik/koma\n` +
               `• Deskripsi bisa lebih dari satu kata\n` +
               `• Kategori yang umum: makanan, transport, utilitas, dll`;
    }

    showUnknownCommand() {
        return `❌ Maaf, perintah tidak dikenali.\n\n` +
               `Ketik "bantuan" atau "help" untuk melihat daftar perintah yang tersedia.`;
    }
}

module.exports = MessageHandler;
