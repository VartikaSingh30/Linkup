import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string, fullName: string, username: string) {
  try {
    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Username is already taken');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        username: username,
        avatar_color: '#667eea'
      });
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signIn(emailOrUsername: string, password: string) {
  try {
    let email = emailOrUsername;

    // Check if input is a username (not an email)
    if (!emailOrUsername.includes('@')) {
      // We need to create a Supabase function to look up email by username
      // For now, we'll call a RPC function
      const { data: emailData, error: lookupError } = await supabase
        .rpc('get_email_by_username', { username_input: emailOrUsername });

      if (lookupError || !emailData) {
        throw new Error('Invalid username or password');
      }

      email = emailData;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: data.user, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_, session) => {
    callback(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
  });

  return data.subscription;
}
