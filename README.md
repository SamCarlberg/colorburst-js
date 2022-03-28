# Colorburst

![img](img/colorburst-512x16.png)

Procedurally generate bursts of color!

![img](img/colorburst-512x512.gif)

Original inspiration from
https://theomg.github.io/omnichroma (which has been relocated to https://sophmrs.github.io/omnichroma/)


See it in action at https://samcarlberg.github.io/colorburst-js/


## Time Requirements

Colorburst renders about 30,000-60,000 pixels per second on a 2020 M1 Macbook Air, depending on image resolution. Higher resolutions render at a slower rate. Aspect ratios near 1 also render slower due to a large boundary existing for more time during processing (eg 4096x4096 renders nearly twice as slowly as 16384x1024, despite having the same number of pixels).

Chromium-based browsers such as Chrome and Edge are recommended for faster processing times.

#### Common Render Times

| Resolution | Pixel Count | Approximate Render Time |
|------------|-------------|-------------------------|
| 512x512    | 262,144     | 5 seconds               |
| 1024x1024  | 1,048,576   | 30 seconds              |
| 1920x1080  | 2,073,600   | 1 minute                |
| 2560x1440  | 3,686,400   | 2 minutes 30 seconds    |
| 2880x1800  | 5,184,000   | 4 minutes 30 seconds    |
| 3840x2160  | 8,294,400   | 10 minutes              |
| 4096x4096  | 16,777,216  | 20 minutes              |
| 16384x1024 | 16,777,216  | 12 minutes              |
