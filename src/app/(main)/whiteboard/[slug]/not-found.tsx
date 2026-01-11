/**
 * ============================================================================
 * DISCOVER: Public Whiteboard Not Found Page
 * Description: 404 page for public whiteboards
 * ============================================================================
 */

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function WhiteboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Whiteboard Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          This whiteboard doesn't exist or is no longer public.
          It may have been deleted or made private by its owner.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="primary">Go Home</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
