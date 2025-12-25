import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Layout, Sparkles, Zap, Globe, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Premium Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-semibold tracking-tight text-gray-900">OpenFlow</span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
                  <Link href="/projects">
                    <Button size="sm" className="shadow-sm">
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="sm" variant="outline" className="shadow-sm">
                    Sign In
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Elegant & Spacious */}
      <section className="pt-24 pb-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Open Source • AI-Powered • Local-First</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 mb-6 leading-tight">
              Build Websites
              <br />
              <span className="text-blue-600">with AI</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              An elegant alternative to Webflow. Design visually, let AI handle the details. 
              Powered by Gemini, Grok, OpenRouter, and Ollama-cloud.
            </p>

            {/* CTA */}
            <div className="flex items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/projects">
                  <Button size="lg" className="shadow-lg shadow-blue-500/20 h-12 px-8">
                    Open Builder
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="shadow-lg shadow-blue-500/20 h-12 px-8">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              )}
              <Link href="/projects">
                <Button size="lg" variant="outline" className="h-12 px-8 shadow-sm">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Clean Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-4">
                Professional Website Building
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Everything you need to create beautiful, functional websites with AI assistance
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                  <Layout className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Visual Builder</h3>
                <p className="text-gray-600 leading-relaxed">
                  Drag-and-drop interface with real-time preview. Design exactly what you envision.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered</h3>
                <p className="text-gray-600 leading-relaxed">
                  Let AI build and modify your site through natural conversation. Just describe what you want.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group p-8 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6 group-hover:bg-green-100 transition-colors">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Export Anywhere</h3>
                <p className="text-gray-600 leading-relaxed">
                  Download clean HTML/CSS or deploy directly. Your code, your choice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-6">
              Ready to build something amazing?
            </h2>
            <p className="text-lg text-gray-600 mb-10">
              Join professionals who trust OpenFlow for their web projects
            </p>
            {isAuthenticated ? (
              <Link href="/projects">
                <Button size="lg" className="shadow-lg shadow-blue-500/20 h-12 px-8">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="shadow-lg shadow-blue-500/20 h-12 px-8">
                  Start Building
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">OpenFlow Builder</span>
            </div>
            <p className="text-sm text-gray-500">
              Built with care for professionals
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
