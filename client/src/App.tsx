import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { usePath } from './lib/router';
import { Contact } from './pages/Contact';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

/**
 * The editor is the heavy half of the bundle — timeline, export pipeline,
 * transcript dialogs, the whole render spec — and the landing page is what most
 * visitors load first. Splitting it keeps that weight off the first paint.
 */
const Editor = lazy(() => import('./pages/Editor').then((module) => ({ default: module.Editor })));

/** Every route that renders a marketing page. Anything else is a 404. */
const SITE_ROUTES: Record<string, ComponentType> = {
  '/': Landing,
  '/privacy': Privacy,
  '/terms': Terms,
  '/contact': Contact,
};

export default function App() {
  const path = usePath();

  if (path === '/app') {
    return (
      <Suspense fallback={<div className="app-loading" />}>
        <Editor />
      </Suspense>
    );
  }

  const Page = SITE_ROUTES[path];
  return Page ? <Page /> : <NotFound />;
}
