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

  // 1. Query matching transactions before update
  const { data: beforeList, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_date', '2026-06-04')
    .eq('category', 'grab');

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message });
  }

  // 2. Perform update
  const { data: updatedList, error: updateError } = await supabase
    .from('transactions')
    .update({ category: 'lalamove' })
    .eq('transaction_date', '2026-06-04')
    .eq('category', 'grab')
    .select();

  return NextResponse.json({
    success: true,
    found: beforeList,
    updated: updatedList,
    error: updateError ? updateError.message : null
  });
}
