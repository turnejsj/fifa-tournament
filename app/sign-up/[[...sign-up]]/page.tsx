import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0d0d0d] border border-[#1a1a1a] shadow-xl",
          },
        }}
      />
    </div>
  )
}
