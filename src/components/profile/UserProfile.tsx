import { useState, useEffect, useRef } from 'preact/hooks';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { userRepository } from '../../infrastructure/firebase/FirestoreUserRepository';
import { useAuth } from '../../hooks/useAuth';
import Header from '../Header';
import EmptyState from '../EmptyState';
import type { User } from '../../domain/entities/User';
import ImageCropperModal from './ImageCropperModal';
import AccountSecurityForm from './AccountSecurityForm';

export default function UserProfile() {
    const { user } = useAuth({ redirectIfUnauthenticated: '/' });
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [displayName, setDisplayName] = useState('');
    const [age, setAge] = useState('');
    const [country, setCountry] = useState('');

    // Photo upload & crop state
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [tempPhotoSrc, setTempPhotoSrc] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        const loadProfile = async () => {
            try {
                setLoading(true);
                const p = await userRepository.getUserProfile(user.id);
                if (p) {
                    setProfile(p);
                    setDisplayName(p.displayName || '');
                    setAge(p.age ? String(p.age) : '');
                    setCountry(p.country || '');
                }
            } catch (err) {
                console.error('Error loading profile:', err);
                setError('Error al cargar el perfil');
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, [user?.id]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten archivos de imagen');
            return;
        }

        // Increased limit for raw upload before crop (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no puede superar los 5MB');
            return;
        }

        setError('');

        // Create URL for the cropper
        const objectUrl = URL.createObjectURL(file);
        setTempPhotoSrc(objectUrl);
        setShowCropper(true);

        // Reset input so same file can be selected again if cancelled and re-picked
        input.value = '';
    };

    const handleCrop = (blob: Blob) => {
        // Create a new File from the blob
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        closeCropper();
    };

    const closeCropper = () => {
        setShowCropper(false);
        if (tempPhotoSrc) {
            URL.revokeObjectURL(tempPhotoSrc);
            setTempPhotoSrc(null);
        }
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            let photoURL = profile.photoURL;

            if (photoFile) {
                const storageRef = ref(storage, `avatars/${profile.id}`);
                await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(storageRef);
            }

            const ageNum = age.trim() ? parseInt(age, 10) : undefined;
            if (age.trim() && (isNaN(ageNum!) || ageNum! < 1 || ageNum! > 150)) {
                setError('Edad no valida');
                setSaving(false);
                return;
            }

            await userRepository.updateUserProfile(profile.id, {
                displayName: displayName.trim() || profile.username,
                photoURL,
                age: ageNum,
                country: country.trim() || undefined,
            });

            const updatedProfile: User = {
                ...profile,
                displayName: displayName.trim() || profile.username,
                photoURL,
                age: ageNum,
                country: country.trim() || undefined,
            };
            setProfile(updatedProfile);
            setPhotoFile(null);
            // We keep the preview if it exists, or it will fallback to photoURL
            setSuccess('Perfil guardado correctamente');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Error al guardar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const avatarSrc = photoPreview || profile?.photoURL;

    if (!user) return null;

    return (
        <div class="min-h-screen">
            <Header user={profile || user} activeTab="settings" />
            <main class="container main">
                <div class="page-header">
                    <h1 class="page-title">Configuración</h1>
                </div>

                {loading ? (
                    <div class="loading-container">
                        <span class="spinner" />
                        <span>Cargando perfil...</span>
                    </div>
                ) : profile ? (
                    <>
                    <div class="profile-card">
                        <div class="avatar-section" onClick={handleAvatarClick}>
                            {avatarSrc ? (
                                <img class="avatar-img" src={avatarSrc} alt="Avatar" />
                            ) : (
                                <div class="avatar-placeholder">
                                    {(profile.displayName || profile.username || '?')[0].toUpperCase()}
                                </div>
                            )}
                            <div class="avatar-overlay">Cambiar foto</div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>

                        <div class="profile-form">
                            <div class="form-group">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-input" value={profile.username} disabled />
                            </div>

                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="text" class="form-input" value={profile.email} disabled />
                            </div>

                            <div class="form-group">
                                <label class="form-label">Nombre para mostrar</label>
                                <input
                                    type="text"
                                    class="form-input"
                                    value={displayName}
                                    onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                                    placeholder={profile.username}
                                    maxLength={50}
                                />
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Edad</label>
                                    <input
                                        type="number"
                                        class="form-input"
                                        value={age}
                                        onInput={(e) => setAge((e.target as HTMLInputElement).value)}
                                        placeholder="Opcional"
                                        min={1}
                                        max={150}
                                    />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Pais</label>
                                    <input
                                        type="text"
                                        class="form-input"
                                        value={country}
                                        onInput={(e) => setCountry((e.target as HTMLInputElement).value)}
                                        placeholder="Opcional"
                                        maxLength={60}
                                    />
                                </div>
                            </div>

                            {error && <div class="form-error profile-msg">{error}</div>}
                            {success && <div class="profile-success">{success}</div>}

                            <button class="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                    <AccountSecurityForm
                        currentEmail={profile.email}
                        currentUsername={profile.username}
                        usernameChangedAt={profile.usernameChangedAt}
                    />
                    </>
                ) : (
                    <EmptyState description="No se pudo cargar el perfil" />
                )}
            </main>

            {showCropper && tempPhotoSrc && (
                <ImageCropperModal
                    imageSrc={tempPhotoSrc}
                    onCancel={closeCropper}
                    onCrop={handleCrop}
                />
            )}

            <style>{`
                .profile-card {
                    max-width: 500px;
                    margin: 0 auto;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-xl);
                    padding: var(--space-8);
                }

                .avatar-section {
                    position: relative;
                    width: 96px;
                    height: 96px;
                    margin: 0 auto var(--space-6);
                    border-radius: 50%;
                    cursor: pointer;
                    overflow: hidden;
                }

                .avatar-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                }

                .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--accent-gradient);
                    color: white;
                    font-size: 2.5rem;
                    font-weight: 700;
                    border-radius: 50%;
                }

                .avatar-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 500;
                    opacity: 0;
                    transition: opacity var(--transition-fast);
                    border-radius: 50%;
                }

                .avatar-section:hover .avatar-overlay {
                    opacity: 1;
                }

                .profile-form {
                    display: flex;
                    flex-direction: column;
                }

                .profile-form .form-input:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                .profile-msg {
                    margin-bottom: var(--space-4);
                }

                .profile-success {
                    color: var(--status-reading);
                    font-size: 0.875rem;
                    margin-bottom: var(--space-4);
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-12);
                    gap: var(--space-4);
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
}
