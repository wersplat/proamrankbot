const fs = require('fs');
const path = require('path');

console.log('Global Rankings Discord Bot Setup');
console.log('================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('✓ .env file already exists');
} else {
  console.log('Creating .env file...');
  
  const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=

# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✓ .env file created');
}

console.log('\nNext steps:');
console.log('1. Fill in your credentials in the .env file');
console.log('2. Run "npm install" to install dependencies');
console.log('3. Run "npm start" to start the bot');
