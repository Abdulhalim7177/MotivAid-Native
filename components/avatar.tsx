import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { IconSymbol } from './ui/icon-symbol';

interface Props {
  size: number;
  url: string | null;
  onUpload: (filePath: string) => void;
}

export default function Avatar({ url, size = 150, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarSize = { height: size, width: size };

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
          style={[avatarSize, styles.avatar, styles.image]}
          resizeMode="cover"
        />
      ) : (
        <View style={[avatarSize, styles.avatar, styles.noImage]}>
          <IconSymbol size={size * 0.5} name="person.fill" color="#888" />
        </View>
      )}
      <View style={styles.uploadButtonContainer}>
        <TouchableOpacity 
          onPress={uploadAvatar} 
          disabled={uploading}
          style={styles.uploadButton}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <IconSymbol size={20} name="camera.fill" color="#fff" />
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
    borderColor: 'rgba(161, 206, 220, 0.5)',
  },
  image: {
    // resizeMode is a prop on Image, not a style property in some RN versions, 
    // but in modern RN it's both. We'll use the style here.
  },
  noImage: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  uploadButton: {
    backgroundColor: '#A1CEDC',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000', // This will be updated to theme background in the usage if needed, or kept neutral
  },
});
