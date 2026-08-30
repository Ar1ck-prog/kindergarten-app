import { supabase } from './supabase.js';

/**
 * Sign in with email and password.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Get the profile (including role, avatar, kindergarten) for a given user ID.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, avatar_url, group_name, kindergarten_id')
    .eq('id', userId)
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

/**
 * Update the user's profile.
 */
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error ? error.message : null };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Get the currently authenticated user.
 */
export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return null;
  }
  return session?.user || null;
}

/**
 * Generate a random 6-character invite code.
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Sign up a new user.
 */
export async function signUp(email, password, profileData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  // Insert profile for this user
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        role: profileData.role,
        group_name: null,
        kindergarten_id: null
      });
      
    if (profileError) {
      return { user: data.user, error: profileError.message };
    }
  }

  return { user: data.user, error: null };
}

/**
 * Create a new kindergarten (for directors).
 */
export async function createKindergarten(userId, kindergartenName) {
  const inviteCode = generateInviteCode();

  const { data, error } = await supabase
    .from('kindergartens')
    .insert({
      name: kindergartenName,
      invite_code: inviteCode,
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    return { kindergarten: null, error: error.message };
  }

  // Update director's profile with kindergarten_id
  const { error: profileError } = await updateProfile(userId, { kindergarten_id: data.id });
  if (profileError) {
    return { kindergarten: null, error: profileError };
  }

  return { kindergarten: data, error: null };
}

/**
 * Join a kindergarten using invite code (for teachers).
 */
export async function joinKindergarten(userId, inviteCode) {
  const { data: kg, error } = await supabase
    .from('kindergartens')
    .select('id, name')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (error || !kg) {
    return { kindergarten: null, error: 'Садик с таким кодом не найден.' };
  }

  // Update teacher's profile with kindergarten_id
  const { error: profileError } = await updateProfile(userId, { kindergarten_id: kg.id });
  if (profileError) {
    return { kindergarten: null, error: profileError };
  }

  return { kindergarten: kg, error: null };
}

/**
 * Create a new group within a kindergarten (for teachers/directors).
 */
export async function createGroup(userId, groupName, kindergartenId) {
  const inviteCode = generateInviteCode();

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: groupName,
      invite_code: inviteCode,
      created_by: userId,
      kindergarten_id: kindergartenId
    })
    .select()
    .single();

  if (error) {
    return { group: null, error: error.message };
  }

  // Update teacher's/director's profile
  const { error: profileError } = await updateProfile(userId, { group_name: groupName });
  if (profileError) {
    return { group: null, error: profileError };
  }

  return { group: data, error: null };
}

/**
 * Join an existing group within a kindergarten (for teachers).
 */
export async function joinExistingGroup(userId, groupName) {
  const { error: profileError } = await updateProfile(userId, { group_name: groupName });
  if (profileError) {
    return { error: profileError };
  }
  return { error: null };
}

/**
 * Join an existing group using an invite code (for parents).
 */
export async function joinGroup(userId, inviteCode) {
  const { data: group, error } = await supabase
    .from('groups')
    .select('name, kindergarten_id')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (error || !group) {
    return { group: null, error: 'Группа с таким кодом не найдена.' };
  }

  // Update parent's profile with group_name and kindergarten_id
  const { error: profileError } = await updateProfile(userId, { 
    group_name: group.name,
    kindergarten_id: group.kindergarten_id
  });
  if (profileError) {
    return { group: null, error: profileError };
  }

  return { group, error: null };
}
