# LinenTrack POS Application

This is the Point of Sale (POS) module of the LinenTrack system, separated into its own Next.js application for independent hosting and deployment.

## Features

- **New Order Creation**: Complete POS interface for creating laundry/dry cleaning orders
- **Customer Management**: Search and add customers
- **Product Selection**: Browse and select products by category
- **Order Customization**: Configure damage types, colors, and promo codes
- **Payment Processing**: Handle payments and generate receipts
- **Staff Clock Management**: Clock in/out functionality with inactivity detection

## Authentication

This app is restricted to staff users with `accessMode: 'pos'`. Users are automatically redirected based on their permissions.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env.local`):
```bash
# Add your Firebase configuration and other environment variables
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── Pos/                    # POS-specific components
│   ├── components/         # POS UI components
│   └── State/             # POS state management
├── Common/                # Shared components
├── Admin/common/          # Admin common components (Navbar, etc.)
├── Login/                 # Login page
└── ui/                    # UI component library
```

## Deployment

This application can be deployed independently to any hosting platform that supports Next.js applications (Vercel, Netlify, AWS, etc.).

## Related Applications

- **Admin App**: Main administration interface
- **Operations App**: Operations management (Cleaning, Ready, Ironing)

Each application is designed to run independently with its own authentication and feature set.
# linentrack-pos
