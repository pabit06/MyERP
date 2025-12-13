'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Load remembered email from localStorage
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Skip to main content
      </a>

      {/* ARIA live region for error announcements */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {error && <span>{error}</span>}
        {emailError && <span>Email error: {emailError}</span>}
        {passwordError && <span>Password error: {passwordError}</span>}
      </div>

      {/* ARIA live region for loading state */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && <span>Signing in, please wait...</span>}
      </div>

      <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden">
        {/* Background Pattern - Right Side */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Decorative Circles */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-32 right-40 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl animate-pulse-slow animation-delay-3000" />
          <div className="absolute top-1/2 right-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse-slow animation-delay-6000" />

          {/* Geometric Shapes */}
          <div className="absolute top-40 right-32 w-32 h-32 border-2 border-indigo-200/30 rotate-45 rounded-lg animate-float" />
          <div className="absolute bottom-40 right-24 w-24 h-24 border-2 border-purple-200/30 rotate-12 rounded-full animate-float animation-delay-2000" />
          <div className="absolute top-1/3 right-16 w-16 h-16 bg-indigo-100/20 rotate-45 animate-float animation-delay-4000" />
        </div>

        {/* Left Panel - Branding & Visuals */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white">
          {/* Noise Texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150" />

          {/* Grid Overlay */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Animated Orbs with enhanced animation */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
          <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

          {/* Geometric Shapes - Left Panel */}
          <div className="absolute top-20 left-20 w-40 h-40 border-2 border-white/20 rotate-45 rounded-2xl animate-float" />
          <div className="absolute bottom-32 left-32 w-32 h-32 border-2 border-white/15 rotate-12 rounded-full animate-float animation-delay-3000" />
          <div className="absolute top-1/3 left-16 w-24 h-24 bg-white/10 rotate-45 rounded-lg animate-float animation-delay-5000" />
          <div className="absolute bottom-20 left-10 w-20 h-20 border-2 border-white/20 rotate-45 animate-float animation-delay-7000" />

          {/* Decorative Lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Floating Particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-float-particles" />
          <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-white/50 rounded-full animate-float-particles animation-delay-1000" />
          <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-float-particles animation-delay-2000" />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/40 rounded-full animate-float-particles animation-delay-3000" />
          <div className="absolute top-1/2 left-1/5 w-2 h-2 bg-white/35 rounded-full animate-float-particles animation-delay-4000" />

          <div className="relative z-10 flex flex-col justify-between w-full p-12 lg:p-16">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md shadow-lg border border-white/10">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">MyERP</span>
            </div>

            <div className="space-y-6 max-w-lg animate-fade-up">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                <span className="text-white">Manage your cooperative</span>
                <br />
                <span className="text-white">with confidence.</span>
              </h1>
              <p className="text-lg text-blue-50 leading-relaxed">
                Streamline operations, track finances, and empower your members with our
                comprehensive management solution built for modern cooperatives.
              </p>
              <div className="flex flex-wrap gap-4 pt-4" role="list" aria-label="Key features">
                <div className="flex items-center space-x-2 text-blue-100" role="listitem">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Secure & Reliable</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-100" role="listitem">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Easy to Use</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-100" role="listitem">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">24/7 Support</span>
                </div>
              </div>
            </div>

            <nav
              aria-label="Footer navigation"
              className="flex items-center justify-between text-sm text-blue-100 animate-fade-in"
            >
              <p>© 2025 MyERP System. All rights reserved.</p>
              <div className="flex space-x-6">
                <Link
                  href="#"
                  className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded transition-colors duration-200"
                >
                  Privacy
                </Link>
                <Link
                  href="#"
                  className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded transition-colors duration-200"
                >
                  Terms
                </Link>
                <Link
                  href="#"
                  className="hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded transition-colors duration-200"
                >
                  Help
                </Link>
              </div>
            </nav>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 xl:p-16 relative z-10">
          {/* Additional decorative elements for right panel */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            {/* Subtle gradient orbs */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-purple-100/25 rounded-full blur-3xl" />

            {/* Small decorative dots */}
            <div className="absolute top-32 left-20 w-1 h-1 bg-indigo-300/40 rounded-full" />
            <div className="absolute top-48 left-32 w-1.5 h-1.5 bg-purple-300/40 rounded-full" />
            <div className="absolute bottom-32 left-24 w-1 h-1 bg-blue-300/40 rounded-full" />
            <div className="absolute bottom-48 left-16 w-1.5 h-1.5 bg-indigo-300/40 rounded-full" />
          </div>

          <div className="w-full max-w-md space-y-8 animate-fade-up relative z-10">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
              <div className="p-2 bg-indigo-600 rounded-lg" aria-hidden="true">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">MyERP</h1>
            </div>

            <header className="text-center lg:text-left">
              <h1 className="sr-only lg:not-sr-only text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-2">
                Welcome back
              </h1>
              <h2 className="lg:sr-only text-3xl font-bold tracking-tight text-slate-900 mb-2">
                Welcome back
              </h2>
              <p className="mt-2 text-base text-slate-900">
                Please enter your details to sign in to your account.
              </p>
            </header>

            {error && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-red-50 border-2 border-red-300 flex items-start space-x-3 animate-shake shadow-sm"
              >
                <div className="flex-shrink-0 text-red-600 mt-0.5" aria-hidden="true">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-red-900 flex-1">{error}</p>
              </div>
            )}

            <main id="main-content">
              <form
                className="mt-8 space-y-6"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Login form"
              >
                <div className="space-y-5">
                  <div className="group">
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-slate-900 mb-2"
                    >
                      Email address
                      <span className="text-red-600 ml-1" aria-label="required">
                        *
                      </span>
                    </label>
                    <div className="relative">
                      <div
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                        aria-hidden="true"
                      >
                        <Mail
                          className={`h-5 w-5 transition-colors duration-200 ${
                            emailError
                              ? 'text-red-500'
                              : email
                                ? 'text-indigo-600'
                                : 'text-slate-500 group-focus-within:text-indigo-600'
                          }`}
                        />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        aria-required="true"
                        aria-invalid={emailError ? 'true' : 'false'}
                        aria-describedby={
                          emailError
                            ? 'email-error'
                            : email && !emailError
                              ? 'email-success'
                              : undefined
                        }
                        className={`block w-full pl-11 pr-4 py-3 border-2 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-offset-0 transition-all duration-200 sm:text-sm ${
                          emailError
                            ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
                            : email
                              ? 'border-green-500 focus:border-indigo-600 focus:ring-indigo-200'
                              : 'border-slate-400 focus:border-indigo-600 focus:ring-indigo-200'
                        }`}
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) validateEmail(e.target.value);
                        }}
                        onBlur={() => validateEmail(email)}
                      />
                      {email && !emailError && (
                        <div
                          id="email-success"
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none"
                          aria-hidden="true"
                        >
                          <CheckCircle2
                            className="h-5 w-5 text-green-600"
                            aria-label="Email is valid"
                          />
                        </div>
                      )}
                    </div>
                    {emailError && (
                      <p
                        id="email-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-700 flex items-center space-x-1"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-900 mb-2"
                    >
                      Password
                      <span className="text-red-600 ml-1" aria-label="required">
                        *
                      </span>
                    </label>
                    <div className="relative">
                      <div
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                        aria-hidden="true"
                      >
                        <Lock
                          className={`h-5 w-5 transition-colors duration-200 ${
                            passwordError
                              ? 'text-red-500'
                              : password
                                ? 'text-indigo-600'
                                : 'text-slate-500 group-focus-within:text-indigo-600'
                          }`}
                        />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        aria-required="true"
                        aria-invalid={passwordError ? 'true' : 'false'}
                        aria-describedby={
                          passwordError ? 'password-error' : 'password-toggle-description'
                        }
                        className={`block w-full pl-11 pr-11 py-3 border-2 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-offset-0 transition-all duration-200 sm:text-sm ${
                          passwordError
                            ? 'border-red-500 focus:border-red-600 focus:ring-red-200'
                            : password
                              ? 'border-green-500 focus:border-indigo-600 focus:ring-indigo-200'
                              : 'border-slate-400 focus:border-indigo-600 focus:ring-indigo-200'
                        }`}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) validatePassword(e.target.value);
                        }}
                        onBlur={() => validatePassword(password)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        aria-describedby="password-toggle-description"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded-r-xl transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                      <span id="password-toggle-description" className="sr-only">
                        Toggle password visibility
                      </span>
                    </div>
                    {passwordError && (
                      <p
                        id="password-error"
                        role="alert"
                        className="mt-1.5 text-sm font-medium text-red-700 flex items-center space-x-1"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        <span>{passwordError}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      aria-label="Remember me on this device"
                      className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 border-gray-400 rounded cursor-pointer transition-colors"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2.5 block text-sm font-medium text-slate-900 cursor-pointer select-none"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded transition-colors duration-200"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  aria-busy={isLoading}
                  aria-disabled={isLoading || !email || !password}
                  className="group w-full flex justify-center items-center py-3.5 px-4 border-2 border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-indigo-700 disabled:hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2.5 h-5 w-5" aria-hidden="true" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight
                        className="ml-2.5 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200"
                        aria-hidden="true"
                      />
                    </>
                  )}
                </button>
              </form>
            </main>

            <div className="mt-8 pt-6 border-t border-slate-300 text-center">
              <p className="text-sm text-slate-900">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded transition-colors duration-200"
                >
                  Register a new cooperative
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Styles for custom animations */}
        <style jsx global>{`
          /* Screen reader only class for accessibility */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
          .sr-only:focus {
            position: static;
            width: auto;
            height: auto;
            padding: inherit;
            margin: inherit;
            overflow: visible;
            clip: auto;
            white-space: normal;
          }
          .focus\\:not-sr-only:focus {
            position: static;
            width: auto;
            height: auto;
            padding: inherit;
            margin: inherit;
            overflow: visible;
            clip: auto;
            white-space: normal;
          }
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1) rotate(0deg);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1) rotate(120deg);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9) rotate(240deg);
            }
            100% {
              transform: translate(0px, 0px) scale(1) rotate(360deg);
            }
          }
          .animate-blob {
            animation: blob 8s ease-in-out infinite;
          }
          .animation-delay-1000 {
            animation-delay: 1s;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-3000 {
            animation-delay: 3s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          .animation-delay-5000 {
            animation-delay: 5s;
          }
          .animation-delay-6000 {
            animation-delay: 6s;
          }
          .animation-delay-7000 {
            animation-delay: 7s;
          }
          .animate-shake {
            animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
          }
          @keyframes shake {
            10%,
            90% {
              transform: translate3d(-1px, 0, 0);
            }
            20%,
            80% {
              transform: translate3d(2px, 0, 0);
            }
            30%,
            50%,
            70% {
              transform: translate3d(-4px, 0, 0);
            }
            40%,
            60% {
              transform: translate3d(4px, 0, 0);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          @keyframes fade-up {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-up {
            animation: fade-up 0.6s ease-out;
          }
          @keyframes pulse-slow {
            0%,
            100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.1);
            }
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          @keyframes float {
            0%,
            100% {
              transform: translateY(0px) rotate(0deg);
              opacity: 0.3;
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
              opacity: 0.6;
            }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          @keyframes float-particles {
            0%,
            100% {
              transform: translateY(0px) translateX(0px);
              opacity: 0.4;
            }
            25% {
              transform: translateY(-15px) translateX(10px);
              opacity: 0.6;
            }
            50% {
              transform: translateY(-25px) translateX(-5px);
              opacity: 0.5;
            }
            75% {
              transform: translateY(-10px) translateX(15px);
              opacity: 0.7;
            }
          }
          .animate-float-particles {
            animation: float-particles 8s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  );
}
