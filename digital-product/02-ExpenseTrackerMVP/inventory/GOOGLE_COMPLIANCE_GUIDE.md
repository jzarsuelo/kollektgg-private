# Google Apps Script Compliance Guide — Avoiding Warnings

This guide helps you avoid or reduce **“unverified app”** and other Google warnings when using Apps Script with the Spending & Inventory Tracker (or any bound spreadsheet script).

---

## When the “Unverified app” warning appears

Google shows the unverified app screen when **all** of these are true:

- The script requests **sensitive OAuth scopes** (e.g. access to your spreadsheets or other Google data).
- The **user** authorizing the script is either:
  - A **Gmail** account, or
  - A **Google Workspace** account from a **different** organization than the script owner.
- The script’s **OAuth client is not verified** by Google.

So:

- **Same Google Workspace org:** If the script owner and all users are in the same Workspace domain, they get the **normal** authorization flow and **no** unverified warning.
- **Personal Gmail or mixed users:** Those users will see the unverified screen and must use **Advanced → Go to &lt;Project name&gt; (unsafe)** to continue (once per account).

---

## 1. Use the narrowest scopes (recommended)

Request only the permissions the script actually needs. That keeps the consent screen clearer and can affect whether Google treats the app as sensitive.

- In the script project, open **Project Settings** (gear icon) and note **Project OAuth Scopes**.
- Edit **appsscript.json** (see below) and set **oauthScopes** explicitly instead of relying on auto-detection.

For this project, the script only needs to:

- Read and write the **current** spreadsheet (the one the script is bound to).

Set **only** this scope in `appsscript.json`:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/spreadsheets"
]
```

- Use **only** `SpreadsheetApp.getActiveSpreadsheet()` in the script (no `openById`, `openByUrl`, or Drive access). That way the script only touches the open workbook and the requested scope matches behavior.
- Do **not** add Gmail, Drive, or other scopes unless you add features that need them; extra scopes increase the chance of verification requirements and user concern.

---

## 2. Set scopes explicitly in the manifest

1. In the Apps Script editor: **View → Show manifest file** (or enable “Show appsscript.json manifest file in editor” in Project Settings).
2. Open **appsscript.json** and ensure `oauthScopes` is set to the minimal list, for example:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

3. Save. New authorizations will use only these scopes.

---

## 3. When verification is *not* required

You **do not** need to submit for Google verification if:

- **Same Workspace domain:** The script is published from a Google Workspace account and **all** users who run it are in the **same** Workspace organization. They get the normal consent flow.
- **Personal use only:** Only you (the owner) use the script. You can click **Advanced → Go to &lt;Project name&gt; (unsafe)** once and continue; no verification needed for personal use.

Verification is about **public** or **cross-organization** use and user caps.

---

## 4. If you need to avoid the warning for many users (e.g. Gmail or other orgs)

To remove the unverified app screen and user caps:

1. **Request OAuth client verification** in Google Cloud Console for the project linked to the script.
2. Use a **standard Google Cloud project** (not the default “internal” one) and complete the OAuth consent screen.
3. Provide: **privacy policy URL**, **homepage**, **authorized domains**, **support email**, **application name**, **logo**, and list all **scopes** the script uses (from Project OAuth Scopes in Apps Script).
4. Submit for verification. Details: [Apps Script client verification](https://developers.google.com/apps-script/guides/client-verification).

For a small business or personal template, **verification is usually unnecessary**; users can proceed past the unverified screen once.

---

## 5. Best practices summary

| Practice | Why |
|----------|-----|
| Set **oauthScopes** explicitly in **appsscript.json** | Avoids broad auto-detected scopes and keeps permissions minimal. |
| Use only **SpreadsheetApp.getActiveSpreadsheet()** (no other files) | Aligns with a single spreadsheets scope and reduces perceived risk. |
| Avoid Gmail, Drive, Calendar, etc. unless needed | Fewer sensitive/restricted scopes → simpler consent and less chance of verification. |
| Keep script **container-bound** (one spreadsheet per copy) | Each user runs in their own file; no cross-user data access. |
| Document that “Advanced → Go to … (unsafe)” is expected for personal use | Reduces confusion the first time someone authorizes. |

---

## 6. Triggers and authorization

If you add **installable triggers** (e.g. on edit, time-driven):

- Triggers run as you (the user who installed them). They use the same OAuth scopes as the project.
- Use **ScriptApp.requireScopes()** in the function that installs the trigger so that the user is prompted for all needed permissions at install time.
- Keep the same minimal scope set so the consent screen stays as above.

---

## 7. References

- [OAuth client verification (Apps Script)](https://developers.google.com/apps-script/guides/client-verification)
- [Authorization scopes (Apps Script)](https://developers.google.com/apps-script/concepts/scopes)
- [Unverified apps (Google)](https://support.google.com/cloud/answer/7454865)
- [OAuth application verification FAQ](https://support.google.com/cloud/answer/9110914)

Using the minimal **spreadsheets** scope, only the active spreadsheet, and no extra services keeps this script compliant and simple; for single-user or same-domain use, no verification is required and the only “warning” is the one-time unverified screen, which users can pass with **Advanced → Go to … (unsafe)**.
