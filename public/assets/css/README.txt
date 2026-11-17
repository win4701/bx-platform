BLOXIO CSS split
================

Files:
- base.css: design tokens, reset, global foundations, visibility and animations.
- layout.css: application shell, header, navigation, sidebar and footer layout.
- components.css: reusable controls and shared UI components.
- pages.css: wallet, market, casino, mining, airdrop, settings, auth, swap and page-specific styling.
- responsive.css: media/container/supports rules and responsive overrides.

Load in this exact order in each HTML page:
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/layout.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/pages.css">
<link rel="stylesheet" href="/assets/css/responsive.css">

The split is based on the supplied styles.css. No HTML or JavaScript was modified.
The five output files contain the same total CSS source bytes as the original file.
A CSS parser check reported zero top-level parse errors in the original and each output file.

Important:
- This is a structural split, not a browser/runtime visual test.
- Keep any separately loaded casino-premium.css only if it is still required by the current page/module integration.
- Replace the old styles.css link with these five links; do not load both the original and split files together, as that would duplicate rules.
