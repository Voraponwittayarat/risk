# Starting RiskHRMS on Windows

Use this exact file:

`D:\antigravity project\riskHRMS\run.bat`

The launcher checks Node/npm, dependencies, XAMPP MariaDB, API port 3000, and frontend port 5173. It reuses healthy servers instead of starting duplicate Vite instances on port 5174. The browser opens only after both services respond successfully.

If startup fails, leave the error window open and read the red message. Common fixes:

- Start **MySQL** in XAMPP Control Panel.
- Close a different application occupying port 3000 or 5173.
- Run `npm install` in the folder named in the missing-dependency message.

Do not use the path `D:\antigravity projectriskHRMSRun.bat`; it is missing directory separators.
