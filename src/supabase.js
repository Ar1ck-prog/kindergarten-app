import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yndbytdqbfylojkrsrwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZGJ5dGRxYmZ5bG9qa3JzcndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTAzMDgsImV4cCI6MjEwMDI4NjMwOH0.zSR0q_Y3dOv37xZ2UIFaxyt1yT9N7FjUsJ87qXHepUA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
