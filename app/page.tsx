export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          AI Meeting Scheduler
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          AI-powered meeting scheduling with natural language constraints
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/auth/signin"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/auth/signup"
            className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}
