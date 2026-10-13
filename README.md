# Shrink — video compressor (frontend)

Browser-first video compression to **MP4** and clip-to-**GIF**, built from the PRD
(React + TypeScript + Vite + Tailwind, FFmpeg WebAssembly in a Web Worker).

```bash
npm install     # also copies the FFmpeg core into public/ffmpeg
npm run dev
npm test        # Vitest: preset mapping, GIF limits, log parsers, filename safety
npm run build
```

## Flow (PRD §6)
Upload → Configure → (Server consent) → Processing → Results / Error & recovery

| PRD | Where |
|---|---|
| FR-01/02 upload, 500 MB limit | `components/UploadScreen.tsx`, `lib/inspect.ts#precheck` |
| FR-03 media inspection (magic bytes, browser metadata, FFmpeg stream probe) | `lib/inspect.ts` |
| FR-04/06 MP4 presets CRF 28/23/18, H.264 + AAC | `lib/ffmpeg-args.ts` |
| FR-05/07 GIF: ≤15 s trim, width, fps, loop, palette | `lib/ffmpeg-args.ts`, `ConfigureScreen.tsx` |
| FR-08 real progress from FFmpeg `time=`; named stages otherwise | `lib/local-processor.ts`, `ProcessingScreen.tsx` |
| FR-09 cancel terminates the worker and frees memory | `lib/engine.ts#resetEngine` |
| FR-10 output validation before success | `lib/validate.ts` |
| FR-11–13 preview, actual sizes, larger-than-original warning, download | `ResultsScreen.tsx` |
| FR-14 errors and recovery actions | `lib/errors.ts`, `ErrorScreen.tsx`, `App.tsx` |
| FR-15 local capability policy | `lib/capability.ts` |
| FR-16 consent before **every** server upload | `ConsentDialog.tsx`, `App.tsx#requestServer` |

## Server path
`lib/server-processor.ts` implements the PRD §8 job API client (create → PUT upload →
upload-complete → poll → download → validate). It's off unless `VITE_API_BASE` is set
(see `.env.example`). There's no backend in this repo.

## Known limits / next steps
- Uses the **single-threaded** FFmpeg core, so it needs no COOP/COEP headers. It's slow:
  a 5 s 720p clip takes about 1–2 min to encode to MP4. GIFs are fast. Use the multi-threaded
  core with cross-origin isolation for production.
- Local size and resolution thresholds in `capability.ts` are placeholders until the M0 spike.
- Review FFmpeg build licensing (libx264 is GPL) before release.
