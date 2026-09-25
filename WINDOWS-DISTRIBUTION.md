# Windows distribution

## Build requirements

- Windows 10/11
- Node.js 20 LTS or newer
- npm

## Build portable EXE

```powershell
npm install
npm run dist
```

Output:

```text
release/SPMB SMP Negeri 1 Watopute-1.0.0-portable.exe
```

## Build installer

```powershell
npm install
npm run dist:installer
```

Output:

```text
release/SPMB SMP Negeri 1 Watopute-1.0.0-x64.exe
```

The `npm run icons` command creates `build/icon.png` and `build/icon.ico` automatically. Replace the SVG in `scripts/prepare-icons.mjs` with the official school logo if one is available.
