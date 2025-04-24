import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://blnasmvuynzkgibpwcsg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbmFzbXZ1eW56a2dpYnB3Y3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1MTU1NjgsImV4cCI6MjA2MDA5MTU2OH0.Thahrh0pglDsAxZdGT5dxa8zniKdZsivus8wWZe8Ul0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to verify keycode and get user details
export async function verifyKeycode(keycode: string) {
  try {
    // First, check if the keycode exists and get associated email
    const { data: keycodeData, error: keycodeError } = await supabase
      .from('keycodes')
      .select('user_id, email')
      .eq('code', keycode)
      .single();

    if (keycodeError) {
      console.error('Keycode error:', keycodeError);
      return { success: false, error: 'Invalid keycode' };
    }

    if (!keycodeData) {
      return { success: false, error: 'Invalid keycode' };
    }

    // Try to sign in with the email and keycode
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: keycodeData.email,
      password: keycode,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return { success: false, error: 'Authentication failed' };
    }

    return { 
      success: true, 
      data: {
        ...authData,
        user_id: keycodeData.user_id
      }
    };

  } catch (error) {
    console.error('Error verifying keycode:', error);
    return { success: false, error: 'Error verifying keycode' };
  }
}

// Function to save task data
export async function saveTaskData(data: {
  user_id: string;
  age?: number;
  gender?: string;
  pd_status?: string;
  task2_recording_url?: string;
  task3_recordings?: string[];
}) {
  try {
    const { error } = await supabase
      .from('records')
      .insert([data]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving record:', error);
    return { success: false, error: 'Failed to save record' };
  }
}

// Function to get user's latest record
export async function getLatestRecord(user_id: string) {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching record:', error);
    return { success: false, error: 'Failed to fetch record' };
  }
}

// Function to upload audio recording
export async function uploadAudioRecording(userId: string, audioUri: string) {
  try {
    const fileName = `task2_${userId}_${Date.now()}.m4a`;
    
    // First check if a record exists for the user
    const { data: existingRecord, error: recordError } = await supabase
      .from('records')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recordError && recordError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking existing record:', recordError);
      throw recordError;
    }
    
    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(fileName, {
        uri: audioUri,
        type: 'audio/m4a',
        name: fileName
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('records')
        .update({ task2_recording_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('records')
        .insert([{ 
          user_id: userId,
          task2_recording_url: publicUrl 
        }]);

      if (insertError) throw insertError;
    }

    return { success: true, url: publicUrl };
  } catch (error) {
    // console.error('Error uploading recording:', error);
    return { success: false, error: 'Failed to upload recording' };
  }
} 