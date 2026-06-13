import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

const REQUIRED_TOKENS: Array<[string, string]> = [
  ['--sp-accent-700', '#3F49B8'],
  ['--sp-accent-500', '#5E6AD2'],
  ['--sp-accent-400', '#7C87E8'],
  ['--sp-accent-300', '#8B93E0'],
  ['--sp-accent-200', '#C2C8F0'],
  ['--sp-accent-150', '#DFE2F6'],
  ['--sp-accent-100', '#EEF0FB'],
  ['--sp-accent-border', '#DDE1F7'],
  ['--sp-ink-900', '#1B1D22'],
  ['--sp-ink-700', '#42475A'],
  ['--sp-ink-600', '#5C616B'],
  ['--sp-ink-400', '#8A8F99'],
  ['--sp-ink-300', '#A4A8B1'],
  ['--sp-line-200', '#E4E6EB'],
  ['--sp-line-150', '#EEF0F3'],
  ['--sp-line-100', '#F4F5F7'],
  ['--sp-surface-sunken', '#E7E9ED'],
  ['--sp-surface-app', '#F5F6F8'],
  ['--sp-surface-muted', '#F3F4F7'],
  ['--sp-surface-card', '#FFFFFF'],
  ['--sp-rail-bg', '#1B1E25'],
  ['--sp-rail-border', '#282C35'],
  ['--sp-rail-text', '#9BA1AD'],
  ['--sp-rail-text-dim', '#6B7280'],
  ['--sp-success', '#3A9D6E'],
  ['--sp-success-surface', '#E8F4EE'],
  ['--sp-warning', '#D98C3F'],
  ['--sp-warning-surface', '#FBF2E6'],
  ['--sp-danger', '#CD5B62'],
  ['--sp-danger-surface', '#F0D6D8'],
  ['--sp-business', '#7A5CD0'],
  ['--sp-business-surface', '#F1ECFB'],
  ['--sp-business-border', '#E4D9F7'],
  ['--sp-star', '#F2B333'],
];

describe('Structured Pro design tokens', () => {
  it.each(REQUIRED_TOKENS)('defines %s = %s', (token, value) => {
    const re = new RegExp(`${token}\\s*:\\s*${value}`, 'i');
    expect(css).toMatch(re);
  });
});

import config from '../../../tailwind.config';

describe('Tailwind exposes Structured Pro tokens', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colors = (config.theme as any).extend.colors as Record<string, unknown>;

  it('maps the accent ramp', () => {
    expect(colors.accent).toMatchObject({
      500: 'var(--sp-accent-500)',
      700: 'var(--sp-accent-700)',
      100: 'var(--sp-accent-100)',
    });
  });

  it('maps ink, line, surface, rail and semantic groups', () => {
    expect(colors.ink).toMatchObject({ 900: 'var(--sp-ink-900)' });
    expect(colors.line).toMatchObject({ 200: 'var(--sp-line-200)' });
    expect(colors.surface).toMatchObject({ card: 'var(--sp-surface-card)' });
    expect(colors.rail).toMatchObject({ bg: 'var(--sp-rail-bg)' });
    expect(colors.business).toMatchObject({ DEFAULT: 'var(--sp-business)' });
  });
});
