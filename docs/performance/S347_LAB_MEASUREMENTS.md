# S347 final-candidate lab measurements

Six routes, one isolated final-candidate run each after the local preview cache contract was corrected. Lighthouse 13.3.0, mobile simulated throttling; performance category only. Full per-report configuration and exact metrics are in the companion JSON.

| Route | Score | Simulated LCP (ms) | Observed LCP (ms) | CLS | Simulated TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| / | 73 | 1600.756 | 426 | 0.036998 | 1643.381 |
| /news/ | 74 | 2763.609 | 1697 | 0.002093 | 926.657 |
| /changelog/ | 77 | 2801.326 | 1102 | 0.002093 | 705.118 |
| /community/ | 89 | 2022.870 | 895 | 0.000000 | 406.565 |
| /evidence/ | 92 | 2090.910 | 687 | 0.000000 | 315.545 |
| /news/directors-report/ | 99 | 2123.448 | 953 | 0.002093 | 32.276 |

The preview now serves content-addressed shell assets as immutable. Fresh reports contain one shell stylesheet transfer per route, eliminating the prior preload/no-store double download. The remaining misses are documented exceptions, not conformance or release approval.

Host load was not isolated. Concurrent activity is a confounder, not evidence that production passes. The local simulated metrics vary materially across repeated Home and News runs; observed trace timing does not replace a simulated target miss. Changelog's large document and eager reaction hydration remain the strongest product-side follow-up for the next audited wave.

| Report | Measured UTC | Raw report SHA256 |
| --- | --- | --- |
| home | 2026-09-09T20:20:04.131Z | cb7efaab2612b4f5774c24d8cc02a6d9125131594ce79573b921e5fcea268683 |
| news | 2026-09-09T20:34:55.253Z | 5ca8de826b9f2c7fa673775d797831aee05bdb6cadc4ce605a6d3a0a443583fa |
| changelog | 2026-09-09T20:13:25.342Z | 4001387b5e2e1e5df78831b1225be8871b0dc048b92d8cd79e6e18c4f744656e |
| community | 2026-09-09T20:16:36.792Z | d5fe3fd59a40963ace9b805a022f0261188a1062a83ba9523693a376aafe271d |
| evidence | 2026-09-09T20:16:33.527Z | 879a04b32f92013611b5c3aae9fbaf650bf5fb2629b5d5d18495c6e0303db3f3 |
| news-directors-report | 2026-09-09T20:16:33.934Z | 0a82674ef6a4680f89df4e35b84d77de798a5a956bd30b6fedb62a93816c91b1 |

The raw reports remain local. Hashes bind the inspected bytes; local filesystem paths are omitted.
