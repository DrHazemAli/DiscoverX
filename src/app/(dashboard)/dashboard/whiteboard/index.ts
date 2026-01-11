/**
 * ============================================================================
 * DISCOVER: Whiteboard Feature Index
 * Description: Export all whiteboard-related modules
 * ============================================================================
 */

// Types
export * from './types';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Server Actions
export {
  createWhiteboard,
  updateWhiteboard,
  deleteWhiteboard,
  archiveWhiteboard,
  unarchiveWhiteboard,
  toggleWhiteboardPublic,
  duplicateWhiteboard,
} from './actions';

// Editor
export { WhiteboardEditor } from './WhiteboardEditor';
