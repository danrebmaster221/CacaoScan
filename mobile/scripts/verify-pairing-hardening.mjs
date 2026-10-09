/**
 * Local-only check for the applied machine-link trigger and pair_machine.
 * Run from mobile/ with VERIFY_FARMER_EMAIL and VERIFY_FARMER_PASSWORD set.
 * Does not print credentials, PINs, or session tokens.
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
const machineId = process.env.VERIFY_MACHINE_ID?.trim() || '';
const machinePin = process.env.VERIFY_MACHINE_PIN || '';
const TEMP_FIRST_NAME = '__pair_verify_tmp__';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function label(ok) {
  return ok ? 'PASS' : 'FAIL';
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

function wrongPin() {
  let pin = '000000';
  if (machinePin && pin === machinePin) pin = '000001';
  return pin;
}

async function readProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('linked_machine_id, first_name')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Could not read profile.');
  return data;
}

let userId = null;
let originalFirstName = null;
let firstNameChanged = false;
const results = [];

try {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: farmerEmail,
    password: farmerPassword,
  });
  if (signInError || !signInData.user) {
    throw new Error('Farmer sign-in failed.');
  }

  userId = signInData.user.id;
  const initial = await readProfile(userId);
  const initialLink = initial.linked_machine_id ?? null;
  console.log(`Initial linked machine: ${initialLink ?? 'null'}`);

  const bypassTarget = machineId || 'verify-pairing-bypass-id';
  await supabase
    .from('profiles')
    .update({ linked_machine_id: bypassTarget })
    .eq('id', userId);
  const afterBypass = await readProfile(userId);
  const bypassPass = (afterBypass.linked_machine_id ?? null) === initialLink;
  console.log(`Direct linked_machine_id bypass: ${label(bypassPass)}`);
  results.push(bypassPass);

  originalFirstName = afterBypass.first_name ?? '';
  const linkBeforeName = afterBypass.linked_machine_id ?? null;
  const { error: nameError } = await supabase
    .from('profiles')
    .update({ first_name: TEMP_FIRST_NAME })
    .eq('id', userId);
  if (nameError) throw new Error('Normal profile update failed.');
  firstNameChanged = true;
  const duringName = await readProfile(userId);
  const { error: restoreNameError } = await supabase
    .from('profiles')
    .update({ first_name: originalFirstName })
    .eq('id', userId);
  if (restoreNameError) throw new Error('Could not restore first_name.');
  firstNameChanged = false;
  const afterName = await readProfile(userId);
  const namePass =
    duringName.first_name === TEMP_FIRST_NAME &&
    (afterName.first_name ?? '') === originalFirstName &&
    (afterName.linked_machine_id ?? null) === linkBeforeName;
  console.log(`Normal profile update: ${label(namePass)}`);
  results.push(namePass);

  const linkBeforeWrong = afterName.linked_machine_id ?? null;
  const wrongTarget = machineId || 'verify-pairing-wrong-pin-id';
  const { data: wrongOk, error: wrongError } = await supabase.rpc('pair_machine', {
    p_machine_id: wrongTarget,
    p_pin: wrongPin(),
  });
  const afterWrong = await readProfile(userId);
  const wrongPass =
    !wrongError &&
    wrongOk !== true &&
    (afterWrong.linked_machine_id ?? null) === linkBeforeWrong;
  console.log(`Wrong PIN: ${label(wrongPass)}`);
  results.push(wrongPass);

  const unknownId = `verify-no-such-machine-${Date.now()}`;
  const linkBeforeUnknown = afterWrong.linked_machine_id ?? null;
  const { data: unknownOk, error: unknownError } = await supabase.rpc('pair_machine', {
    p_machine_id: unknownId,
    p_pin: wrongPin(),
  });
  const afterUnknown = await readProfile(userId);
  const unknownPass =
    !unknownError &&
    unknownOk !== true &&
    (afterUnknown.linked_machine_id ?? null) === linkBeforeUnknown;
  console.log(`Unknown machine: ${label(unknownPass)}`);
  results.push(unknownPass);

  let correctPass = null;
  let unpairPass = null;
  if (machineId && machinePin) {
    const { data: correctOk, error: correctError } = await supabase.rpc('pair_machine', {
      p_machine_id: machineId,
      p_pin: machinePin,
    });
    const afterCorrect = await readProfile(userId);
    correctPass =
      !correctError &&
      correctOk === true &&
      afterCorrect.linked_machine_id === machineId;
    console.log(`Correct PIN: ${label(correctPass)}`);
    results.push(correctPass);

    if (correctPass) {
      const { error: unpairError } = await supabase
        .from('profiles')
        .update({ linked_machine_id: null })
        .eq('id', userId);
      const afterUnpair = await readProfile(userId);
      unpairPass = !unpairError && (afterUnpair.linked_machine_id ?? null) === null;
      console.log(`Unpair to null: ${label(unpairPass)}`);
      results.push(unpairPass);
    } else {
      console.log('Unpair to null: NOT RUN');
    }
  } else {
    console.log('Correct PIN: NOT RUN');
    console.log('Unpair to null: NOT RUN');
  }

  const anyFail = results.some((ok) => !ok);
  const incomplete = correctPass === null || unpairPass === null;
  if (anyFail) {
    console.log('Final: FAIL');
    process.exitCode = 1;
  } else if (incomplete) {
    console.log('Final: INCOMPLETE');
  } else {
    console.log('Final: PASS');
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'Verification failed.');
} finally {
  if (userId && firstNameChanged) {
    await supabase.from('profiles').update({ first_name: originalFirstName }).eq('id', userId);
  }
  await supabase.auth.signOut();
}
