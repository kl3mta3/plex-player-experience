# <h1 align="center" > Plex Player Experience, Chrome Extension </h1>
<p align="center">
  <img src="https://lh3.googleusercontent.com/rMVPMF68cbOMOohdsEXOwRkJAJpMvHia-YDYlNfBjK5awB1z4QCj9kUUfOCABe_n61zBel1C-jN6nxRT_0IcpgEu=s1600-w1600-h1000" alt="Home view" width="45%">
</p>
Make Plex Web feel smarter. Set your own delay between episodes, boost the volume, add a sleep timer that pauses the video, and auto-skip intros and credits. Simple, fast controls that match Plex’s look.

---

**<h2 align="center" >Install from the Chrome Web Store</h2>**  
<p align="center" >https://chromewebstore.google.com/detail/plex-player-experience/fkbbggeegbpchpbbjnkfcechcadieihi</p>

---

## Features

- Auto Skip Intros
- Auto Skips Credits
- Volume Booster
- Sleep Timer
- Runs only on Plex domains, stays out of the way elsewhere

> This enhances the web player only, it does not change your Plex libraries or server.

---



## Quick start

### Install from the store

1. Open the Web Store link above  
2. Click Add to Chrome, confirm  
3. Visit `https://app.plex.tv` and play something

### Install from source

1. Clone the repo  
```bash
git clone https://github.com/kl3mta3/plex-player-experience.git
cd plex-player-experience
```
2. Load unpacked  
   - Go to `chrome://extensions`  
   - Turn on Developer mode  
   - Click Load unpacked, pick the repo folder  
3. Open Plex and test

---

## Options

Right click the extension icon, pick Options.

---

## Screenshots

Put your images in `images/` at the repo root, or in `docs/images/`.  
Update file names to match your files. If you downloaded images from the Web Store, save them into `images/` and reference them here.


<p align="center">
  <img src="https://lh3.googleusercontent.com/rMVPMF68cbOMOohdsEXOwRkJAJpMvHia-YDYlNfBjK5awB1z4QCj9kUUfOCABe_n61zBel1C-jN6nxRT_0IcpgEu=s1600-w1600-h1000" alt="Home view" width="45%">
  <img src="https://lh3.googleusercontent.com/-2kcL6CzNvxZDNK8tk5pSPMVJXutSF-vLAhHqAEymwX-LSbFxFxK39_HBknIMO5RJvfhpj0Nw2Q5JzADcTKBw_19AA=s1280-w1280-h800" alt="Player controls" width="45%">
</p>
<p align="center">
  <img src="https://lh3.googleusercontent.com/EE4kmPq57wod8dYwi7WplF-_7Wf98q7-tzFf6toqLIVhDJ9vnZlwF2DM8hMXuEENO3hHoTcgepgpmGy8NwFZeOGrM6Y=s1280-w1280-h800" alt="Volume Booster" width="45%">
  <img src="https://lh3.googleusercontent.com/s6E5TrW2MEidl8xck_3XPib_VyeeKbNmC0e36Q__IBtKknSIeUof-V0sspBxaTjCOd0NnjLB1FKycIGv1dCAIuORGw=s1280-w1280-h800" alt="Sleep Timer" width="45%">
</p>

---

## Permissions

- `*://app.plex.tv/*`, needed to run on the Plex web app  
- `storage`, saves your options  
- No remote code, no analytics by default  
Check `manifest.json` for the exact list.

---

## Troubleshooting

- Not working on Plex  
  - Confirm the extension is enabled at `chrome://extensions`  
  - Make sure you are on `app.plex.tv` or your Plex web player URL  
  - Hard refresh the page, Ctrl Shift R


- Still stuck  
  - Open DevTools, Console tab, capture errors with the extension id  
  - Open an issue with steps to reproduce, your Chrome version, and a screenshot

---

## Development

No build path  
- Edit files in `src`  
- Reload the extension  
- Refresh Plex and test

Build path  
```bash
npm install
npm run dev   # writes to dist
```

Suggested layout  
```
.
├─ images/
├─ src/
│  ├─ content/
│  ├─ styles/
│  ├─ options/
│  └─ utils/
├─ dist/
├─ manifest.json
├─ README.md
└─ LICENSE
```

---

## Release

1. Bump version in `manifest.json`, and in `package.json` if present  
2. Build to `dist` if you use a bundler  
3. Zip the folder with `manifest.json` at the root  
4. Upload the zip in the Chrome Web Store Developer Dashboard  
5. Update listing text, images, and changelog

Tag the release  
```bash
git commit -am "release vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```

---

## License

MIT, or your chosen license.

```
MIT License, short form  
Provided as is, no warranty.
