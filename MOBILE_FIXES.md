# Mobile startup and performance fixes

## What changed

- Added an early boot guard so the static fallback layout is not painted before GSAP initializes.
- Kept the hero poster/background visible during boot instead of showing broken intro geometry.
- Deferred non-critical section JavaScript with dynamic imports after the intro is ready.
- Delayed the hero text entrance until critical fonts are available (with a 1.6s safety fallback).
- Changed the stable mobile canvas measurement to use CSS `100svh` instead of the transient initial `visualViewport.height`.
- Added a 720x1280 H.264 MP4 source for the mobile hero and a lightweight poster.
- The video remains visually hidden until playback actually starts; if iOS blocks autoplay, the poster remains instead of exposing the native play overlay.
- Reinforced `muted`, `playsInline`, no controls, no PiP, and no remote playback in JavaScript.
- Removed the scrubbed video blur on mobile; desktop keeps the original blur effect.
- Reduced the mobile portfolio glass blur from 18px to 7px and simplified mobile card shadow cost.
- Resized portfolio images to a maximum of 1200x1800. Total portfolio image payload dropped from about 3.21 MB to about 0.43 MB.
- Cleared `will-change` after the About copy animation.

## Validation performed

- JavaScript syntax check passed for the modified animation files.
- Video files were inspected with `ffprobe`.
- A full Astro build was not completed in the sandbox because dependency installation timed out twice. Run `npm install` and `npm run build` locally before deploy.

## Device test checklist

1. Clear Safari website data or use a fresh private tab so fonts/media are not cached.
2. Open the deployed URL once without reloading.
3. Confirm the hero never appears oversized or shifted horizontally before animation begins.
4. Confirm the hero video starts muted and inline on a normal iPhone Safari session.
5. Enable Low Power Mode and confirm the fallback is a clean poster rather than an exposed native play button.
6. Scroll quickly through Hero -> Portfolio -> About and compare stutter with the previous build.
7. Rotate portrait -> landscape -> portrait and confirm the intro geometry rebuilds correctly.
8. Test the Contact form after the deferred modules have loaded.
