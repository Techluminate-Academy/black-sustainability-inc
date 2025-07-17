#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔒 Security Upgrade Script');
console.log('========================\n');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

try {
  console.log('📋 Phase 1: Critical Security Fixes');
  console.log('-----------------------------------');
  
  // Run npm audit to see current vulnerabilities
  console.log('🔍 Checking current vulnerabilities...');
  try {
    execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Vulnerabilities found (expected)');
  }
  
  // Fix critical vulnerabilities
  console.log('\n🔧 Fixing critical vulnerabilities...');
  try {
    execSync('npm audit fix --force', { stdio: 'inherit' });
    console.log('✅ Critical vulnerabilities fixed');
  } catch (error) {
    console.log('⚠️  Some vulnerabilities may require manual attention');
  }
  
  // Update Next.js to secure version
  console.log('\n📦 Updating Next.js to secure version...');
  try {
    execSync('npm install next@14.2.30', { stdio: 'inherit' });
    console.log('✅ Next.js updated to secure version');
  } catch (error) {
    console.error('❌ Failed to update Next.js:', error.message);
  }
  
  console.log('\n📋 Phase 2: High Priority Updates');
  console.log('--------------------------------');
  
  // Update critical security libraries
  const criticalUpdates = [
    'multer@2.0.2',
    'sharp@0.34.3',
    'nodemailer@7.0.5',
    'mongodb@6.17.0',
    'mongoose@8.16.4'
  ];
  
  for (const pkg of criticalUpdates) {
    console.log(`📦 Updating ${pkg}...`);
    try {
      execSync(`npm install ${pkg}`, { stdio: 'inherit' });
      console.log(`✅ ${pkg} updated`);
    } catch (error) {
      console.error(`❌ Failed to update ${pkg}:`, error.message);
    }
  }
  
  console.log('\n📋 Phase 3: Security Headers Setup');
  console.log('----------------------------------');
  
  // Check if next.config.js exists
  if (fs.existsSync('next.config.js')) {
    console.log('📝 Adding security headers to next.config.js...');
    
    const configContent = fs.readFileSync('next.config.js', 'utf8');
    
    if (!configContent.includes('securityHeaders')) {
      const securityHeadersConfig = `
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // ... rest of your existing config
};
`;
      
      console.log('⚠️  Please manually add security headers to your next.config.js');
      console.log('📝 Example configuration:');
      console.log(securityHeadersConfig);
    } else {
      console.log('✅ Security headers already configured');
    }
  }
  
  console.log('\n🔍 Final Security Check');
  console.log('----------------------');
  
  // Run final audit
  try {
    execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Some vulnerabilities may remain - check the report above');
  }
  
  console.log('\n✅ Security upgrade script completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Test your application thoroughly');
  console.log('2. Review the SECURITY_UPGRADE_RECOMMENDATIONS.md file');
  console.log('3. Consider implementing rate limiting and input validation');
  console.log('4. Set up automated security monitoring');
  
} catch (error) {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
} 