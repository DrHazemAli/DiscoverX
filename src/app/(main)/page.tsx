/**
 * ============================================================================
 * DISCOVER: Home Page
 * Description: Landing page with search and featured content
 * ============================================================================
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import {
  Search,
  TrendingUp,
  GitCompare,
  Star,
  Zap,
  Shield,
  BarChart3,
  Activity,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// Features Data
// ============================================================================

const features = [
  {
    icon: BarChart3,
    title: 'Health Scores',
    description:
      'Get comprehensive health scores based on activity, community engagement, maintenance, and more.',
  },
  {
    icon: TrendingUp,
    title: 'Rankings',
    description:
      'Discover top repositories by language, trending projects, and rising stars in the community.',
  },
  {
    icon: GitCompare,
    title: 'Compare',
    description:
      'Side-by-side comparison of repositories to make informed decisions on which to use.',
  },
  {
    icon: Zap,
    title: 'Alternatives',
    description:
      'Find similar repositories and alternatives to any project you are evaluating.',
  },
  {
    icon: Activity,
    title: 'Time Series',
    description:
      'Track how repositories evolve over time with historical metrics and trends.',
  },
  {
    icon: Shield,
    title: 'Quality Signals',
    description:
      'Evaluate project quality through documentation, license, issues, and PR patterns.',
  },
];

const stats = [
  { label: 'Repositories Tracked', value: '100K+' },
  { label: 'Daily Updates', value: '24/7' },
  { label: 'Score Dimensions', value: '5' },
  { label: 'Languages Supported', value: '50+' },
];

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ============================================================================
// Home Page Component
// ============================================================================

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-sm font-medium mb-6"
              variants={itemVariants}
            >
              <Star className="h-4 w-4" />
              <span>Open Source Analytics Platform</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
              variants={itemVariants}
            >
              Discover the best
              <br />
              <span className="text-muted-foreground">repositories</span>
              <br />
              for your next project
            </motion.h1>

            {/* Description */}
            <motion.p
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Analyze GitHub repositories with health scores, rankings, and insights.
              Make informed decisions about dependencies and discover alternatives.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              variants={itemVariants}
            >
              <Link href="/search">
                <Button size="lg" leftIcon={<Search className="h-5 w-5" />}>
                  Search Repositories
                </Button>
              </Link>
              <Link href="/rankings">
                <Button variant="outline" size="lg" leftIcon={<TrendingUp className="h-5 w-5" />}>
                  View Rankings
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={itemVariants}
              >
                <div className="text-3xl md:text-4xl font-bold">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to evaluate repositories
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive analytics and insights to help you make better decisions
              about open source dependencies.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="group p-6 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get insights on any GitHub repository in seconds
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
          >
            {[
              {
                step: '1',
                title: 'Search or Enter URL',
                description: 'Search for repositories or paste a GitHub URL directly',
              },
              {
                step: '2',
                title: 'View Health Score',
                description: 'Get a comprehensive health score across 5 dimensions',
              },
              {
                step: '3',
                title: 'Compare & Decide',
                description: 'Compare with alternatives and make informed decisions',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative text-center"
                variants={itemVariants}
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
                
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <motion.div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to discover better repositories?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start exploring open source projects with confidence. Get health scores,
            find alternatives, and compare repositories.
          </p>
          <Link href="/search">
            <Button
              size="lg"
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Get Started Free
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
