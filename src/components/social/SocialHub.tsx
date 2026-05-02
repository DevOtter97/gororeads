import { useState, useEffect, useCallback } from 'preact/hooks';
import FriendList from './FriendList';
import FriendRequestList from './FriendRequestList';
import UserSearch from './UserSearch';
import Header from '../Header';
import { friendRepository } from '../../infrastructure/firebase/FirestoreFriendRepository';
import { useAuth } from '../../hooks/useAuth';

export default function SocialHub() {
    const { user } = useAuth({ redirectIfUnauthenticated: '/' });
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [pendingCount, setPendingCount] = useState(0);

    // Tab inicial via query param ?tab=...
    useEffect(() => {
        const params = new URLSearchParams(globalThis.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'requests' || tabParam === 'friends' || tabParam === 'search') {
            setActiveTab(tabParam);
        }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        friendRepository.getPendingRequests(user.id).then(requests => {
            setPendingCount(requests.length);
        }).catch(console.error);
    }, [user?.id]);

    const handleRequestHandled = useCallback(() => {
        setPendingCount(prev => Math.max(0, prev - 1));
    }, []);

    const tabs = [
        { id: 'friends', label: 'Mis Amigos' },
        { id: 'requests', label: 'Solicitudes' },
        { id: 'search', label: 'Buscar Usuarios' }
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
                    {activeTab === 'friends' && user && <FriendList userId={user.id} onSwitchToSearch={() => setActiveTab('search')} />}
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
                }

                .tab-button {
                    flex: 1 1 auto;
                    padding: var(--space-3) var(--space-3);
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                    margin-bottom: var(--space-2);
                }
                @media (min-width: 640px) {
                    .tab-button {
                        flex: 0 0 auto;
                        padding: var(--space-3) var(--space-4);
                        font-size: 1rem;
                    }
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
