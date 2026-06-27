# ShopMate KP 🏪
> A digital Point-of-Sale (POS) and credit ledger (*Udhaar*) management system custom-built for Kiryana stores, general stores, and micro-retailers in Pakistan.

ShopMate KP is a full-stack web application designed to help small shopkeepers transition from manual paper-based registers (*khata*) to a digital, offline-first dashboard. It handles billing, tracks inventory, calculates net profit margins, registers customers, monitors credit lines, categorizes business expenses, and offers local AI-driven business insights.

---

## 🚀 Core Features

### 1. Sales & POS Billing
- **Dynamic Cart Management:** Add items easily, change quantities, and check real-time totals.
- **Flexible Payments:** Support for multiple payment methods: **Cash**, **Digital** (EasyPaisa / JazzCash), **Card**, and **Udhaar** (Credit).
- **Discounts & Balances:** Apply flat discounts to invoices and calculate cash-change dynamically.
- **Printable Receipts:** Instantly generates a clean, digital receipt (with custom Urdu/English thank-you footer) ready to print (`Ctrl + P`) or save.

### 2. Udhaar (Credit) Ledger
- **Digital Khata:** Record credit purchases (*debits*) and customer payments (*credits*) to keep a running balance.
- **Credit Limits:** Enforce maximum credit limits per customer (default: Rs. 15,000) to minimize business risk.
- **Customer Directory:** Register customers with phone numbers and view historical ledgers.

### 3. Inventory Management
- **Stock Tracking:** Maintain items with categories, buying prices, selling prices, and stock counts.
- **Profit Tracking:** Automatically calculates individual item profit based on the gap between buying and selling prices.
- **Auto-Restock Indicators:** Visual alerts for items that are running out or completely out of stock.

### 4. Expense Tracker
- **Deduct Overheads:** Record daily overheads like electricity bills, rent, shop-boy salaries, transport, tea, or damaged goods.
- **Net Profit Calculations:** Deducts expenses from total revenue to compute the *true net earnings* of the shop.

### 5. Reports & Analytics
- **Sales & Profit Targets:** Set a daily sales target in Settings and view progress via visual ring gauges.
- **Recharts Visualization:** Displays interactive charts showing **Weekly Sales trends** and **Payment Method distributions**.
- **Historical Analysis:** Toggle between **Daily Reports** and **Monthly Reports** to inspect sales, gross profit, total expenses, and net profit.

### 6. AI Business Advisor
- **Rule-Based Insights:** Instantly runs analytical SQL queries against the local DB.
- **Actionable Banners:**
  - 📦 **Low Stock Warnings:** Alerts when critical items have $\le 5$ units remaining.
  - 💰 **Debt Collections:** Identifies top customers with outstanding balances exceeding Rs. 1,000.
  - 🔥 **Weekly Top Sellers:** Reports the best-performing inventory items.
  - 📈 **Profit Margin Diagnostics:** Evaluates the day's profit margin percentage (Excellent $\ge 25\%$, Good $\ge 15\%$, Low $< 15\%$).

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express:** Lightweight, fast backend API routing.
- **sql.js (SQLite WebAssembly):** Serverless, local SQL database that loads/saves dynamically to a local file (`shopmate.db`) using Node FS APIs.
- **Helmet & CORS:** Pre-configured security middleware.

### Frontend
- **React 19 & Vite:** A fast dev server and optimized client application.
- **React Router DOM v7:** Client-side routing.
- **Axios:** Handles HTTP requests to the local Express API.
- **Recharts:** Responsive SVG graphs for sales trends and payment metrics.
- **Lucide React:** Icon library for a clean interface.
- **Custom CSS:** High-fidelity, premium styles located in [professional.css](file:///e:/Web%20Development/Projects/shopmate-kp/frontend/src/professional.css) with support for dark mode aesthetics and glassmorphism.

---

## 📂 Project Structure

```text
shopmate-kp/
├── backend/                  # Express REST API & SQLite Database
│   ├── routes/               # API Router Handlers (Sales, Products, AI, Expenses, etc.)
│   ├── database.js           # sql.js configuration, schema creation & seeding
│   ├── server.js             # Express application listener (Port 3001)
│   ├── shopmate.db           # Persistent SQLite database file (automatically generated)
│   └── package.json
│
├── frontend/                 # React Single Page App (Vite)
│   ├── public/               # Favicon & assets
│   ├── src/
│   │   ├── api/              # Axios request configurations
│   │   ├── components/       # Shared UI elements (Modal, ConfirmDialog, Sidebar, TopBar)
│   │   ├── context/          # State managers (Toast, Layout)
│   │   ├── pages/            # Application views (Sales POS, Udhaar, Reports, AIAdvisor, etc.)
│   │   ├── App.jsx           # App layout and route declarations
│   │   ├── professional.css  # Premium layout styles
│   │   └── main.jsx
│   ├── vite.config.js        # Vite dev server configuration & API Proxy (/api -> port 3001)
│   ├── .gitignore            # Frontend-specific gitignores
│   └── package.json
│
├── .gitignore                # Root-level Git configurations (ignores db, node_modules, etc.)
└── README.md                 # Project documentation
```

---

## 🔌 Installation & Getting Started

### Prerequisites
Make sure you have **Node.js** (v18 or higher) and **Git** installed on your system.

### Step 1: Clone the Repository
```bash
git clone https://github.com/Naveeduhassan/shopmate-kp.git
cd shopmate-kp
```

### Step 2: Set up the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs nodemon):
   ```bash
   npm run dev
   ```
   *The backend will initialize, generate the SQLite database structure, seed it with sample products (Milk, Sugar, Rice, Tea, etc.) and run on **`http://localhost:3001`**.*

### Step 3: Set up the Frontend
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend application will start on **`http://localhost:5173`**.*

### Step 4: Access the App
Open your web browser and go to **`http://localhost:5173`**. The Vite server automatically proxies all backend API calls to `http://localhost:3001/api`.

---

## 🗄️ Database Schema

The SQLite schema initializes the following tables when the backend starts:
- **`products`:** Stores catalog details (buying price, selling price, stock, category).
- **`customers`:** Manages client metadata and debt profiles (credit limits).
- **`sales`:** Records transactions, invoices, total payment amounts, gross profits, and payment styles.
- **`sale_items`:** A junction table tracking individual items sold in each invoice.
- **`udhaar`:** Tracks credit ledgers (debits and repayment transactions) bound to customer profiles.
- **`expenses`:** Records utility bills, damaged items, wages, and other overhead costs.

---

## ⚠️ Git Clean-Up Notice

Because the repository was initialized and committed before a root `.gitignore` was configured, the `backend/node_modules/` folder and the local `backend/shopmate.db` SQLite database were committed into Git history. 

To clean up your repository, run the following commands at the root of the project to remove them from tracking without deleting the actual files on your machine:

```bash
# 1. Remove tracked node_modules
git rm -r --cached backend/node_modules

# 2. Remove the tracked local database
git rm --cached backend/shopmate.db

# 3. Commit the changes
git commit -m "chore: untrack node_modules and local SQLite database"

# 4. Push the branch
git push origin main
```
The root `.gitignore` will ensure these files are never committed again.
