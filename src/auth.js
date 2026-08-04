import { supabase } from './supabase.js';

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
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
 * Get the profile (including role and avatar) for a given user ID.
 * @param {string} userId
 * @returns {Promise<{profile: object|null, error: string|null}>}
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, avatar_url, group_name')
    .eq('id', userId)
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

/**
 * Update the user's profile.
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<{error: string|null}>}
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
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
        group_name: null // will be set later
      });
      
    if (profileError) {
      return { user: data.user, error: profileError.message };
    }
  }

  return { user: data.user, error: null };
}

/**
 * Create a new group (for teachers).
 */
export async function createGroup(userId, groupName) {
  // Generate a random 6-character code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let inviteCode = '';
  for (let i = 0; i < 6; i++) {
    inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Insert into groups table
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: groupName,
      invite_code: inviteCode,
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    return { group: null, error: error.message };
  }

  // Update teacher's profile
  const { error: profileError } = await updateProfile(userId, { group_name: groupName });
  if (profileError) {
    return { group: null, error: profileError };
  }

  return { group: data, error: null };
}

/**
 * Join an existing group using an invite code (for parents).
 */
export async function joinGroup(userId, inviteCode) {
  // Find group by code
  const { data: group, error } = await supabase
    .from('groups')
    .select('name')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .single();

  if (error || !group) {
    return { group: null, error: 'Группа с таким кодом не найдена.' };
  }

  // Update parent's profile
  const { error: profileError } = await updateProfile(userId, { group_name: group.name });
  if (profileError) {
    return { group: null, error: profileError };
  }

  return { group, error: null };
}
