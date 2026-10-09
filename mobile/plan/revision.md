IMPLEMENT APPROVED HOST-DRAFT FIX

Implement exactly:

mobile_edge_identity_18c68ac2.plan(3).md

Modify ONLY:

mobile/app/settings/hardware.tsx

REQUIREMENTS:

1. Add a local draft state for the IP/host input.

2. The TextInput must:
   - display the local draft
   - update only the local draft while typing
   - NOT call setServerHost while typing
   - NOT write AsyncStorage while typing
   - NOT trigger /health while typing

3. When the screen first receives the saved serverHost:
   - copy it into the draft only if the user has not started editing

4. Preserve the user's in-progress draft:
   - a later saved-host/context update must not overwrite the draft while editing

5. Connect to Scanner must:
   - stop the editing state
   - call setServerHost(draftHost)
   - let the existing shared flow normalize/save the host
   - run the existing identity check

6. Keep:
   - automatic saved-host identity check on initial load
   - edgeIdentity === "matched" as the only connected state
   - current status/button text mapping
   - existing AbortController timeout
   - existing temporary [edge-health] logs

7. Do NOT modify:
   - ESP32Context.tsx
   - edge_server.py
   - firmware
   - Supabase
   - pairing
   - home screen
   - Vision
   - Manual Override

8. Do not stage.
9. Do not commit.
10. Do not push.

After editing return:
1. exact hardware.tsx diff
2. confirm typing no longer calls setServerHost
3. confirm Connect still calls setServerHost
4. confirm initial saved-host auto-check remains
5. confirm only hardware.tsx changed