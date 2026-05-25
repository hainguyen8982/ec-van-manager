import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: settlements } = await supabase.from('weekly_settlements').select('id').order('created_at', { ascending: false }).limit(1);
  if (settlements && settlements.length > 0) {
    const lastId = settlements[0].id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await supabase.from('weekly_settlements').update({ 
      end_date: sevenDaysAgo.toISOString(),
      created_at: sevenDaysAgo.toISOString()
    }).eq('id', lastId);
    return NextResponse.json({ success: true, newDate: sevenDaysAgo });
  } else {
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
    return NextResponse.json({ success: true, newDate: sevenDaysAgo, created: true });
  }
}
