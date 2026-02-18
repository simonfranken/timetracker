# TimeTracker iOS App

## Setup Instructions

### Prerequisites

1. **XcodeGen** - Required to generate the Xcode project
   ```bash
   # On macOS:
   brew install xcodegen
   
   # Or via npm:
   npm install -g xcodegen
   ```

2. **Xcode** - For building the iOS app (macOS only)

### Project Generation

After installing XcodeGen, generate the project:

```bash
cd ios/TimeTracker
xcodegen generate
```

This will create `TimeTracker.xcodeproj` in the `ios/TimeTracker` directory.

### Configuration

Before building, configure the API base URL:

1. Open `TimeTracker.xcodeproj` in Xcode
2. Select the TimeTracker target
3. Go to Info.plist
4. Add or modify `API_BASE_URL` with your backend URL:
   - For development: `http://localhost:3001`
   - For production: Your actual API URL

### Building

Open the project in Xcode and build:

```bash
open ios/TimeTracker/TimeTracker.xcodeproj
```

Then select your target device/simulator and press Cmd+B to build.

### Authentication Setup

1. Configure your OIDC provider settings in the backend
2. The iOS app uses ASWebAuthenticationSession for OAuth
3. The callback URL scheme is `timetracker://oauth/callback`

### App Groups

For the widget to work with the main app, configure the App Group:
- Identifier: `group.com.timetracker.app`
- This is already configured in the project.yml

### Dependencies

The project uses Swift Package Manager for dependencies:
- [SQLite.swift](https://github.com/stephencelis/SQLite.swift) - Local database
- [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess) - Secure storage

## Project Structure

```
TimeTracker/
├── TimeTrackerApp/          # App entry point
├── Core/
│   ├── Network/             # API client
│   ├── Auth/               # Authentication
│   └── Persistence/        # SQLite + sync
├── Features/
│   ├── Auth/              # Login
│   ├── Timer/              # Timer (core feature)
│   ├── TimeEntries/       # Time entries CRUD
│   ├── Projects/          # Projects CRUD
│   ├── Clients/           # Clients CRUD
│   └── Dashboard/         # Dashboard
├── Models/                  # Data models
├── Shared/                  # Extensions & components
└── Resources/              # Assets

TimeTrackerWidget/           # iOS Widget Extension
```
