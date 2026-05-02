interface UserAvatarProps {
    username: string;
    photoUrl?: string;
    size?: number;
}

export default function UserAvatar({ username, photoUrl, size = 48 }: Readonly<UserAvatarProps>) {
    const initial = username.charAt(0).toUpperCase();
    return (
        <>
            <div class="user-avatar" style={`width: ${size}px; height: ${size}px;`}>
                {photoUrl ? (
                    <img src={photoUrl} alt={username} />
                ) : (
                    <span class="user-avatar-initial">{initial}</span>
                )}
            </div>
            <style>{`
                .user-avatar {
                    flex-shrink: 0;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--accent-gradient, var(--accent-primary));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                }
                .user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .user-avatar-initial {
                    font-size: 1.125rem;
                    line-height: 1;
                }
            `}</style>
        </>
    );
}
