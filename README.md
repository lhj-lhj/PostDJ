# PostDJ

PostDJ is a Chrome extension that transforms multiple browser tabs/windows into a virtual DJ mixing console. Instantly control the volume of each audio or video element across all open tabs, and monitor real-time BPM (beats per minute) for each track—all within a single, intuitive popup interface.

---

## Features

* **Multi-Tab Audio Control**: Detect and list all `<audio>` and `<video>` elements from open Chrome tabs and windows.
* **Volume Sliders**: Independently adjust the gain of each track via simple range controls.
* **Real-Time BPM Detection**: Estimate tempo (30–200 BPM) using an autocorrelation algorithm, updating every second.
* **Zero Configuration**: No external servers or complex setup—just load the extension and start mixing.

---

## Prerequisites

* Google Chrome (v99 or later)
* Git (for cloning the repository)

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/postdj.git
   cd postdj
   ```

2. **Load as an Unpacked Extension**

   1. Open Chrome and navigate to `chrome://extensions/`.
   2. Enable **Developer mode** (toggle in the top-right).
   3. Click **Load unpacked** and select the `postdj/` directory.

3. The PostDJ icon will appear in your Chrome toolbar.

---

## Usage

1. Click the **PostDJ** icon in the Chrome toolbar.
2. Wait a moment for the extension to scan all tabs—tracks with active audio/video will be listed.
3. For each track:

   * Drag the slider to adjust volume in real time.
   * View the current BPM reading next to the slider.
4. Close the popup when finished; volume settings persist until the page reloads.

---

## Project Structure

```
postdj/
├── manifest.json         # Extension manifest (Manifest V3)
├── background.js         # Service worker handling runtime events
├── content.js            # Injected script for audio graph & BPM detection
├── popup.html            # Popup UI markup
├── popup.js              # Popup controller and message passing
├── icon.png              # Toolbar icon (128×128)
└── README.md             # This documentation file
```

### Core Components

* **Audio Graph Setup** (`content.js`):

  1. Create an `AudioContext`.
  2. Wrap each `<audio>`/`<video>` element in a `MediaElementSourceNode`.
  3. Insert a `GainNode` for volume control.
  4. Connect an `AnalyserNode` for BPM sampling.

* **BPM Algorithm**:

  * Uses autocorrelation to find the offset of highest self-similarity.
  * Converts offset to BPM within 30–200 range.
  * Returns `null` when audio is too quiet.
  * Samples at \~1 Hz for performance.

* **Messaging**:

  * **Popup → Content**: `{ type: 'getAudioInfo' }` to fetch volumes & BPMs.
  * **Popup → Content**: `{ type: 'setVolume', index, volume }` to adjust gain.
  * **Content → Popup**: Responds with `[{ index, volume, bpm }]`.

---

## Development Tips

* **Optimize Performance**: Pause BPM analysis when the popup is closed; resume only on popup open.
* **Enhance UI**: Integrate Tailwind CSS or another framework for streamlined styling.
* **Advanced Analysis**: Swap in libraries like [cwilso/beat-detection](https://github.com/cwilso/beat-detection) for more accurate tempo detection.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/YourFeature`.
3. Commit your changes: `git commit -m 'Add feature'`.
4. Push to your branch: `git push origin feature/YourFeature`.
5. Open a Pull Request describing your changes.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgements

* MDN Web Audio API documentation for API references.
* Inspiration from cwilso’s [beat-detection](https://github.com/cwilso/beat-detection) repository.
* Chrome Extension Developer Guide and community examples.
