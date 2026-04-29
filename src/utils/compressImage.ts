/**
 * Comprime una imagen client-side via canvas:
 * - Redimensiona al lado largo maximo `maxDimension` manteniendo aspect ratio
 * - Codifica como JPEG con calidad `quality` (0..1)
 *
 * No requiere librerias externas. Si el navegador no soporta canvas (raro),
 * devuelve el File original.
 */
export async function compressImage(
    file: File,
    maxDimension = 1280,
    quality = 0.85,
): Promise<File> {
    if (!file.type.startsWith('image/')) {
        throw new Error('El archivo no es una imagen');
    }

    const dataUrl = await readAsDataURL(file);
    const img = await loadImage(dataUrl);

    const { width, height } = scaleDown(img.width, img.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) return file;

    // Si la "compresion" deja el archivo mas grande (raro pero pasa con PNGs ya optimizados),
    // devolvemos el original.
    if (blob.size >= file.size) return file;

    const ext = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], ext, { type: 'image/jpeg' });
}

function readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        img.src = src;
    });
}

function scaleDown(w: number, h: number, max: number): { width: number; height: number } {
    if (w <= max && h <= max) return { width: w, height: h };
    const ratio = w > h ? max / w : max / h;
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
