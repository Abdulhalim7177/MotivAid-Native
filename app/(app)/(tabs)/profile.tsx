import Avatar from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function ProfileTab() {
    const { showToast } = useToast();
    const { user, profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState(profile?.username || '');
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [website, setWebsite] = useState(profile?.website || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setFullName(profile.full_name || '');
            setWebsite(profile.website || '');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    async function updateProfile(newAvatarUrl?: string) {
        try {
            setLoading(true);
            if (!user) throw new Error('No user on the session!');

            const finalAvatarUrl = typeof newAvatarUrl === 'string' ? newAvatarUrl : avatarUrl;

            const updates = {
                id: user.id,
                username,
                full_name: fullName,
                website,
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;

            await refreshProfile();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (typeof newAvatarUrl !== 'string') {
                showToast('Profile updated!', 'success');
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScreenContainer>
            <View style={styles.header}>
                <ThemedText type="displaySm">Profile</ThemedText>
            </View>

            <View style={styles.avatarSection}>
                <Avatar
                    size={120}
                    url={avatarUrl}
                    onUpload={(url) => {
                        setAvatarUrl(url);
                        updateProfile(url);
                    }}
                />
                <ThemedText color="secondary" style={styles.emailLabel}>{user?.email}</ThemedText>
            </View>

            <View style={styles.form}>
                <Input
                    label="Username"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Your username"
                />

                <Input
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your full name"
                />

                <Input
                    label="Website"
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://yourwebsite.com"
                />

                <Button
                    title="Save Changes"
                    onPress={() => updateProfile()}
                    loading={loading}
                    disabled={loading}
                />
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: Spacing.lg,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    emailLabel: {
        marginTop: Spacing.sm,
    },
    form: {
        gap: Spacing.mdl,
    },
});
