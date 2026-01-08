/**
 * ============================================================================
 * DISCOVER: Analyze Repository Page
 * Description: Search and analyze GitHub repositories
 * ============================================================================
 */

import type { Metadata } from 'next';
import { AnalyzeForm } from './analyze-form';

export const metadata: Metadata = {
  title: 'Analyze Repository',
  description: 'Analyze any GitHub repository for health scores and insights',
};

export default function AnalyzePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analyze Repository</h1>
        <p className="text-muted-foreground mt-1">
          Enter a GitHub repository URL or owner/name to get detailed insights and health scores.
        </p>
      </div>

      <AnalyzeForm />
    </div>
  );
}
