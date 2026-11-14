// app.js - Main orchestration
import { initImageLoader } from './imageLoader.js';
import { openCropModal, clearCropState } from './cropperModal.js';
import { renderStealiePNG, saveStealiePNG } from './exporter.js';
import { STEALIE_GEOMETRY } from './constants.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const userCanvas = document.getElementById('user-image-canvas');
const actionsDiv = document.getElementById('actions');
const stealieImg = document.querySelector('.stealie-frame');
const errorMessage = document.getElementById('error-message');

const btnSave = document.getElementById('btn-save');
const btnRecrop = document.getElementById('btn-recrop');
const btnNew = document.getElementById('btn-new');

let currentImage = null;    // Image the shown crop came from (blob: URL owned by us)
let pngBlob = null;         // Finished PNG, ready to share/download
let pngPromise = null;      // In-progress render of the PNG

// A new image only replaces the current one once the user presses Done,
// so cancelling leaves the existing stealie untouched.
function handleImageLoad(img) {
  hideError();
  openCropModal(
    img,
    (croppedCanvas) => {
      if (currentImage && currentImage !== img) {
        URL.revokeObjectURL(currentImage.src);
      }
      currentImage = img;
      handleCropComplete(croppedCanvas);
    },
    () => URL.revokeObjectURL(img.src),
    false
  );
}

function recrop() {
  openCropModal(currentImage, handleCropComplete, () => {}, true);
}

function handleCropComplete(croppedCanvas) {
  drawCroppedImage(croppedCanvas);
  dropZone.classList.add('has-image');
  actionsDiv.classList.remove('hidden');

  // Build the PNG now, so pressing Save can share it immediately
  pngBlob = null;
  const promise = renderStealiePNG(stealieImg, croppedCanvas);
  pngPromise = promise;
  promise.then(
    (blob) => {
      if (pngPromise === promise) {
        pngBlob = blob;
      }
    },
    (err) => console.error('Rendering PNG failed:', err)
  );
}

function drawCroppedImage(croppedCanvas) {
  const ctx = userCanvas.getContext('2d');
  const { DISPLAY_SIZE, CENTER_X, CENTER_Y, RADIUS } = STEALIE_GEOMETRY;

  // Draw at device resolution so the preview is sharp on high-DPI screens
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  userCanvas.width = DISPLAY_SIZE * dpr;
  userCanvas.height = DISPLAY_SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  ctx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, RADIUS, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(croppedCanvas, CENTER_X - RADIUS, CENTER_Y - RADIUS, RADIUS * 2, RADIUS * 2);
  ctx.restore();
}

function resetState() {
  const ctx = userCanvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, userCanvas.width, userCanvas.height);
  dropZone.classList.remove('has-image');
  actionsDiv.classList.add('hidden');
  if (currentImage) {
    URL.revokeObjectURL(currentImage.src);
  }
  currentImage = null;
  pngBlob = null;
  pngPromise = null;
  clearCropState();
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

// Button handlers
btnSave.addEventListener('click', async () => {
  try {
    // Normally the PNG is already rendered; waiting here can make
    // mobile browsers refuse the share sheet, which falls back to a download.
    const blob = pngBlob || (await pngPromise);
    if (blob) {
      await saveStealiePNG(blob);
    }
  } catch (err) {
    console.error('Saving failed:', err);
    showError("Couldn't save your stealie. Please try again.");
  }
});

btnRecrop.addEventListener('click', () => {
  if (currentImage) {
    recrop();
  }
});

btnNew.addEventListener('click', () => {
  resetState();
  fileInput.click();
});

// Click (or Enter/Space): edit the current image, or pick one if there is none
function activateDropZone() {
  if (currentImage) {
    recrop();
  } else {
    fileInput.click();
  }
}

dropZone.addEventListener('click', activateDropZone);
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activateDropZone();
  }
});

initImageLoader(dropZone, fileInput, handleImageLoad, showError);
