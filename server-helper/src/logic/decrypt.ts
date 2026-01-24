import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load WASM buffer synchronously
const wasmPath = path.join(__dirname, 'dha/dha-release.wasm');
const wasmBuffer = fs.readFileSync(wasmPath);

// Inject into global scope for main.js to pick up
(globalThis as any).WASM_BUFFER = wasmBuffer;

// Import the patched main.js
// @ts-ignore
import { init, decryptM3u8 } from './dha/main.js';

export async function initializeDha() {
    await init();
}

export async function decrypt(content: any, p1?: any, p2?: any, p3?: any, p4?: any) {
    // Wrapper for Ga (decryptM3u8)
    // Check main.js signature: async function Ga(A, e = !0, t = !1, i = !1, a = !1, B = null)
    // It takes 6 arguments.
    // We export it as decryptM3u8 in main.js
    
    // We need to initialize first if not already
    await initializeDha();
    return decryptM3u8(content, p1, p2, p3, p4);
}
