const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function mockData() {
  // First get the most recent settlement
  const { data: settlements, error: fetchError } = await supabase
    .from('weekly_settlements')
    .select('id, created_at, end_date')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (fetchError || !settlements || settlements.length === 0) {
    console.log("No settlements found, creating a mock one 7 days ago...");
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase.from('weekly_settlements').insert({
        start_date: sevenDaysAgo.toISOString(),
        end_date: sevenDaysAgo.toISOString(),
        is_confirmed: true,
        net_profit: 0,
        total_income: 0,
        total_expense: 0,
        fixed_costs: 0,
        created_at: sevenDaysAgo.toISOString()
    });
    console.log("Created mock settlement.");
  } else {
    // Update it to be 7 days ago
    const lastSettlement = settlements[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('weekly_settlements')
      .update({ 
        end_date: sevenDaysAgo.toISOString(),
        created_at: sevenDaysAgo.toISOString()
      })
      .eq('id', lastSettlement.id);
    console.log("Updated last settlement to 7 days ago:", sevenDaysAgo.toISOString());
  }
}

mockData();
