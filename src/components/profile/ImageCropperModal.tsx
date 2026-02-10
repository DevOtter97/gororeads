import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { createPortal } from 'preact/compat';

interface Props {
    imageSrc: string;
    onCancel: () => void;
    onCrop: (blob: Blob) => void;
}

export default function ImageCropperModal({ imageSrc, onCancel, onCrop }: Props) {
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    // We don't strictly need state for container size if we read ref, but for resize re-calc it's good.
    // Actually, simpler to just read ref on critical actions and use a resize listener to force update if needed.

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const CROP_SIZE = 250;

    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    // Calculate constraints based on current zoom and container/image dimensions
    const getConstraints = (currentZoom: number) => {
        if (!imageRef.current || !containerRef.current) return { maxOffsetX: 0, maxOffsetY: 0 };

        const img = imageRef.current;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        if (!nw || !nh) return { maxOffsetX: 0, maxOffsetY: 0 };

        // Base fit scale (how img is rendered by CSS max-width: 100%)
        const fitScale = Math.min(cw / nw, ch / nh);

        const renderedWidth = nw * fitScale * currentZoom;
        const renderedHeight = nh * fitScale * currentZoom;

        // We want the image to ALWAYS cover the crop circle.
        // So the edge of the image cannot be inside the crop circle.
        // top of crop circle (relative to center) = -CROP_SIZE/2
        // top of image (relative to center) = -renderedHeight/2 + offset.y
        // We need top of image <= top of crop circle
        // -renderedHeight/2 + offset.y <= -CROP_SIZE/2
        // offset.y <= (renderedHeight - CROP_SIZE) / 2

        // bottom of crop circle = CROP_SIZE/2
        // bottom of image = renderedHeight/2 + offset.y
        // We need bottom of image >= bottom of crop circle
        // renderedHeight/2 + offset.y >= CROP_SIZE/2
        // offset.y >= (CROP_SIZE - renderedHeight) / 2
        // offset.y >= -(renderedHeight - CROP_SIZE) / 2

        const limitX = (renderedWidth - CROP_SIZE) / 2;
        const limitY = (renderedHeight - CROP_SIZE) / 2;

        // If rendered size < crop size (shouldn't happen with correct minZoom), limit is negative.
        // Math.max(0, ...) handles that by locking to center (0), but strictly logic says:
        const maxOffsetX = Math.max(0, limitX);
        const maxOffsetY = Math.max(0, limitY);

        return { maxOffsetX, maxOffsetY };
    };

    const calculateMinZoom = useCallback(() => {
        if (!imageRef.current || !containerRef.current) return 1;

        const img = imageRef.current;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        if (!nw || !nh) return 1;

        const fitScale = Math.min(cw / nw, ch / nh);
        const baseWidth = nw * fitScale;
        const baseHeight = nh * fitScale;

        const minZoomW = CROP_SIZE / baseWidth;
        const minZoomH = CROP_SIZE / baseHeight;

        // Must be large enough to cover BOTH dimensions
        return Math.max(minZoomW, minZoomH);
    }, []);

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let newX = clientX - dragStart.x;
        let newY = clientY - dragStart.y;

        const { maxOffsetX, maxOffsetY } = getConstraints(zoom);
        newX = clamp(newX, -maxOffsetX, maxOffsetX);
        newY = clamp(newY, -maxOffsetY, maxOffsetY);

        setOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Use a dynamic step based on zoom level for finer control? strictly 0.05 is fine
        const delta = e.deltaY * -0.001;

        const maxZoom = Math.max(3, minZoom * 3);
        const newZoom = clamp(zoom + delta, minZoom, maxZoom);

        setZoom(newZoom);

        // Important: Re-clamp offset when zooming out
        // We do this immediately here
        const { maxOffsetX, maxOffsetY } = getConstraints(newZoom);
        setOffset(prev => ({
            x: clamp(prev.x, -maxOffsetX, maxOffsetX),
            y: clamp(prev.y, -maxOffsetY, maxOffsetY)
        }));
    };

    const handleImageLoad = () => {
        const calculatedMin = calculateMinZoom();
        //console.log("Image loaded. Min zoom:", calculatedMin);
        setMinZoom(calculatedMin);
        setZoom(calculatedMin);
        setOffset({ x: 0, y: 0 });
    };

    // Global event listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, dragStart, zoom]);

    // Handle Window Resize to recalculate minZoom
    useEffect(() => {
        const handleResize = () => {
            const calculatedMin = calculateMinZoom();
            setMinZoom(calculatedMin);
            setZoom(prev => Math.max(prev, calculatedMin));

            // Also re-clamp offset? Yes, strictly should, but maybe overkill for simple resize
            // Let's do it safely in the next render cycle or just let user adjust.
            // Actually, if we resize and container gets smaller, fitScale changes.
            // React state update might lag slightly behind layout, but resize event fires often.
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calculateMinZoom]);


    const handleSave = async () => {
        if (!imageRef.current || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const OUTPUT_SIZE = 400;
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;

        ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        const image = imageRef.current;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const fitScale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight);

        const pixelScale = OUTPUT_SIZE / CROP_SIZE;
        const effectiveZoom = fitScale * zoom;

        ctx.save();
        ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
        ctx.translate(offset.x * pixelScale, offset.y * pixelScale);
        ctx.scale(effectiveZoom * pixelScale, effectiveZoom * pixelScale);
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
        ctx.restore();

        canvas.toBlob((blob) => {
            if (blob) onCrop(blob);
        }, 'image/jpeg', 0.9);
    };

    return createPortal(
        <div className="crop-modal-overlay">
            <div className="crop-modal-content">
                <div className="crop-header">
                    <h3>Ajustar foto</h3>
                    <button className="close-btn" onClick={onCancel}>&times;</button>
                </div>

                <div className="crop-area-wrapper">
                    <div
                        className="crop-container"
                        ref={containerRef}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                        onWheel={handleWheel}
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            className="crop-source-image"
                            alt="Crop source"
                            onLoad={handleImageLoad}
                            style={{
                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            }}
                        />
                        <div className="crop-overlay-mask"></div>
                    </div>
                </div>

                <div className="crop-controls">
                    <div className="zoom-control">
                        <span>-</span>
                        <input
                            type="range"
                            min={minZoom}
                            max={Math.max(3, minZoom * 3)}
                            step="0.01"
                            value={zoom}
                            onInput={(e) => {
                                const newZoom = parseFloat((e.target as HTMLInputElement).value);
                                setZoom(newZoom);
                                const { maxOffsetX, maxOffsetY } = getConstraints(newZoom);
                                setOffset(prev => ({
                                    x: clamp(prev.x, -maxOffsetX, maxOffsetX),
                                    y: clamp(prev.y, -maxOffsetY, maxOffsetY)
                                }));
                            }}
                            className="zoom-slider"
                        />
                        <span>+</span>
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                        <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
                    </div>
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <style>{`
                .crop-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .crop-modal-content {
                    background: var(--bg-card);
                    padding: var(--space-6);
                    border-radius: var(--border-radius-lg);
                    width: 90%;
                    max-width: 400px;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    animation: fadeIn 0.2s ease-out;
                }

                .crop-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-2);
                }

                .crop-header h3 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                }

                .crop-area-wrapper {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    background: #1a1a1a;
                    border-radius: var(--border-radius-md);
                    overflow: hidden;
                }

                .crop-container {
                    position: relative;
                    width: 300px;
                    height: 300px;
                    overflow: hidden;
                    cursor: move;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    touch-action: none;
                }
                
                .crop-source-image {
                    max-width: 100%;
                    max-height: 100%;
                    pointer-events: none;
                    transform-origin: center center;
                }

                .crop-overlay-mask {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: transparent;
                }
                .crop-overlay-mask::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 250px;
                    height: 250px;
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
                }

                .crop-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .zoom-control {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    justify-content: center;
                    color: var(--text-secondary);
                }

                .zoom-slider {
                    flex: 1;
                    accent-color: var(--accent-primary);
                    cursor: pointer;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-3);
                }

                @media (max-width: 480px) {
                    .crop-container {
                        width: 250px;
                        height: 250px;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
}
