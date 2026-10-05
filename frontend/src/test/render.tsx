import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

let currentLocation = '';

/** Exposes the router location to tests (pathname + search). */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  currentLocation = location.pathname + location.search;
  return null;
};

export const location = () => currentLocation;

/** Renders a page at `url`, mounted on `path` so route params work. Other routes render a marker. */
export function renderAt(ui: React.ReactElement, { url, path }: { url: string; path: string }) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <LocationProbe />
      <Routes>
        <Route path={path} element={ui} />
        <Route path="*" element={<p>other route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
