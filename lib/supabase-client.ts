import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const missingEnvMessage =
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."

const missingEnvClient = new Proxy(
  {},
  {
    get() {
      throw new Error(missingEnvMessage)
    },
  }
)

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (missingEnvClient as ReturnType<typeof createClient>)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(missingEnvMessage)
}
