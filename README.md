# MiniMax Token-Plan Dashboard

Web Dashboard for monitoring MiniMax Token-Plan usage with multi-account support.

![Dashboard Preview](https://img.shields.io/badge/Node.js-v18+-green) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Multi-Account Support** - Monitor multiple MiniMax accounts simultaneously
- **Real-time Monitoring** - Live usage data with auto-refresh (configurable interval)
- **Usage Tracking** - Display remaining calls, reset countdown, weekly quota
- **Subscription Status** - Track plan expiry date
- **Color-coded Status** - Visual indicators for usage levels
- **Clean Web UI** - Modern, responsive dashboard interface

## Screenshots

```
┌─────────────────────────────────────────────────────┐
│  MiniMax Dashboard              [+ Add Account]    │
│  Token-Plan Monitor                    [Refresh]    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ My Account      │  │ Work Account    │          │
│  │ MiniMax-M2      │  │ MiniMax-M2.5    │          │
│  │ Usage ████░░ 45%│  │ Usage ██████ 72%│          │
│  │ Remaining 2475  │  │ Remaining 1260  │          │
│  │ Reset 3h 20m    │  │ Reset 1h 45m    │          │
│  │ Expires 15 days │  │ Expires 15 days │          │
│  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────┘
```

## Requirements

- Node.js v18 or higher
- MiniMax API Token

## Quick Start

```bash
# Clone or download the project
cd minimax-status-ui

# Install dependencies
npm install

# Start the dashboard
npm start
```

Open **http://localhost:7777** in your browser.

## Configuration

### Getting Your API Token

1. Visit [MiniMax Open Platform](https://platform.minimaxi.com/user-center/payment/coding-plan)
2. Login and go to Coding Plan
3. Create or copy your API Key

### Adding Accounts

1. Click **"+ Add Account"** on the dashboard
2. Enter account name and API Token
3. Group ID is optional (for advanced users)

## Project Structure

```
minimax-status-ui/
├── src/
│   ├── index.js              # Express server entry point
│   ├── api/
│   │   └── minimax.js       # MiniMax API client
│   ├── config/
│   │   └── config-manager.js # Account configuration manager
│   ├── routes/
│   │   └── accounts.js       # Account API routes
│   └── public/
│       ├── index.html        # Dashboard HTML
│       ├── styles.css        # Dashboard styles
│       └── dashboard.js      # Frontend JavaScript
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Add new account |
| DELETE | `/api/accounts/:id` | Delete account |
| GET | `/api/status/:accountId` | Get account usage status |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

## Configuration Files

Account data is stored in `~/.minimax-accounts.json` with the following structure:

```json
{
  "accounts": [
    {
      "id": "acc_1234567890",
      "name": "My Account",
      "token": "your_api_token",
      "groupId": null,
      "isDefault": true
    }
  ],
  "settings": {
    "refreshInterval": 30,
    "theme": "light"
  }
}
```

## Usage Display

### Status Colors

| Usage | Color | Status |
|-------|-------|--------|
| < 60% | Green | Normal |
| 60-85% | Yellow | Warning |
| > 85% | Red | Critical |

### Expiry Colors

| Days Remaining | Color |
|----------------|-------|
| > 7 days | Green |
| 3-7 days | Yellow |
| < 3 days | Red |

## Command Line

```bash
# Start dashboard
npm start

# Or run directly
node src/index.js
```

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Author

Jochen Yang
