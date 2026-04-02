import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginSignupRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')

  // Unauthenticated: block everything except login/signup/onboarding
  if (!user && !isLoginSignupRoute && !isOnboardingRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Unauthenticated hitting /onboarding → redirect to login
  if (!user && isOnboardingRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated hitting login/signup → send to dashboard
  if (user && isLoginSignupRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Authenticated hitting /onboarding: let the page component handle org check + redirect

  return supabaseResponse
}
