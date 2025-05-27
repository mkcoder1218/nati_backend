#!/usr/bin/env node

// Debug startup script for Render deployment
console.log('=== Startup Debug Info ===');
console.log('Current working directory:', process.cwd());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Check if node_modules exists
const fs = require('fs');
const path = require('path');

console.log('\n=== Directory Structure ===');
try {
  const files = fs.readdirSync('.');
  console.log('Files in current directory:', files);
  
  if (files.includes('node_modules')) {
    console.log('✅ node_modules directory exists');
    
    // Check if express exists
    const expressPath = path.join('node_modules', 'express');
    if (fs.existsSync(expressPath)) {
      console.log('✅ express module exists');
      
      // Try to require express
      try {
        const express = require('express');
        console.log('✅ express module can be required');
        console.log('Express version:', express.version || 'unknown');
      } catch (err) {
        console.log('❌ Error requiring express:', err.message);
      }
    } else {
      console.log('❌ express module not found in node_modules');
    }
    
    // List some key modules
    const keyModules = ['express', 'pg', 'bcryptjs', 'jsonwebtoken', 'cors'];
    console.log('\n=== Key Modules Check ===');
    keyModules.forEach(mod => {
      const modPath = path.join('node_modules', mod);
      if (fs.existsSync(modPath)) {
        console.log(`✅ ${mod} exists`);
      } else {
        console.log(`❌ ${mod} missing`);
      }
    });
  } else {
    console.log('❌ node_modules directory not found');
  }
  
  // Check if dist exists
  if (files.includes('dist')) {
    console.log('✅ dist directory exists');
    const distFiles = fs.readdirSync('dist');
    console.log('Files in dist:', distFiles);
  } else {
    console.log('❌ dist directory not found');
  }
  
} catch (err) {
  console.log('Error reading directory:', err.message);
}

console.log('\n=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

console.log('\n=== Starting Application ===');
try {
  // Try to start the actual application
  require('./dist/index.js');
} catch (err) {
  console.log('❌ Error starting application:', err.message);
  console.log('Stack trace:', err.stack);
  process.exit(1);
}
