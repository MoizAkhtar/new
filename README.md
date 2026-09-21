# Moiz Akhtar — Interactive Portfolio

A complete redesign inspired by editorial product sites: warm paper background, acid-lime accents, procedural 3D scenes, motion graphics, and scroll-driven reveals.

## Preview locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Notes

- The site is intentionally dependency-light and works as a static GitHub Pages site.
- Three.js is loaded from CDN for the procedural 3D models. The models are generated in code, so no asset pipeline is required.
- Every major section has an animated scene, scroll reveal, and section-specific motion.
- Replace `hello@moizakhtar.dev` and the LinkedIn URL in `index.html` with your preferred contact details.
