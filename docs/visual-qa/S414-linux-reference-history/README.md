# S414 Linux reference update — games · iPhone 13 · light

Required e2e failed this cell in every run from 42770782410 through 42809434406.
In run 42809434406 (candidate f8034d7) the first attempt and its retry rendered
pixel-identical images (0 differing pixels), and both differed from the committed
reference by ~11,190 pixels: the hero lede paragraph sits one pixel higher, with
eyebrow, heading, stats, header and consent banner identical. The committed
reference therefore held the minority raster state of a fractional-offset paragraph
(top 289.578 CSS px at device-pixel-ratio 3).

The reference was replaced with the reviewed CI render from that run (first attempt).
The previous reference is preserved here as `*.previous.png`. Camera, options and the
1.5% tolerance are unchanged; no other cell was regenerated.
