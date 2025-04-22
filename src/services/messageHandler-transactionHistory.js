async handleTransactionHistory() {
        const report = await this.financeService.getDailyReport();
        return this.financeService.formatReport(report);
    }

    async handleTransactionHistoryCustom(text) {
        // Format: riwayat transaksi dari [startDate] sampai [endDate]
        const regex = /riwayat transaksi dari (\d{1,2}\/\d{1,2}\/\d{4}) sampai (\d{1,2}\/\d{1,2}\/\d{4})/;
        const match = text.match(regex);
        if (!match) {
            return 'Format riwayat transaksi tidak valid. Contoh: riwayat transaksi dari 1/6/2023 sampai 30/6/2023';
        }
        const startDate = new Date(match[1]);
        const endDate = new Date(match[2]);
        if (isNaN(startDate) || isNaN(endDate)) {
            return 'Tanggal tidak valid. Pastikan format tanggal adalah DD/MM/YYYY';
        }
        const transactions = await this.financeService.getTransactionsByDateRange(startDate, endDate);
        let response = `📋 *RIWAYAT TRANSAKSI*\n`;
        response += `Periode: ${match[1]} sampai ${match[2]}\n`;
        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += transactions.slice(0, 20).map(t =>
            `• ${t.type === 'expense' ? '🔴' : '🟢'} ${t.description}: ${this.financeService.formatCurrency(t.amount)}`
        ).join('\n');
        return response;
    }
