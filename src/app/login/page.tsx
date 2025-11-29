import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory text-espresso p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-terracotta mb-2">MISE</h1>
          <p className="text-olive text-lg">Your Kitchen Assistant</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-parchment">
          <h2 className="text-2xl font-display mb-6 text-center">Sign In</h2>

          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-mocha mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-warm-gray-light rounded-lg focus:ring-2 focus:ring-terracotta focus:border-transparent outline-none transition-all"
                placeholder="chef@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-mocha mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 border border-warm-gray-light rounded-lg focus:ring-2 focus:ring-terracotta focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" // In real app this calls supabase.auth.signIn
              className="w-full bg-terracotta text-white font-bold py-3 rounded-lg hover:bg-terracotta-dark transition-colors shadow-md hover:shadow-lg transform active:scale-95 duration-200"
            >
               <Link href="/profiles" className="w-full block h-full">
                 Sign In
               </Link>
            </button>
          </form>

           <div className="mt-6 text-center text-sm text-mocha">
            <p>Don't have an account? <a href="#" className="text-terracotta font-semibold hover:underline">Sign up</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
