import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-50 flex flex-col items-center justify-center p-6">
      <main className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          Roommate Expense System
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400">
          The easiest way to track shared expenses, settle debts, and live in peace with your roommates.
        </p>
        
        <div className="flex gap-4 justify-center pt-8">
          <Link href="/signup" className={buttonVariants({ size: "lg", className: "rounded-full px-8" })}>
            Get Started
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-8" })}>
            Log In
          </Link>
        </div>
      </main>
    </div>
  )
}
