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

**Step 2 — Clone the repository**

```bash
git clone https://github.com/ItzMePara9/CloudStoragePX.git
```

**Step 3 — Enter the project directory**

```bash
cd CloudStoragePX
```

**Step 4 — Run the installation script**

```bash
chmod +x install.sh
./install.sh
```

Alternatively, if the script is not executable:

```bash
bash install.sh
```

Follow the instructions displayed by the installer to complete the setup.

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
