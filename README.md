
Built by https://www.blackbox.ai

---

```markdown
# WhatsApp Finance Assistant

## Project Overview
WhatsApp Finance Assistant is a WhatsApp bot designed for personal finance management with capabilities for reporting, transaction tracking, and budget management. It allows users to interact with their financial data via WhatsApp, making it easy to manage expenses, set budgets, and obtain financial reports directly through chat.

## Installation

To get started with the WhatsApp Finance Assistant, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/whatsapp-finance-assistant.git
   cd whatsapp-finance-assistant
   ```

2. **Install dependencies:**
   Make sure you have Node.js installed. Then run:
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   In the root directory, create a `.env` file and add your configurations. Make sure to set the `SESSION_PATH` variable to specify where session tokens should be stored.

4. **Start the application:**
   You can run the application in development mode using:
   ```bash
   npm run dev
   ```
   Or start it normally using:
   ```bash
   npm start
   ```

## Usage
Upon starting the application, a QR code will be generated in the console. Scan the QR code with your WhatsApp mobile app to authenticate the bot.  

You can then interact with the bot by sending messages. Use specific commands to check your financial data, update your budgets, or generate reports.

### Web Dashboard
The application also provides a web dashboard accessible by navigating to `http://localhost:8000` in your web browser. The dashboard allows you to view and manage transactions, budgets, and generate reports visually.

## Features
- **WhatsApp Integration:** Communicate and manage finances directly through WhatsApp.
- **Transaction Management:** Track and retrieve financial transactions.
- **Budget Management:** Set and reset monthly budgets.
- **Reporting Capabilities:** Generate monthly financial reports.
- **Web Dashboard:** User-friendly web interface for managing finances.

## Dependencies
The project relies on several npm packages, as outlined in `package.json`:

- **venom-bot:** For WhatsApp bot functionality.
- **express:** Web framework for building the API and serving the web dashboard.
- **dotenv:** For managing environment variables.
- **moment:** A library for handling date and time.
- **lowdb:** A simple database for storing financial data.

### Development Dependencies
- **nodemon:** For automatically restarting the application during development.

## Project Structure
The project structure is organized as follows:

```
whatsapp-finance-assistant/
│
├── public/                # Static files (CSS, JS, Images)
│
├── src/                  # Source files
│   ├── services/         # Service classes for finance, budget, and message handling
│   │   ├── budgetService.js
│   │   ├── financeService.js
│   │   └── messageHandler.js
│
├── views/                # HTML views for the web dashboard
│   ├── budgets.html
│   ├── index.html
│   ├── reports.html
│   └── transactions.html
│
├── .env                  # Environment variables
├── index.js              # Main entry point
└── package.json          # NPM package descriptor
```

## Conclusion
The WhatsApp Finance Assistant is an innovative solution for personal finance management, allowing users to interact with their financial data through a familiar messaging platform. Explore the features and start managing your finances effectively!

**Feel free to contribute to the project by opening issues or submitting pull requests. Happy budgeting!**
```