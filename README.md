# 🎭 GRizal Stage Soundboard

A professional, feature-rich web soundboard built for stage plays, drama presentations, and SFX cue triggering.

---

## 🚀 How to Launch

1. **One-Click from Desktop:**
   - Double-click **`Open GRizal Soundboard.bat`** on your Desktop.
   - It will start the lightweight local audio streaming server and automatically open the soundboard in your default web browser (`http://localhost:8080`).

2. **From the Project Folder:**
   - Double-click **`launch.bat`** in `C:\Users\Ian\.gemini\antigravity\scratch\soundboard`.

---

## 🌟 Key Features

### 1. 48 Pre-Loaded Stage Audios
- All 48 audio tracks from your `GRizal Audio` folder and subfolders are categorized:
  - **General SFX**: Error SFX, Glitches, Alarms, Clicks.
  - **Kabanata 1 to 15**: Themes for Padre Damaso, Spanish classical, storm/thunder, carriage, gunshots, dialogue, and intros.
  - **BGM vs SFX**: Background music is configured to automatically loop continuously; SFX plays on one-shot cue.

### 2. Custom Keybinds & Interactive Recorder
- **Quick-Bind:** Click the mechanical keycap badge (e.g. `[ Q ]` or `[ + Set ]`) on any sound card to enter recording mode.
- Press **any key** or combo (`A-Z`, `0-9`, `Space`, `F1-F12`, `Shift+A`, `Ctrl+1`, etc.) to bind it instantly.
- Press **Backspace** / **Delete** to clear a keybind.
- Press **Esc** to cancel.
- **Keybinds Cheat Sheet:** Click the keyboard icon at the top right to view all active shortcuts in an organized table.

### 3. Click-to-Play & Live Progress
- Click anywhere on a sound card to trigger audio.
- Real-time progress bar across the bottom of each playing card.
- Animated equalizer waveform indicator on active cards.
- **Panic Stop:** Press `Space`, `Esc`, or click the red **STOP ALL** button in the header to halt all sounds immediately.

### 4. Overlap & Retrigger Modes
- **Overlap Mode (🔀 Polyphonic):** Multiple tracks can play simultaneously (e.g. background storm BGM while triggering thunder and gunshot SFX).
- **Solo Mode (⏹️ Monophonic):** Triggering a new sound immediately stops any existing sound.
- **Retrigger (🔄 Restart vs Toggle):** Choose whether pressing the keybind of a playing sound restarts it from the beginning or pauses/stops it.

### 5. Floating "Now Playing" Dock
- Appears at the bottom whenever audio is playing.
- Track seek slider (drag to seek anywhere in the track).
- Time elapsed & total duration.
- Track volume slider.
- Per-track loop toggle.
- Individual pause/resume and stop buttons.

### 6. Add More Sounds & Batch Import
- Click **+ Add Sound** in the header to upload any `.mp3`, `.wav`, `.ogg`, `.m4a`, or `.mp4` file.
- **Drag & Drop:** Drag audio files from your computer and drop them anywhere onto the soundboard!
- Multiple files can be dropped simultaneously to create multiple sound buttons at once.
- Custom sounds are automatically saved in browser **IndexedDB** so they remain saved across browser restarts.

### 7. Full Customization & Editing
- Click the pencil icon on any sound card to:
  - Edit Sound Title / Button Name
  - Edit Category / Chapter
  - Set custom color accents (Gold, Red, Emerald, Cyan, Blue, Purple, Pink)
  - Adjust default volume (0% – 100%)
  - Adjust playback speed / pitch (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
  - Toggle looping & BGM tags
  - Delete sound

### 8. Search, Filter & Favorites
- Live search by name, chapter, or keybind (`Ctrl+F`).
- Chapter filter pills: `All`, `⭐ Favorites`, `General SFX`, `Kabanata 1` through `Kabanata 15`.
- Star icon on cards to add them to your Favorites tab.

### 9. Backup & Restore
- Click the settings gear icon to **Export Config (JSON)** or **Import Config (JSON)**.
- Reset to original defaults anytime.

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` or `Esc` | Panic Stop (Halt all sounds) |
| `Ctrl + F` | Jump to Search Bar |
| `M` | Mute / Unmute Master Volume |
| `1` | Error SFX |
| `2` | Glitch SFX |
| `3` | Boot Process |
| `4` | Enter Key |
| `5` | Error Beep |
| `6` | Alarm SFX |
| `7` | Carriage SFX |
| `8`, `9` | Fireworks SFX |
| `G` | Gunshot |
| `T`, `Y` | Thunder 1 & 2 |
| `U` | Thunder & Heavy Rain |
| `Q` | Padre Damaso Theme (Kab 1) |
| `W` | Spanish Classical BGM (Kab 1) |
| `E` | Spanish Ambience (Kab 2) |
| `R` | Damaso BGM (Kab 3) |
| `F` | Sad Melancholy BGM (Kab 4) |
| `K` | Grand Entrance BGM (Kab 6) |
| `L` | Leonora Theme (Kab 7) |
| *(Click any keycap badge to customize)* | |
