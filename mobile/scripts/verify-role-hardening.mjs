/**
 * Local-only check for the applied profiles.role trigger.
 * Run from mobile/ with VERIFY_FARMER_EMAIL and VERIFY_FARMER_PASSWORD set.
 * Does not print credentials or session tokens.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(mobileRoot, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const farmerEmail = process.env.VERIFY_FARMER_EMAIL;
const farmerPassword = process.env.VERIFY_FARMER_PASSWORD;
const TEMP_FIRST_NAME = '__role_verify_tmp__';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!supabaseUrl || !supabaseAnonKey) {
  fail('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}
if (!farmerEmail || !farmerPassword) {
  fail('Set VERIFY_FARMER_EMAIL and VERIFY_FARMER_PASSWORD for this run only.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function readRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Could not read profile.');
  return data;
}

let userId = null;
let originalFirstName = null;
let firstNameChanged = false;
let previousMetaRole;
let metadataForged = false;

try {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: farmerEmail,
    password: farmerPassword,
  });
  if (signInError || !signInData.user) {
    throw new Error('Farmer sign-in failed.');
  }

  userId = signInData.user.id;
  previousMetaRole = signInData.user.user_metadata?.role;

  const initial = await readRole(userId);
  const initialRole = initial.role === 'admin' || initial.role === 'farmer' ? initial.role : 'farmer';
  console.log(`Initial stored role: ${initialRole}`);
  if (initialRole !== 'farmer') {
    throw new Error('Signed-in profile is not a farmer. Escalation checks were not run.');
  }

  originalFirstName = initial.first_name ?? '';
  const { error: updateNameError } = await supabase
    .from('profiles')
    .update({ first_name: TEMP_FIRST_NAME })
    .eq('id', userId);
  if (updateNameError) throw new Error('Normal profile update failed.');
  firstNameChanged = true;

  const afterNameUpdate = await readRole(userId);
  const nameUpdateKeptRole = afterNameUpdate.role === 'farmer';
  const nameActuallyChanged = afterNameUpdate.first_name === TEMP_FIRST_NAME;

  const { error: restoreNameError } = await supabase
    .from('profiles')
    .update({ first_name: originalFirstName })
    .eq('id', userId);
  if (restoreNameError) throw new Error('Could not restore first_name.');
  firstNameChanged = false;

  const restored = await readRole(userId);
  const nameRestored = (restored.first_name ?? '') === originalFirstName;
  const normalPass = nameUpdateKeptRole && nameActuallyChanged && nameRestored && restored.role === 'farmer';
  console.log(`normal profile update: ${normalPass ? 'PASS' : 'FAIL'}`);

  const { error: escalateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);
  if (escalateError) throw new Error('Role update request failed before the stored role could be read.');

  const afterEscalate = await readRole(userId);
  console.log(`stored role after escalation attempt: ${afterEscalate.role}`);

  const { error: metaError } = await supabase.auth.updateUser({
    data: { role: 'admin' },
  });
  if (metaError) throw new Error('Metadata update failed.');
  metadataForged = true;

  const afterMeta = await readRole(userId);
  console.log(`stored role after forged metadata: ${afterMeta.role}`);

  const { error: clearMetaError } = await supabase.auth.updateUser({
    data: { role: previousMetaRole ?? null },
  });
  if (clearMetaError) throw new Error('Could not restore metadata role.');
  metadataForged = false;

  const escalationPass = afterEscalate.role === 'farmer';
  const metadataPass = afterMeta.role === 'farmer';
  const finalPass = normalPass && escalationPass && metadataPass;
  console.log(`final: ${finalPass ? 'PASS' : 'FAIL'}`);
  if (!finalPass) process.exitCode = 1;
} catch (error) {
  fail(error instanceof Error ? error.message : 'Verification failed.');
} finally {
  if (userId && firstNameChanged) {
    await supabase.from('profiles').update({ first_name: originalFirstName }).eq('id', userId);
  }
  if (metadataForged) {
    await supabase.auth.updateUser({ data: { role: previousMetaRole ?? null } });
  }
  await supabase.auth.signOut();
}
