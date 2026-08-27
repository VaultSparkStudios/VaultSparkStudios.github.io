# Performance Trace — S142

Generated: 2026-08-27T06:11:11.628Z
Base URL: http://127.0.0.1:4850

| Route | Status | LCP | LCP Budget | INP | INP Budget | FCP | CLS | DCL | Load | TTFB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| / | 200 | 1424ms | 1800ms | 40ms | 300ms | 1424ms | 0 | 319ms | 340ms | 27ms |
| /oracle/ | 200 | 292ms | 1800ms | 64ms | 300ms | 292ms | 0.0079 | 325ms | 330ms | 10ms |
| /membership/ | 200 | 416ms | 1800ms | 248ms | 300ms | 416ms | 0 | 344ms | 350ms | 11ms |
| /vaultsparked/ | 200 | 456ms | 1800ms | 48ms | 300ms | 456ms | 0.0012 | 371ms | 380ms | 9ms |
| /community/ | 200 | 348ms | 1800ms | 0ms | 300ms | 348ms | 0 | 334ms | 336ms | 12ms |
| /games/ | 200 | 284ms | 1800ms | 72ms | 300ms | 284ms | 0 | 291ms | 297ms | 11ms |

## Stylesheet Shell
- /: OK
- /oracle/: OK
- /membership/: OK
- /vaultsparked/: FAIL: 1
- /community/: OK
- /games/: OK
