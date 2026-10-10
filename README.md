# terra-project
HackClub's Game Terra's project that I'll be learning from...

# Chrome Screenshot Extension

Simple extension to take a screenshot of the active tab and automaticlly save after 3 seconds unless otherwise
simple photo editing features available aswell

A lightweight, developer-mode Chrome extension that captures web screenshots, shows a 3-second floating preview, and provides built-in annotation, cropping, rotation, and file-renaming tools.

---

## File Structure

Ensure your project directory contains the following files:

screenshot-extension/
├── manifest.json
├── background.js
└── content.js


---

## How to Install (Unpacked Developer Mode)

1. Open Google Chrome.
2. In the address bar, navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `screenshot-extension` folder containing your extension files.
6. Click the **Puzzle Piece icon** in Chrome's top toolbar, find **Quick Screenshot & Editor**, and click the **Pin** icon for quick access.

---

## How to Use

### 1. Taking a Screenshot
* Click the extension icon on any standard webpage.
* A floating thumbnail preview appears in the bottom-right corner of the screen.

### 2. Auto-Download (No Editing)
* If you **do not click** the thumbnail preview, the unedited screenshot will automatically download after **3 seconds**.
* Filename format: `{site}_screenshot_{YYYY-MM-DD_HH-MM-SS}.png`

### 3. Editing the Screenshot
* Click the floating thumbnail preview within 3 seconds to cancel the auto-download and open the **Full Editor Overlay**.

#### Editor Tools:
* **Draw**: Freehand drawing tool.
* **Rubber**: Erase areas of your canvas drawing.
* **Rectangle**: Click and drag to draw rectangular outlines.
* **Circle**: Click and drag to draw circular outlines.
* **Crop**: Drag a box around an area and release to crop the image.
* **Rotate**: Rotates the canvas clockwise by 90°.
* **Undo**: Reverts your last edit action (or press `Ctrl + Z` / `Cmd + Z`).
* **File Name Input**: Type a custom filename into the input box before saving.

### 4. Saving Options
* **Done Editing** (Blue Button): Downloads your edited image with the specified filename and closes the editor.
* **Save Copy (Both)** (Green Button): Downloads **two files**—the unedited original (`_original.png`) and your edited version (`_edited.png`).
* **Click Outside**: Clicking outside the image canvas saves the edited screenshot and closes the modal.