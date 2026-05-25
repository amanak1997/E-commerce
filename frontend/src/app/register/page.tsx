'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      toast.success('Account created! Welcome 🎉');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold text-2xl">
            <Package className="w-8 h-8" />
            <span>MyStore</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Create your account</h1>
          <p className="text-gray-500 mt-1">Join thousands of happy shoppers</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} className="input" required />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input" required autoComplete="email" />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} className="input pr-11" required minLength={8} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className="input" required />
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary btn-lg">
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
