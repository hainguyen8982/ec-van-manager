import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== 'tien_update_secret_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query all transactions from June 1st to June 8th, 2026
  const { data: allList, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', '2026-06-01')
    .lte('transaction_date', '2026-06-08');

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message });
  }

  return NextResponse.json({
    success: true,
    allTransactions: allList
  });
}
