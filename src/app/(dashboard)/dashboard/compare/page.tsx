/**
 * ============================================================================
 * DISCOVER: Compare Repositories Page
 * Description: Compare multiple GitHub repositories side by side
 * ============================================================================
 */

import type { Metadata } from 'next';
import { CompareForm } from './compare-form';

export const metadata: Metadata = {
  title: 'Compare Repositories',
  description: 'Compare GitHub repositories side by side',
};

export default function ComparePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compare Repositories</h1>
        <p className="text-muted-foreground mt-1">
          Add repositories to compare their health scores, activity, and metrics side by side.
        </p>
      </div>

      <CompareForm />
    </div>
  );
}
