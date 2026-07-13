<div align="center">

# 🏠 Shared Expense System

**The cleanest way to track shared expenses with your roommates.**  
Split bills, settle debts, and live in peace — with full **Nepali Rupee (NPR) & Bikram Sambat (BS)** support.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Email/password & Google OAuth via Supabase Auth |
| 🏘️ **Multiple Rooms** | Create or join multiple rooms — manage different groups of friends |
| 💸 **Expense Splitting** | Add shared or personal expenses, split equally among members |
| ⚖️ **Balance Tracking** | Automatically calculates who owes whom |
| ✅ **Settle Up** | Mark debts as paid with one click |
| 🇳🇵 **NPR / BS Support** | Display amounts in Nepali Rupees and dates in Bikram Sambat — switchable per session |
| 📋 **Activity Logs** | Full history of all expenses and settlements |
| 🔗 **Invite Codes** | Share a unique code to invite roommates to your room |
| ⚡ **Real-time** | Supabase Realtime enabled for expenses and settlements |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, Server Actions)
- **Backend / Database:** [Supabase](https://supabase.com) (PostgreSQL + Auth + Realtime)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **Language:** TypeScript
- **Nepali Date:** [`@sbmdkl/nepali-date-converter`](https://www.npmjs.com/package/@sbmdkl/nepali-date-converter)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- A [Supabase](https://supabase.com) project (free tier works fine)

### 1. Clone the repository

```bash
git clone https://github.com/Susant07-star/Shared_Expense_System.git
cd Shared_Expense_System/roommate-expense-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> You can find these in your Supabase project under **Settings → API**.

### 4. Set up the database

Copy the SQL from [`supabase_schema.sql`](./supabase_schema.sql) and run it in your Supabase project's **SQL Editor**.

This sets up:
- All tables (`users`, `rooms`, `room_members`, `expenses`, `expense_splits`, `settlements`, `activity_logs`)
- Row Level Security (RLS) policies
- Triggers for auto-creating user profiles
- RPC functions for invite code lookup
- Realtime publication

### 5. (Optional) Enable Google OAuth

In your Supabase dashboard → **Authentication → Providers → Google**, enable Google and add your OAuth credentials. Set the callback URL to:

```
https://your-project.supabase.co/auth/v1/callback
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login & Signup pages + server actions
│   │   ├── login/
│   │   └── signup/
│   ├── auth/callback/     # OAuth callback handler
│   └── dashboard/         # Protected dashboard pages
│       ├── activity/      # Activity log
│       ├── expenses/      # Full expense history
│       ├── members/       # Room members list
│       └── settings/      # Room settings
├── components/
│   ├── dashboard-view.tsx # Main dashboard UI (client component)
│   └── shared/
│       └── dashboard-nav.tsx  # Sidebar with room switcher
└── lib/
    ├── balances.ts        # Balance calculation logic
    ├── nepali.ts          # NPR/BS date & currency formatting
    └── supabase/          # Supabase client helpers
```

---

## 🗃️ Database Schema

```
auth.users (Supabase)
    │
    ▼
public.users ──────────── public.room_members ──── public.rooms
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            public.expenses          public.settlements
                    │
                    ▼
          public.expense_splits

public.activity_logs (linked to rooms + users)
```

---

## 🇳🇵 Nepali Support

This app supports **Nepali Rupees (NPR)** and **Bikram Sambat (BS)** dates as the primary display format.

- All amounts are stored internally in **USD** and converted on display
- All dates are stored in **UTC** and converted to BS using [`@sbmdkl/nepali-date-converter`](https://www.npmjs.com/package/@sbmdkl/nepali-date-converter) — no hardcoded calendar tables
- Users can switch between **NPR/BS** and **USD/AD** via the currency dropdown in the dashboard

---

## 🔒 Security

- All database tables have **Row Level Security (RLS)** enabled
- Users can only read/write data for rooms they are members of
- `.env.local` is excluded from version control via `.gitignore`
- Auth tokens are managed securely via Supabase SSR cookies

---

## 📜 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ using Next.js and Supabase
</div>
