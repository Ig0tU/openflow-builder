import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout, Loader2 } from "lucide-react";

export default function Login() {
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: () => {
            setLocation("/projects");
        },
        onError: (err) => {
            setError(err.message || "Login failed");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Layout className="w-8 h-8 text-blue-600" />
                    <span className="text-2xl font-semibold tracking-tight text-gray-900">OpenFlow</span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
                        Welcome back
                    </h1>
                    <p className="text-gray-600 text-center mb-8">
                        Sign in to your account
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm">{error}</p>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-gray-600 text-sm mt-6">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-blue-600 hover:underline font-medium">
                            Create one
                        </Link>
                    </p>
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    <Link href="/" className="hover:underline">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}
