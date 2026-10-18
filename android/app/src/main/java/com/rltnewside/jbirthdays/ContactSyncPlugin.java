// Copyright (C) 2024-2026 Justin Marty (RLT-Newside). Licensed under GPL-3.0.
package com.rltnewside.jbirthdays;

import android.Manifest;
import android.content.ContentProviderOperation;
import android.content.ContentResolver;
import android.content.SyncAdapterType;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Email;
import android.provider.ContactsContract.CommonDataKinds.Event;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredPostal;
import android.provider.ContactsContract.Contacts;
import android.provider.ContactsContract.Data;
import android.provider.ContactsContract.RawContacts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Reads contacts and writes ONLY birthday Event rows. Never creates/deletes contacts
 * and never touches names or other data rows.
 */
@CapacitorPlugin(
    name = "ContactSync",
    permissions = {
        @Permission(alias = "contactsRead", strings = { Manifest.permission.READ_CONTACTS }),
        @Permission(alias = "contactsWrite", strings = { Manifest.permission.WRITE_CONTACTS })
    }
)
public class ContactSyncPlugin extends Plugin {

    // Accounts that are mirrors of other apps or SIM cards: never written to.
    private static final Set<String> READ_ONLY_ACCOUNTS = new HashSet<>(Arrays.asList(
        "com.whatsapp", "com.whatsapp.w4b", "org.telegram.messenger", "org.thoughtcrime.securesms",
        "com.viber.voip", "com.android.sim", "vnd.sec.contact.sim", "vnd.sec.contact.sim2",
        "com.android.contacts.sim", "com.skype.contacts.sync", "com.facebook.auth.login"
    ));
    private static final String GOOGLE = "com.google";

    // ---------- permissions ----------

    @PluginMethod
    public void requestRead(PluginCall call) {
        if (getPermissionState("contactsRead") == PermissionState.GRANTED) {
            resolveGranted(call, true);
        } else {
            requestPermissionForAlias("contactsRead", call, "readCallback");
        }
    }

    @PluginMethod
    public void requestWrite(PluginCall call) {
        if (getPermissionState("contactsWrite") == PermissionState.GRANTED) {
            resolveGranted(call, true);
        } else {
            requestPermissionForAlias("contactsWrite", call, "writeCallback");
        }
    }

    @PermissionCallback
    private void readCallback(PluginCall call) {
        resolveGranted(call, getPermissionState("contactsRead") == PermissionState.GRANTED);
    }

    @PermissionCallback
    private void writeCallback(PluginCall call) {
        resolveGranted(call, getPermissionState("contactsWrite") == PermissionState.GRANTED);
    }

    private void resolveGranted(PluginCall call, boolean granted) {
        JSObject r = new JSObject();
        r.put("granted", granted);
        call.resolve(r);
    }

    // ---------- read ----------

    @PluginMethod
    public void list(PluginCall call) {
        if (getPermissionState("contactsRead") != PermissionState.GRANTED) {
            call.reject("Contacts permission not granted", "NO_PERMISSION");
            return;
        }
        new Thread(() -> {
            try {
                ContentResolver cr = getContext().getContentResolver();
                Map<Long, RawInfo> raws = loadRawContacts(cr, null);
                Map<Long, String> birthdays = loadBirthdays(cr, null, raws);
                JSArray out = new JSArray();
                try (Cursor c = cr.query(Contacts.CONTENT_URI,
                    new String[] { Contacts._ID, Contacts.LOOKUP_KEY, Contacts.DISPLAY_NAME_PRIMARY },
                    null, null, Contacts.DISPLAY_NAME_PRIMARY + " COLLATE LOCALIZED ASC")) {
                    while (c != null && c.moveToNext()) {
                        long id = c.getLong(0);
                        String name = c.getString(2);
                        if (name == null || name.trim().isEmpty()) continue;
                        JSObject o = new JSObject();
                        o.put("contactId", String.valueOf(id));
                        o.put("lookupKey", c.getString(1));
                        o.put("name", name);
                        o.put("birthday", birthdays.get(id));
                        o.put("writable", hasWritableRaw(raws, id));
                        out.put(o);
                    }
                }
                JSObject r = new JSObject();
                r.put("contacts", out);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Could not read contacts", "FAILED");
            }
        }, "jbirthdays-contacts-list").start();
    }

    @PluginMethod
    public void get(PluginCall call) {
        if (getPermissionState("contactsRead") != PermissionState.GRANTED) {
            call.reject("Contacts permission not granted", "NO_PERMISSION");
            return;
        }
        JSArray keys = call.getArray("lookupKeys", new JSArray());
        new Thread(() -> {
            try {
                ContentResolver cr = getContext().getContentResolver();
                JSArray found = new JSArray();
                JSArray missing = new JSArray();
                for (int i = 0; i < keys.length(); i++) {
                    String key = keys.getString(i);
                    JSObject details = readDetails(cr, key);
                    if (details == null) missing.put(key);
                    else found.put(details);
                }
                JSObject r = new JSObject();
                r.put("found", found);
                r.put("missing", missing);
                call.resolve(r);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Could not read contacts", "FAILED");
            }
        }, "jbirthdays-contacts-get").start();
    }

    private JSObject readDetails(ContentResolver cr, String lookupKey) {
        Long id = resolveContactId(cr, lookupKey);
        if (id == null) return null;
        JSObject o = new JSObject();
        try (Cursor c = cr.query(contactUri(id),
            new String[] { Contacts.LOOKUP_KEY, Contacts.DISPLAY_NAME_PRIMARY, Contacts.CONTACT_LAST_UPDATED_TIMESTAMP },
            null, null, null)) {
            if (c == null || !c.moveToFirst()) return null;
            o.put("requestedKey", lookupKey);
            o.put("lookupKey", c.getString(0));
            o.put("contactId", String.valueOf(id));
            o.put("name", c.getString(1));
            o.put("lastUpdated", c.isNull(2) ? 0 : c.getLong(2));
        }
        Map<Long, RawInfo> raws = loadRawContacts(cr, id);
        o.put("writable", hasWritableRaw(raws, id));
        o.put("birthday", loadBirthdays(cr, id, raws).get(id));

        JSArray phones = new JSArray();
        JSArray emails = new JSArray();
        JSArray addresses = new JSArray();
        try (Cursor d = cr.query(Data.CONTENT_URI,
            new String[] { Data.MIMETYPE, Data.DATA1, Data.DATA2, Phone.NORMALIZED_NUMBER },
            Data.CONTACT_ID + "=? AND " + Data.MIMETYPE + " IN (?,?,?)",
            new String[] { String.valueOf(id), Phone.CONTENT_ITEM_TYPE, Email.CONTENT_ITEM_TYPE, StructuredPostal.CONTENT_ITEM_TYPE },
            null)) {
            while (d != null && d.moveToNext()) {
                String mime = d.getString(0);
                String value = d.getString(1);
                if (value == null || value.trim().isEmpty()) continue;
                if (Phone.CONTENT_ITEM_TYPE.equals(mime)) {
                    JSObject p = new JSObject();
                    p.put("number", value);
                    p.put("normalized", d.getString(3));
                    p.put("type", phoneType(d.isNull(2) ? 0 : d.getInt(2)));
                    phones.put(p);
                } else if (Email.CONTENT_ITEM_TYPE.equals(mime)) {
                    emails.put(value);
                } else {
                    addresses.put(value);
                }
            }
        }
        o.put("phones", phones);
        o.put("emails", emails);
        o.put("addresses", addresses);
        return o;
    }

    private static Uri contactUri(long id) {
        return android.content.ContentUris.withAppendedId(Contacts.CONTENT_URI, id);
    }

    private static String phoneType(int t) {
        if (t == Phone.TYPE_MOBILE || t == Phone.TYPE_WORK_MOBILE) return "mobile";
        if (t == Phone.TYPE_HOME) return "home";
        if (t == Phone.TYPE_WORK) return "work";
        return "other";
    }

    // ---------- write ----------

    @PluginMethod
    public void setBirthday(PluginCall call) {
        String lookupKey = call.getString("lookupKey");
        String startDate = call.getString("startDate");
        if (lookupKey == null || startDate == null || !startDate.matches("^(\\d{4}|-)-\\d{2}-\\d{2}$")) {
            call.reject("Invalid arguments", "BAD_ARGS");
            return;
        }
        if (getPermissionState("contactsWrite") != PermissionState.GRANTED) {
            call.reject("Write permission not granted", "NO_PERMISSION");
            return;
        }
        new Thread(() -> {
            try {
                ContentResolver cr = getContext().getContentResolver();
                Long contactId = resolveContactId(cr, lookupKey);
                if (contactId == null) {
                    call.reject("Contact not found", "NOT_FOUND");
                    return;
                }
                Map<Long, RawInfo> raws = loadRawContacts(cr, contactId);

                // 1) An existing birthday row in a writable raw contact → update it in place.
                Long rowId = null;
                try (Cursor d = cr.query(Data.CONTENT_URI,
                    new String[] { Data._ID, Data.RAW_CONTACT_ID },
                    Data.CONTACT_ID + "=? AND " + Data.MIMETYPE + "=? AND " + Event.TYPE + "=?",
                    new String[] { String.valueOf(contactId), Event.CONTENT_ITEM_TYPE, String.valueOf(Event.TYPE_BIRTHDAY) },
                    null)) {
                    while (d != null && d.moveToNext()) {
                        RawInfo raw = raws.get(d.getLong(1));
                        if (raw != null && raw.writable) {
                            rowId = d.getLong(0);
                            break;
                        }
                    }
                }

                ArrayList<ContentProviderOperation> ops = new ArrayList<>();
                if (rowId != null) {
                    ops.add(ContentProviderOperation.newUpdate(Data.CONTENT_URI)
                        .withSelection(Data._ID + "=?", new String[] { String.valueOf(rowId) })
                        .withValue(Event.START_DATE, startDate)
                        .build());
                } else {
                    // 2) Otherwise add a birthday row to the Google raw contact, else the first writable one.
                    Long target = null;
                    for (RawInfo raw : raws.values()) {
                        if (!raw.writable) continue;
                        if (GOOGLE.equals(raw.accountType)) {
                            target = raw.id;
                            break;
                        }
                        if (target == null) target = raw.id;
                    }
                    if (target == null) {
                        call.reject("Contact is read-only", "NOT_WRITABLE");
                        return;
                    }
                    ops.add(ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValue(Data.RAW_CONTACT_ID, target)
                        .withValue(Data.MIMETYPE, Event.CONTENT_ITEM_TYPE)
                        .withValue(Event.TYPE, Event.TYPE_BIRTHDAY)
                        .withValue(Event.START_DATE, startDate)
                        .build());
                }
                cr.applyBatch(ContactsContract.AUTHORITY, ops);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Could not update contact", "FAILED");
            }
        }, "jbirthdays-contacts-write").start();
    }

    // ---------- helpers ----------

    private static final class RawInfo {
        final long id;
        final long contactId;
        final String accountType;
        final boolean writable;

        RawInfo(long id, long contactId, String accountType, boolean writable) {
            this.id = id;
            this.contactId = contactId;
            this.accountType = accountType;
            this.writable = writable;
        }
    }

    private Long resolveContactId(ContentResolver cr, String lookupKey) {
        Uri lookupUri = Uri.withAppendedPath(Contacts.CONTENT_LOOKUP_URI, lookupKey);
        Uri contactUri = Contacts.lookupContact(cr, lookupUri);
        if (contactUri == null) return null;
        try {
            return Long.parseLong(contactUri.getLastPathSegment());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Account types whose sync adapter can't upload are mirrors (read-only). */
    private Map<String, Boolean> uploadableAccountTypes() {
        Map<String, Boolean> map = new HashMap<>();
        for (SyncAdapterType t : ContentResolver.getSyncAdapterTypes()) {
            if (ContactsContract.AUTHORITY.equals(t.authority)) {
                Boolean prev = map.get(t.accountType);
                map.put(t.accountType, (prev != null && prev) || t.supportsUploading());
            }
        }
        return map;
    }

    private Map<Long, RawInfo> loadRawContacts(ContentResolver cr, Long contactId) {
        Map<String, Boolean> uploadable = uploadableAccountTypes();
        Map<Long, RawInfo> raws = new HashMap<>();
        String sel = RawContacts.DELETED + "=0" + (contactId != null ? " AND " + RawContacts.CONTACT_ID + "=?" : "");
        String[] args = contactId != null ? new String[] { String.valueOf(contactId) } : null;
        try (Cursor c = cr.query(RawContacts.CONTENT_URI,
            new String[] { RawContacts._ID, RawContacts.CONTACT_ID, RawContacts.ACCOUNT_TYPE }, sel, args, null)) {
            while (c != null && c.moveToNext()) {
                String type = c.getString(2);
                boolean writable;
                if (type == null) writable = true; // device-local contact
                else if (READ_ONLY_ACCOUNTS.contains(type)) writable = false;
                else writable = !uploadable.containsKey(type) || Boolean.TRUE.equals(uploadable.get(type));
                raws.put(c.getLong(0), new RawInfo(c.getLong(0), c.getLong(1), type, writable));
            }
        }
        return raws;
    }

    private static boolean hasWritableRaw(Map<Long, RawInfo> raws, long contactId) {
        for (RawInfo r : raws.values()) if (r.contactId == contactId && r.writable) return true;
        return false;
    }

    /** contactId → START_DATE, preferring a birthday stored in a writable raw contact. */
    private Map<Long, String> loadBirthdays(ContentResolver cr, Long contactId, Map<Long, RawInfo> raws) {
        Map<Long, String> out = new HashMap<>();
        Set<Long> fromWritable = new HashSet<>();
        List<String> args = new ArrayList<>(Arrays.asList(Event.CONTENT_ITEM_TYPE, String.valueOf(Event.TYPE_BIRTHDAY)));
        String sel = Data.MIMETYPE + "=? AND " + Event.TYPE + "=?";
        if (contactId != null) {
            sel += " AND " + Data.CONTACT_ID + "=?";
            args.add(String.valueOf(contactId));
        }
        try (Cursor c = cr.query(Data.CONTENT_URI,
            new String[] { Data.CONTACT_ID, Data.RAW_CONTACT_ID, Event.START_DATE }, sel, args.toArray(new String[0]), null)) {
            while (c != null && c.moveToNext()) {
                long cid = c.getLong(0);
                String date = c.getString(2);
                if (date == null || date.trim().isEmpty()) continue;
                RawInfo raw = raws.get(c.getLong(1));
                boolean writable = raw != null && raw.writable;
                if (!out.containsKey(cid) || (writable && !fromWritable.contains(cid))) {
                    out.put(cid, date.trim());
                    if (writable) fromWritable.add(cid);
                }
            }
        }
        return out;
    }
}
