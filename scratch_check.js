const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xacwpkiqntadvuqsntlk.supabase.co';
const supabaseKey = 'sb_publishable_EeoWzPE6w3dpEgFstRDE3A_i6xkaAp9';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles:', data);
  console.log('Error:', error);
}

check();
