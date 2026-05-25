const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('weekly_settlements').select('id').limit(1);
  console.log("Weekly Settlements Data:", data);
  if (error) console.error(error);
}

checkSchema();
