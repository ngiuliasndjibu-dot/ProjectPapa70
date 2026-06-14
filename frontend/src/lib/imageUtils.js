// Client-side image compression -> returns a JPEG data URL (base64).
// Keeps menu images small so they can be stored in MongoDB and work offline.
export const compressImageToDataURL = (file, { maxSize = 600, quality = 0.72 } = {}) =>
    new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('Le fichier sélectionné n\'est pas une image'));
            return;
        }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Image invalide'));
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
