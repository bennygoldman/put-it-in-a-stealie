// imageLoader.js - Handles file selection and drag-drop

// onImageLoad(img) is called with a loaded <img> whose src is a blob: URL.
// The caller owns that URL and should revoke it when the image is no longer needed.
// onError(message) is called when the file is not a readable image.
export function initImageLoader(dropZone, fileInput, onImageLoad, onError) {
  // File selected via picker
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    // Clear the input so picking the same file again still fires 'change'
    fileInput.value = '';
    if (file) {
      loadImageFile(file, onImageLoad, onError);
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      loadImageFile(file, onImageLoad, onError);
    }
  });
}

function loadImageFile(file, onImageLoad, onError) {
  // Some files (e.g. HEIC on Android) report an empty type, so only reject
  // types that are clearly not images and let the browser decide the rest.
  if (file.type && !file.type.startsWith('image/')) {
    onError('That file is not an image. Try a JPEG or PNG.');
    return;
  }

  // An object URL avoids holding a huge base64 string in memory for large photos
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => onImageLoad(img);
  img.onerror = () => {
    URL.revokeObjectURL(url);
    onError("Couldn't open that image. Try a JPEG or PNG.");
  };
  img.src = url;
}
