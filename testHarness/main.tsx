/**
 * Test Harness Entry Point
 *
 * This is the minimal entry point for the FluentUI Extended test harness.
 * All component examples and application logic are in separate modules.
 *
 * @see ./App.tsx - Main application shell
 * @see ./examples/ - Individual component example modules
 */

import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Shot } from './shots/Shot';

// =============================================================================
// BOOTSTRAP
// =============================================================================

/**
 * Mount the React application to the DOM.
 * The root element is defined in index.html.
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in DOM');
}

/**
 * `?shot=<id>` swaps the whole harness for a single isolated component, used to
 * capture documentation screenshots. `?shot=index` lists what is available.
 */
const shotId = new URLSearchParams(window.location.search).get('shot');

createRoot(rootElement).render(shotId ? <Shot id={shotId} /> : <App />);
