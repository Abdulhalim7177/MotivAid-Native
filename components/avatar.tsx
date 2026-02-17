import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { IconSymbol } from './ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

interface Props {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSize = { height: size, width: size };

  const placeholderIconColor = useThemeColor({}, 'placeholder');
  const buttonTextColor = useThemeColor({}, 'buttonText');
  const tintColor = useThemeColor({}, 'tint');
  const bgColor = useThemeColor({}, 'background');
  const inputBgColor = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    if (url) downloadImage(url);
  }, [url]);

  async function downloadImage(path: string) {
    try {
      const { data, error } = await supabase.storage.from('avatars').download(path);
      if (error) throw error;

      const fr = new FileReader();
      fr.readAsDataURL(data);
      fr.onload = () => {
        setAvatarUrl(fr.result as string);
      };
    } catch (error) {
      // Handled
    }
  }

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const image = result.assets[0];

      if (!image.uri) {
        throw new Error('No image uri!');
      }

      const base64 = await FileSystem.readAsStringAsync(image.uri, { encoding: 'base64' });
      const filePath = `${Math.random()}.${image.uri.split('.').pop()}`;
      const contentType = `image/${image.uri.split('.').pop()}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), { contentType });

      if (error) throw error;

      onUpload(filePath);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      } else {
        throw error;
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Avatar"
          style={[avatarSize, styles.avatar, styles.image, { borderColor: tintColor + '40' }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[avatarSize, styles.avatar, { backgroundColor: inputBgColor, borderColor }]}>
          <IconSymbol size={size * 0.5} name="person.fill" color={placeholderIconColor} />
        </View>
      )}
      <View style={styles.uploadButtonContainer}>
        <TouchableOpacity
          onPress={uploadAvatar}
          disabled={uploading}
          style={[styles.uploadButton, { backgroundColor: tintColor, borderColor: bgColor }]}
        >
          {uploading ? (
            <ActivityIndicator color={buttonTextColor} />
          ) : (
            <IconSymbol size={20} name="camera.fill" color={buttonTextColor} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {},
  uploadButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
});
