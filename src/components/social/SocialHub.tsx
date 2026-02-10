import { useState, useEffect, useCallback } from 'preact/hooks';
import FriendList from './FriendList';
import FriendRequestList from './FriendRequestList';
import UserSearch from './UserSearch';
import Header from '../Header';
import { authService } from '../../infrastructure/firebase/FirebaseAuthService';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';

export default function SocialHub() {
    const [user, setUser] = useState(authService.getCurrentUser());
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((u) => {
            setUser(u);
            if (!u) {
                window.location.href = '/';
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) return;
        friendRepository.getPendingRequests(user.id).then(requests => {
            setPendingCount(requests.length);
        }).catch(console.error);
    }, [user]);

    const handleRequestHandled = useCallback(() => {
        setPendingCount(prev => Math.max(0, prev - 1));
    }, []);

    const tabs = [
        { id: 'friends', label: 'Mis Amigos' },
        { id: 'requests', label: 'Solicitudes' },
        { id: 'search', label: 'Buscar Personas' }
    ] as const;

    return (
        <div class="min-h-screen">
            <Header user={user} activeTab="social" />
            <div class="container main-content">
                <div class="page-header">
                    <h1 class="page-title">Comunidad</h1>
                </div>

                {/* Tabs */}
                <div class="tabs-container">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            class={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            {tab.label}
                            {tab.id === 'requests' && pendingCount > 0 && (
                                <span class="tab-badge">{pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div class="mt-6 min-h-[400px]">
                    {activeTab === 'friends' && user && <FriendList userId={user.id} />}
                    {activeTab === 'requests' && user && <FriendRequestList userId={user.id} onRequestHandled={handleRequestHandled} />}
                    {activeTab === 'search' && <UserSearch />}
                </div>
            </div>

            <style>{`
                .main-content {
                    padding-top: var(--space-8);
                    padding-bottom: var(--space-8);
                    max-width: 900px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: var(--space-6);
                }

                .page-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .tabs-container {
                    display: flex;
                    gap: var(--space-2);
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: var(--space-6);
                    overflow-x: auto;
                }

                .tab-button {
                    padding: var(--space-3) var(--space-4);
                    font-weight: 500;
                    color: var(--text-secondary);
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                    margin-bottom: var(--space-2);
                }

                .tab-button:hover {
                    color: var(--text-primary);
                }

                .tab-button.active {
                    color: var(--accent-primary);
                    border-bottom-color: var(--accent-primary);
                }

                .tab-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    border-radius: 9px;
                    background: var(--status-dropped);
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 700;
                    margin-left: var(--space-2);
                    line-height: 1;
                }

            `}</style>
        </div>
    );
}
