# Set Up and Run the CLINIQ Frontend

This guide is for a first-time setup on Windows. It starts only the frontend; Laravel, PHP, and MySQL are not needed.

## 1. Install Git and Node.js

Install Git for Windows and Node.js **22.22.2 or newer**. The frontend's Vite version needs a recent Node.js release.

Open PowerShell and check that the installations are available:

```powershell
git --version
node --version
npm --version
```

If PowerShell says a command is not recognized, finish installing that program, close and reopen PowerShell, then try again.

## 2. Set your Git name and email

Git adds this name and email to commits you create. Replace the examples with your own:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

To have GitHub associate your commits with your account, use an email address verified on GitHub. These settings identify your commits; they do not sign you in to GitHub.

Check the saved values:

```powershell
git config --global user.name
git config --global user.email
```

## 3. Clone the project

In PowerShell, go to the folder where you want the project stored, then clone it:

```powershell
cd $HOME\Documents
git clone https://github.com/zekuuu/cliniq.git
cd cliniq
```

Git creates a `cliniq` folder containing the project.

If you already cloned the project, do not clone it again. Update it from the repository root:

```powershell
cd $HOME\Documents\cliniq
git pull origin main
```

## 4. Open the frontend folder

```powershell
cd frontend
```

## 5. Install frontend dependencies

```powershell
npm ci
```

This installs the exact dependency versions recorded for the frontend.

## 6. Start the development server

In `frontend\package.json`, replace the existing `scripts.dev` value with:

```json
"dev": "if exist frontend (cd frontend && git pull origin main && vite --host 0.0.0.0 --port 5173) else (git pull origin main && vite --host 0.0.0.0 --port 5173)"
```

Save `package.json`, then run the dev script from the frontend folder:

```powershell
npm run dev
```

Keep this PowerShell window open while using the app. Open the URL printed in the terminal, usually [http://localhost:5173](http://localhost:5173).

Press **Ctrl+C** in PowerShell to stop the server.

The frontend runs using its mock data. You do not need to start the backend, PHP, or MySQL.

## 7. Run it again on a later day

After the first-time setup, open VSCode and make sure the cliniq project is opened, then run the following command:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Keep PowerShell open while using the app, then press **Ctrl+C** there to stop it.
