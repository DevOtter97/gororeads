import { useRef, useState } from 'preact/hooks';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import type { User } from '../../domain/entities/User';
import type { Post, CreatePostDTO, PostType, PostReadingRef, PostListRef } from '../../domain/entities/Post';
import { POST_TEXT_MAX_LENGTH } from '../../domain/entities/Post';
import { postRepository } from '../../infrastructure/firebase/FirestorePostRepository';
import { compressImage } from '../../utils/compressImage';
import UserAvatar from '../UserAvatar';
import ReadingPickerModal from './ReadingPickerModal';
import ListPickerModal from './ListPickerModal';

interface Props {
    user: User;
    onPosted: (post: Post) => void;
}

type Mode = Exclude<PostType, 'repost'>;

const TABS: { mode: Mode; label: string; icon: preact.JSX.Element }[] = [
    {
        mode: 'text', label: 'Texto', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            </svg>
        )
    },
    {
        mode: 'image', label: 'Foto', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
        )
    },
    {
        mode: 'reading', label: 'Lectura', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
        )
    },
    {
        mode: 'list', label: 'Lista', icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
];

export default function PostComposer({ user, onPosted }: Readonly<Props>) {
    const [mode, setMode] = useState<Mode>('text');
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [readingRef, setReadingRef] = useState<PostReadingRef | null>(null);
    const [listRef, setListRef] = useState<PostListRef | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showReadingPicker, setShowReadingPicker] = useState(false);
    const [showListPicker, setShowListPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const remaining = POST_TEXT_MAX_LENGTH - text.length;
    const textOver = remaining < 0;

    const canSubmit = (() => {
        if (textOver || submitting) return false;
        if (mode === 'text') return text.trim().length > 0;
        if (mode === 'image') return imageFile !== null;
        if (mode === 'reading') return readingRef !== null;
        if (mode === 'list') return listRef !== null;
        return false;
    })();

    const reset = () => {
        setMode('text');
        setText('');
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        setReadingRef(null);
        setListRef(null);
        setError('');
    };

    const handleSelectFile = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Selecciona un archivo de imagen.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no puede superar los 5MB.');
            return;
        }
        setError('');

        try {
            const compressed = await compressImage(file);
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImageFile(compressed);
            setImagePreview(URL.createObjectURL(compressed));
        } catch (err) {
            console.error('Error compressing image:', err);
            setError('No se pudo procesar la imagen.');
        }
    };

    const clearImage = () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadImage = async (file: File): Promise<string> => {
        const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
        const path = `posts/${user.id}/${filename}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file);
        return await getDownloadURL(ref);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError('');

        try {
            const dto: CreatePostDTO = { type: mode };
            if (text.trim()) dto.text = text.trim();

            if (mode === 'image' && imageFile) {
                dto.imageUrl = await uploadImage(imageFile);
            } else if (mode === 'reading' && readingRef) {
                dto.readingRef = readingRef;
            } else if (mode === 'list' && listRef) {
                dto.listRef = listRef;
            }

            const created = await postRepository.create(user, dto);
            onPosted(created);
            reset();
        } catch (err) {
            console.error('Error creating post:', err);
            setError('No se pudo publicar. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <form class="composer" onSubmit={handleSubmit}>
                <div class="composer-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.mode}
                            type="button"
                            class={`composer-tab ${mode === t.mode ? 'active' : ''}`}
                            onClick={() => setMode(t.mode)}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                <div class="composer-row">
                    <UserAvatar username={user.username} photoUrl={user.photoURL} size={40} />
                    <textarea
                        class="composer-input"
                        placeholder={
                            mode === 'text' ? '¿Qué estás leyendo?' :
                                mode === 'image' ? 'Añade un comentario (opcional)' :
                                    mode === 'reading' ? '¿Qué te parece esta lectura? (opcional)' :
                                        '¿Por qué te gusta esta lista? (opcional)'
                        }
                        value={text}
                        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
                        rows={3}
                        maxLength={POST_TEXT_MAX_LENGTH + 50}
                        disabled={submitting}
                    />
                </div>

                {/* Mode-specific input */}
                {mode === 'image' && (
                    <div class="composer-attachment">
                        {imagePreview ? (
                            <div class="composer-image-preview">
                                <img src={imagePreview} alt="Preview" />
                                <button type="button" class="composer-image-remove" onClick={clearImage} aria-label="Quitar imagen">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                class="composer-pick-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                                </svg>
                                Seleccionar imagen
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSelectFile}
                            style="display: none"
                        />
                    </div>
                )}

                {mode === 'reading' && (
                    <div class="composer-attachment">
                        {readingRef ? (
                            <div class="composer-ref-preview">
                                <div class="composer-ref-thumb">
                                    {readingRef.imageUrl
                                        ? <img src={readingRef.imageUrl} alt={readingRef.title} />
                                        : <span>{readingRef.title.charAt(0).toUpperCase()}</span>
                                    }
                                </div>
                                <div class="composer-ref-info">
                                    <p class="composer-ref-title">{readingRef.title}</p>
                                    <p class="composer-ref-meta">{readingRef.category}</p>
                                </div>
                                <button type="button" class="composer-ref-clear" onClick={() => setReadingRef(null)} aria-label="Quitar lectura">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button type="button" class="composer-pick-btn" onClick={() => setShowReadingPicker(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                                Elegir lectura
                            </button>
                        )}
                    </div>
                )}

                {mode === 'list' && (
                    <div class="composer-attachment">
                        {listRef ? (
                            <div class="composer-ref-preview">
                                <div class="composer-ref-thumb composer-ref-thumb--list">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div class="composer-ref-info">
                                    <p class="composer-ref-title">{listRef.name}</p>
                                    <p class="composer-ref-meta">{listRef.coverCount} lecturas</p>
                                </div>
                                <button type="button" class="composer-ref-clear" onClick={() => setListRef(null)} aria-label="Quitar lista">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <button type="button" class="composer-pick-btn" onClick={() => setShowListPicker(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                                Elegir lista
                            </button>
                        )}
                    </div>
                )}

                <div class="composer-footer">
                    <span class={`char-count ${textOver ? 'char-count--over' : remaining <= 50 ? 'char-count--low' : ''}`}>
                        {remaining}
                    </span>
                    <div class="composer-actions">
                        <button type="button" class="btn btn-ghost btn-sm" onClick={reset} disabled={submitting}>
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary btn-sm" disabled={!canSubmit}>
                            {submitting ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>
                {error && <p class="composer-error">{error}</p>}
            </form>

            {showReadingPicker && (
                <ReadingPickerModal
                    userId={user.id}
                    onSelect={(ref) => { setReadingRef(ref); setShowReadingPicker(false); }}
                    onClose={() => setShowReadingPicker(false)}
                />
            )}
            {showListPicker && (
                <ListPickerModal
                    userId={user.id}
                    onSelect={(ref) => { setListRef(ref); setShowListPicker(false); }}
                    onClose={() => setShowListPicker(false)}
                />
            )}

            <style>{`
                .composer {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--space-4);
                    margin-bottom: var(--space-4);
                    transition: border-color var(--transition-fast);
                }
                .composer:focus-within { border-color: var(--accent-primary); }

                .composer-tabs {
                    display: flex;
                    gap: var(--space-1);
                    margin-bottom: var(--space-3);
                    padding-bottom: var(--space-3);
                    border-bottom: 1px solid var(--border-color);
                }
                .composer-tab {
                    display: inline-flex; align-items: center; gap: var(--space-2);
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--border-radius-md);
                    color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500;
                    transition: all var(--transition-fast);
                }
                .composer-tab:hover { color: var(--text-primary); background: var(--bg-secondary); }
                .composer-tab.active {
                    color: var(--accent-primary);
                    background: rgba(139, 92, 246, 0.12);
                }

                .composer-row { display: flex; gap: var(--space-3); align-items: flex-start; }
                .composer-input {
                    flex: 1; background: transparent; border: none; color: var(--text-primary);
                    font-family: inherit; font-size: 0.95rem; line-height: 1.5; resize: none;
                    outline: none; padding: var(--space-2) 0;
                }
                .composer-input::placeholder { color: var(--text-muted); }

                .composer-attachment {
                    margin-top: var(--space-3);
                    padding-left: calc(40px + var(--space-3));
                }
                .composer-pick-btn {
                    display: inline-flex; align-items: center; gap: var(--space-2);
                    padding: var(--space-3) var(--space-4);
                    border: 1px dashed var(--border-color);
                    border-radius: var(--border-radius-md);
                    color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;
                    background: transparent; transition: all var(--transition-fast);
                }
                .composer-pick-btn:hover {
                    color: var(--accent-primary); border-color: var(--accent-primary);
                    background: rgba(139, 92, 246, 0.06);
                }

                .composer-image-preview {
                    position: relative;
                    border-radius: var(--border-radius-md); overflow: hidden;
                    max-width: 320px;
                }
                .composer-image-preview img { display: block; width: 100%; height: auto; }
                .composer-image-remove {
                    position: absolute; top: var(--space-2); right: var(--space-2);
                    width: 28px; height: 28px; border-radius: 50%;
                    background: rgba(0, 0, 0, 0.6); color: white;
                    display: flex; align-items: center; justify-content: center;
                }
                .composer-image-remove:hover { background: rgba(0, 0, 0, 0.85); }

                .composer-ref-preview {
                    display: flex; align-items: center; gap: var(--space-3);
                    padding: var(--space-3);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                }
                .composer-ref-thumb {
                    width: 40px; height: 56px; flex-shrink: 0;
                    border-radius: var(--border-radius-sm); overflow: hidden;
                    background: var(--bg-card);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); font-weight: 700;
                }
                .composer-ref-thumb img { width: 100%; height: 100%; object-fit: cover; }
                .composer-ref-thumb--list {
                    width: 40px; height: 40px; color: var(--accent-primary);
                }
                .composer-ref-info { flex: 1; min-width: 0; }
                .composer-ref-title {
                    margin: 0; color: var(--text-primary); font-weight: 500;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .composer-ref-meta { margin: 2px 0 0; font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; }
                .composer-ref-clear {
                    width: 28px; height: 28px; border-radius: 50%;
                    color: var(--text-muted); flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .composer-ref-clear:hover { color: var(--text-primary); background: var(--bg-card); }

                .composer-footer {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: var(--space-3); margin-top: var(--space-3);
                    padding-top: var(--space-3); border-top: 1px solid var(--border-color);
                }
                .composer-actions { display: flex; gap: var(--space-2); }

                .char-count { font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
                .char-count--low { color: var(--status-on-hold); }
                .char-count--over { color: var(--status-danger); font-weight: 600; }

                .composer-error {
                    color: var(--status-danger); font-size: 0.875rem;
                    margin: var(--space-3) 0 0;
                }
            `}</style>
        </>
    );
}
