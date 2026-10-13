# ☁️ CloudStoragePX

**Your Files. Your Cloud. Your Control.**

CloudStoragePX is a self-hosted cloud storage platform designed to simplify file management through a modern, intuitive web interface. Deploy it on your own server and manage your files in one centralized location.

Whether you're hosting it on a VPS or a personal server, CloudStoragePX aims to provide a convenient way to upload, organize, browse, preview, and download your files.

## ✨ Features

- ☁️ **Cloud Storage** — Store and manage files in one place.
- 📁 **File & Folder Management** — Keep files organized with folders and subfolders.
- 🔍 **Smart Search** — Find files quickly and efficiently.
- 🔐 **Authentication** — Access storage through the application's authentication system.
- 📥 **File Downloads** — Download stored files when needed.
- 🖼️ **File Previews** — Preview supported file types directly in your browser.
- ⚡ **Self-Hosted Deployment** — Run CloudStoragePX on your own infrastructure.
- 🎨 **Modern Interface** — Enjoy a clean, user-friendly web experience.

## 🖥️ Supported Platforms

| Platform | Installation Method |
|---|---|
| Debian | APT + installation script |
| Ubuntu | APT + installation script |
| Windows | Git Bash or WSL, depending on script compatibility |
| Linux VPS | SSH terminal |

> **Note:** The Windows installation script may require modifications if `install.sh` depends on Linux-specific commands or packages.

## 📋 Prerequisites

Before installing CloudStoragePX, ensure you have:

- A Debian or Ubuntu server, or a compatible Windows environment.
- Git installed.
- UnRAR installed for extracting the project archive.
- A terminal or command-line interface.
- Appropriate permissions to install packages and run scripts.

## 🚀 Installation

### 🐧 Debian / Ubuntu

**Step 1 — Update your system**

```bash
sudo apt update
sudo apt upgrade -y
```

**Step 2 — Install required packages**

```bash
sudo apt install -y git unrar
```

If `unrar` is unavailable in your configured repositories, check your distribution's package sources or use a compatible RAR extraction utility.

**Step 3 — Clone the repository**

```bash
git clone https://github.com/ItzMePara9/CloudStoragePX.git
```

**Step 4 — Enter the project directory**

```bash
cd CloudStoragePX
```

**Step 5 — Extract the application archive**

```bash
unrar x cloudstoragepx.rar
```

**Step 6 — Run the installation script**

```bash
chmod +x install.sh
./install.sh
```

Alternatively, if the script is not executable:

```bash
bash install.sh
```

Follow the instructions displayed by the installer to complete the setup.

### 🪟 Windows Installation

CloudStoragePX includes a Bash installation script. Native Windows compatibility depends on the commands and dependencies used inside `install.sh`.

#### Option A — Windows Subsystem for Linux (WSL)

WSL is the recommended approach if the installation script requires a Linux environment.

**Step 1 — Install WSL**

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

Restart your computer if prompted, then complete the Linux distribution setup.

**Step 2 — Open your Linux terminal**

Launch your installed Ubuntu distribution from the Start menu.

**Step 3 — Install dependencies**

```bash
sudo apt update
sudo apt install -y git unrar
```

**Step 4 — Download CloudStoragePX**

```bash
git clone https://github.com/ItzMePara9/CloudStoragePX.git
cd CloudStoragePX
```

**Step 5 — Extract and install**

```bash
unrar x cloudstoragepx.rar
bash install.sh
```

#### Option B — Git Bash

1. Install [Git for Windows](https://git-scm.com/downloads/win).
2. Install a compatible RAR extraction utility if needed.
3. Clone the repository using Git Bash:

   ```bash
   git clone https://github.com/ItzMePara9/CloudStoragePX.git
   cd CloudStoragePX
   ```

4. Extract `cloudstoragepx.rar` using your extraction utility.
5. Run `install.sh` only if its commands and dependencies are supported in your Git Bash environment.

**Important:** If the installer uses Linux services, APT, or system-level configuration, use WSL instead of Git Bash.

## 🔧 Troubleshooting

**`git: command not found`**

Install Git:

```bash
sudo apt install git -y
```

**`unrar: command not found`**

Check whether UnRAR is available:

```bash
sudo apt install unrar -y
```

**`cloudstoragepx.rar` not found**

Check whether the archive exists in the project directory:

```bash
ls -la
find . -iname "*.rar"
```

**`install.sh` permission denied**

Run:

```bash
chmod +x install.sh
./install.sh
```

**Installation fails**

Review the error printed by the installer and verify that the required dependencies are installed. Avoid running the installer with elevated privileges unless its requirements call for them.

## 🔒 Security Recommendations

- Use strong, unique passwords.
- Keep your operating system and application dependencies updated.
- Use HTTPS when exposing the service publicly.
- Restrict access to administrative interfaces.
- Back up important files and configuration data regularly.
- Review installation scripts before executing them on a production server.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request describing your improvements.

## 📦 Repository

**GitHub:** https://github.com/ItzMePara9/CloudStoragePX

## 📄 License

Check the repository for license information before redistributing or modifying CloudStoragePX.

---

<div align="center">

### ☁️ CloudStoragePX

**Your Files. Your Cloud. Your Control.**

Built for self-hosted file management.

</div>
