# 💡 SplitSmart — Smart Room Expense Splitter

A **production-grade SaaS** web application that splits roommate expenses based on **actual item consumption** — not equal splits!

## 🏗 Tech Stack

| Layer      | Technology                |
|------------|---------------------------|
| Frontend   | React + Vite + Framer Motion |
| Styling    | Tailwind CSS v4 + Custom CSS Design System |
| Backend    | Node.js + Express         |
| Database   | MongoDB + Mongoose        |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install & Configure Backend

```bash
cd server
npm install
# Edit .env with your MongoDB URI
npm run seed   # Populate with sample data
npm start      # Starts on http://localhost:5000
```

### 2. Run Frontend

```bash
cd client
npm install
npm run dev    # Starts on http://localhost:5173
```

## 📂 Project Structure

```
Room_split/
├── server/                    # Node.js + Express Backend
│   ├── models/
│   │   ├── User.js            # User + dietary preferences
│   │   ├── Group.js           # Roommate groups
│   │   ├── Expense.js         # Per-item expenses with consumers
│   │   └── Settlement.js      # Payment settlements
│   ├── controllers/           # Business logic
│   ├── routes/                # REST API endpoints
│   ├── utils/splitAlgorithm.js # Core split + minimization engine
│   ├── seed.js                # Sample data seeder
│   └── server.js              # Express entry point
│
└── client/                    # React Frontend
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx   # Animated stats + recent activity
        │   ├── Expenses.jsx    # Expense list with item breakdown
        │   ├── Transactions.jsx # Timeline view
        │   ├── Settlement.jsx  # Minimized settlement plan
        │   └── Members.jsx    # Member management
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── TopBar.jsx
        │   ├── StatCard.jsx    # Animated counter cards
        │   └── AddExpenseModal.jsx  # 3-step smart modal
        ├── context/AppContext.jsx
        └── services/api.js
```

## 🧠 How the Split Algorithm Works

1. **Per-item split**: Each item is split only among its consumers
2. **Net balance**: Compute who owes/is owed overall
3. **Settlement minimization**: Greedy algorithm reduces N*(N-1)/2 possible payments to minimum

### Example
```
Grocery: ₹850
  - Rice ₹280 → ALL 4 consume → ₹70 each
  - Chicken ₹250 → Only Rahul → ₹250 (Rahul)
  - Milk ₹80 → Arjun, Rahul, Sneha (Priya is vegan) → ₹26.67 each
```

## 🎨 Design System

- **Font**: Inter + Poppins
- **Colors**: Indigo/Purple primary gradient, dark glassmorphism cards
- **Animations**: Framer Motion page transitions, modal slide-up, stat card counters

## 📡 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/groups` | All groups |
| GET | `/api/groups/:id` | Group with balances |
| GET | `/api/groups/:id/suggestions` | Smart consumption suggestions |
| GET | `/api/expenses?groupId=` | Group expenses |
| POST | `/api/expenses` | Create + auto-split |
| GET | `/api/settlements/suggest/:groupId` | Minimized settlement plan |
| POST | `/api/settlements` | Record payment |

## 🌱 Sample Data

The seed script creates 4 users (Arjun, Priya, Rahul, Sneha) with dietary preferences and 4 realistic expenses with proper per-item splits.
