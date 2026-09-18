// ABOUTME: Tests that ProviderRegistry can construct a provider for catalog entries
// ABOUTME: declaring type "openai-compat" (PRI-3179) — covers createProvider direct
// ABOUTME: dispatch and a scan of every shipped catalog file using that type.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProviderRegistry } from '../registry';
import { OpenAIProvider } from '../openai-provider';

const CATALOG_DATA_DIR = path.join(__dirname, '..', 'catalog', 'data');

describe('ProviderRegistry → openai-compat', () => {
  let tempDir: string;
  let originalLaceDir: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-openai-compat-'));
    originalLaceDir = process.env.LACE_DIR;
    process.env.LACE_DIR = tempDir;
    ProviderRegistry.clearInstance();
  });

  afterEach(() => {
    if (originalLaceDir === undefined) delete process.env.LACE_DIR;
    else process.env.LACE_DIR = originalLaceDir;
    fs.rmSync(tempDir, { recursive: true, force: true });
    ProviderRegistry.clearInstance();
  });

  it('createProvider("openai-compat", config) returns an OpenAIProvider', () => {
    const registry = ProviderRegistry.getInstance();

    const provider = registry.createProvider('openai-compat', {
      apiKey: 'test-key',
      baseURL: 'https://api.groq.com/openai/v1',
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.isConfigured()).toBe(true);
  });

  it('every shipped catalog file declaring type "openai-compat" is dispatchable', () => {
    const registry = ProviderRegistry.getInstance();
    const files = fs.readdirSync(CATALOG_DATA_DIR).filter((f) => f.endsWith('.json'));

    const openaiCompatFiles = files.filter((f) => {
      const raw = fs.readFileSync(path.join(CATALOG_DATA_DIR, f), 'utf-8');
      return (JSON.parse(raw) as { type?: string }).type === 'openai-compat';
    });

    // Guard against silent catalog drift: this repo ships 11 openai-compat
    // catalog entries as of PRI-3179. If this count changes, update it —
    // but never let it silently drop to zero.
    expect(openaiCompatFiles.length).toBe(11);

    for (const file of openaiCompatFiles) {
      const raw = fs.readFileSync(path.join(CATALOG_DATA_DIR, file), 'utf-8');
      const catalog = JSON.parse(raw) as { type: string; id: string };

      expect(() => registry.createProvider(catalog.type, { apiKey: 'test-key' })).not.toThrow(
        /Unknown provider/
      );
    }
  });
});
