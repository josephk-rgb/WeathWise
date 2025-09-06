#!/usr/bin/env ts-node

/**
 * Auth0 Configuration Validation Script
 * Validates that Auth0 environment variables are properly configured
 * and the JWKS endpoint is accessible.
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

class Auth0Validator {
  private results: ValidationResult[] = [];

  private addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    this.results.push({ check, status, message, details });
  }

  private getStatusIcon(status: 'PASS' | 'FAIL' | 'WARN'): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'WARN': return '⚠️';
    }
  }

  async validateEnvironmentVariables(): Promise<void> {
    console.log('\n🔍 Validating Auth0 Environment Variables...\n');

    // Check AUTH0_DOMAIN
    const domain = process.env['AUTH0_DOMAIN'];
    if (!domain) {
      this.addResult('AUTH0_DOMAIN', 'FAIL', 'Missing AUTH0_DOMAIN environment variable');
    } else if (!domain.includes('.auth0.com') && !domain.includes('.eu.auth0.com') && !domain.includes('.au.auth0.com')) {
      this.addResult('AUTH0_DOMAIN', 'WARN', 'AUTH0_DOMAIN format seems unusual', { domain });
    } else {
      this.addResult('AUTH0_DOMAIN', 'PASS', 'AUTH0_DOMAIN is properly configured', { domain });
    }

    // Check AUTH0_AUDIENCE
    const audience = process.env['AUTH0_AUDIENCE'];
    if (!audience) {
      this.addResult('AUTH0_AUDIENCE', 'FAIL', 'Missing AUTH0_AUDIENCE environment variable');
    } else if (!audience.startsWith('https://')) {
      this.addResult('AUTH0_AUDIENCE', 'WARN', 'AUTH0_AUDIENCE should typically start with https://', { audience });
    } else {
      this.addResult('AUTH0_AUDIENCE', 'PASS', 'AUTH0_AUDIENCE is properly configured', { audience });
    }

    // Check AUTH0_CLIENT_ID
    const clientId = process.env['AUTH0_CLIENT_ID'];
    if (!clientId) {
      this.addResult('AUTH0_CLIENT_ID', 'WARN', 'Missing AUTH0_CLIENT_ID (optional for API-only setup)');
    } else {
      this.addResult('AUTH0_CLIENT_ID', 'PASS', 'AUTH0_CLIENT_ID is configured', { clientId: clientId.substring(0, 8) + '...' });
    }

    // Check AUTH0_CLIENT_SECRET
    const clientSecret = process.env['AUTH0_CLIENT_SECRET'];
    if (!clientSecret) {
      this.addResult('AUTH0_CLIENT_SECRET', 'WARN', 'Missing AUTH0_CLIENT_SECRET (optional for API-only setup)');
    } else {
      this.addResult('AUTH0_CLIENT_SECRET', 'PASS', 'AUTH0_CLIENT_SECRET is configured', { clientSecret: '***' });
    }
  }

  async validateJWKSEndpoint(): Promise<void> {
    console.log('\n🔍 Validating JWKS Endpoint...\n');

    const domain = process.env['AUTH0_DOMAIN'];
    if (!domain) {
      this.addResult('JWKS_ENDPOINT', 'FAIL', 'Cannot test JWKS endpoint without AUTH0_DOMAIN');
      return;
    }

    try {
      const jwksUrl = `https://${domain}/.well-known/jwks.json`;
      const response = await axios.get(jwksUrl, { timeout: 5000 });
      
      if (response.status === 200 && response.data.keys && Array.isArray(response.data.keys)) {
        this.addResult('JWKS_ENDPOINT', 'PASS', 'JWKS endpoint is accessible and returns valid keys', {
          url: jwksUrl,
          keyCount: response.data.keys.length
        });
      } else {
        this.addResult('JWKS_ENDPOINT', 'FAIL', 'JWKS endpoint returned unexpected format', {
          url: jwksUrl,
          status: response.status,
          data: response.data
        });
      }
    } catch (error: any) {
      this.addResult('JWKS_ENDPOINT', 'FAIL', 'Failed to access JWKS endpoint', {
        url: `https://${domain}/.well-known/jwks.json`,
        error: error.message
      });
    }
  }

  async validateAuth0Domain(): Promise<void> {
    console.log('\n🔍 Validating Auth0 Domain...\n');

    const domain = process.env['AUTH0_DOMAIN'];
    if (!domain) {
      this.addResult('AUTH0_DOMAIN_ACCESS', 'FAIL', 'Cannot test domain without AUTH0_DOMAIN');
      return;
    }

    // Try multiple OpenID configuration endpoints
    const endpoints = [
      `https://${domain}/.well-known/openid_configuration`,
      `https://${domain}/.well-known/openid-configuration`,
      `https://${domain}/.well-known/jwks.json` // Fallback to JWKS which we know works
    ];

    let success = false;
    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { timeout: 5000 });
        
        if (response.status === 200) {
          if (endpoint.includes('jwks.json')) {
            // JWKS endpoint works, domain is accessible
            this.addResult('AUTH0_DOMAIN_ACCESS', 'PASS', 'Auth0 domain is accessible (verified via JWKS)', {
              workingEndpoint: endpoint,
              note: 'OpenID config might not be available, but JWKS works fine'
            });
          } else {
            // OpenID config works
            this.addResult('AUTH0_DOMAIN_ACCESS', 'PASS', 'Auth0 domain is accessible and properly configured', {
              issuer: response.data.issuer || 'N/A',
              jwksUri: response.data.jwks_uri || 'N/A',
              workingEndpoint: endpoint
            });
          }
          success = true;
          break;
        }
      } catch (error: any) {
        lastError = error;
        continue; // Try next endpoint
      }
    }

    if (!success) {
      this.addResult('AUTH0_DOMAIN_ACCESS', 'FAIL', 'Failed to access Auth0 domain via any endpoint', {
        testedEndpoints: endpoints,
        lastError: lastError?.message
      });
    }
  }

  printResults(): void {
    console.log('\n📊 Auth0 Validation Results:\n');
    console.log('=' .repeat(80));

    let passCount = 0;
    let failCount = 0;
    let warnCount = 0;

    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      console.log(`${icon} ${result.check.padEnd(25)} ${result.message}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      console.log('');

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'WARN': warnCount++; break;
      }
    });

    console.log('=' .repeat(80));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n`);

    if (failCount === 0) {
      console.log('🎉 All critical Auth0 configurations are valid!');
      console.log('🚀 Your backend should be ready for Auth0 authentication.\n');
    } else {
      console.log('⚠️  Please fix the failed configurations before proceeding.\n');
      process.exit(1);
    }
  }

  async runFullValidation(): Promise<void> {
    console.log('🔐 Auth0 Configuration Validator');
    console.log('=' .repeat(80));

    await this.validateEnvironmentVariables();
    await this.validateJWKSEndpoint();
    await this.validateAuth0Domain();
    
    this.printResults();
  }
}

// Run the validation
const validator = new Auth0Validator();
validator.runFullValidation().catch(error => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});
