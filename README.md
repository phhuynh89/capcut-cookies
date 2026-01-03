# CapCut Cookie Refresh

Automated tool to refresh CapCut cookies using Puppeteer. This project automatically logs into CapCut accounts and extracts `sid_guard` cookies, then uploads them to the API.

## Features

- 🔄 Automatically fetches accounts without cookies from API
- 🤖 Uses Puppeteer to automate login process
- 🍪 Extracts and filters `sid_guard` cookies
- 📤 Uploads cookies back to the API
- ⏰ Supports scheduled execution via cron or GitHub Actions

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git (for GitHub Actions workflow)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd capcut-cookies
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
API_BASE_URL=https://namoacademy-api.huynhphvan.workers.dev
LOGIN_URL=https://www.capcut.com/vi-vn/login
PUPPETEER_HEADLESS=false
```

## Usage

### Manual Execution

Run the script manually:
```bash
npm start
```

### Trigger GitHub Actions Workflow

To manually trigger the GitHub Actions workflow:
```bash
npm run trigger
# or
./trigger-workflow.sh
```

## Scheduled Execution with Crontab

To run the script automatically every 5 minutes using crontab:

### 1. Open crontab editor:
```bash
crontab -e
```

### 2. Add the following line:

**For macOS/Linux:**
```bash
*/5 * * * * cd /path/to/capcut-cookies && /usr/local/bin/npm start >> /path/to/capcut-cookies/logs/cron.log 2>&1
```

**Example with full path:**
```bash
*/5 * * * * cd /Users/phuoc/Projects/namoacademy/capcut-cookies && /usr/local/bin/npm start >> /Users/phuoc/Projects/namoacademy/capcut-cookies/logs/cron.log 2>&1
```

**Important:** Replace `/path/to/capcut-cookies` with your actual project path.

### 3. Ensure Node.js and npm paths are correct:

Find your npm path:
```bash
which npm
```

Find your node path:
```bash
which node
```

### 4. Create logs directory (optional but recommended):
```bash
mkdir -p logs
```

### 5. Alternative: Using absolute paths for better reliability

If you encounter path issues, use absolute paths:
```bash
*/5 * * * * /usr/local/bin/node /path/to/capcut-cookies/index.js >> /path/to/capcut-cookies/logs/cron.log 2>&1
```

### 6. Set environment variables in crontab:

If you need environment variables, add them before the command:
```bash
*/5 * * * * cd /path/to/capcut-cookies && API_BASE_URL=https://namoacademy-api.huynhphvan.workers.dev LOGIN_URL=https://www.capcut.com/vi-vn/login PUPPETEER_HEADLESS=true /usr/local/bin/npm start >> /path/to/capcut-cookies/logs/cron.log 2>&1
```

### Crontab Format Explanation

```
*/5 * * * *
│  │ │ │ │
│  │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│  │ │ └───── Month (1-12)
│  │ └─────── Day of month (1-31)
│  └───────── Hour (0-23)
└──────────── Minute (0-59)
```

- `*/5` = Every 5 minutes
- `*` = Every value
- `0 */5 * * *` = Every 5 hours
- `0 0 * * *` = Daily at midnight

### Verify Crontab

View your current crontab:
```bash
crontab -l
```

Check cron logs (location varies by OS):
- **macOS:** `/var/log/system.log` or Console.app
- **Linux:** `/var/log/cron` or `/var/log/syslog`

## GitHub Actions

The project includes a GitHub Actions workflow that runs:
- Every 10 minutes on schedule
- On push to `trigger-action` branch
- On manual workflow dispatch

### Setup GitHub Actions

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Click on the **Variables** tab
3. Add repository variables:
   - `API_BASE_URL`: Your API base URL
   - `LOGIN_URL`: CapCut login URL

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_BASE_URL` | API endpoint URL | - | Yes |
| `LOGIN_URL` | CapCut login page URL | - | Yes |
| `PUPPETEER_HEADLESS` | Run browser in headless mode (`true`/`false`) | `false` | No |
| `CI` | Automatically set in CI environments | - | No |

## Project Structure

```
capcut-cookies/
├── .github/
│   └── workflows/
│       └── workflow.yml      # GitHub Actions workflow
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment variables template
├── .gitignore
├── index.js                   # Main script
├── package.json
├── trigger-workflow.sh         # Script to trigger GitHub Actions
└── README.md
```

## Troubleshooting

### Crontab not running

1. **Check cron service is running:**
   ```bash
   # macOS
   sudo launchctl list | grep cron
   
   # Linux
   sudo systemctl status cron
   ```

2. **Check file permissions:**
   ```bash
   chmod +x trigger-workflow.sh
   ```

3. **Use absolute paths** in crontab instead of relative paths

4. **Check logs** in the logs directory or system logs

5. **Test manually first:**
   ```bash
   cd /path/to/capcut-cookies
   npm start
   ```

### Puppeteer issues

- Ensure all system dependencies are installed (see workflow.yml for list)
- For headless mode, set `PUPPETEER_HEADLESS=true` in `.env`
- Check Chrome/Chromium is properly installed

### API connection issues

- Verify `API_BASE_URL` is correct
- Check network connectivity
- Verify API endpoint is accessible

## License

ISC

