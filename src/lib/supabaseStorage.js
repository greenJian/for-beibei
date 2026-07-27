import { supabase } from './supabaseClient';

export async function uploadToSupabase(file, bucket = 'firsts-images') {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.name?.split('.').pop() || 'jpg'}`;
    const filePath = fileName;
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { publicUrl, path: filePath };
}

export function getSupabasePublicUrl(path, bucket = 'firsts-images') {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
}
