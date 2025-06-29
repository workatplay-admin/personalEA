#!/usr/bin/env node
import puppeteer from 'puppeteer';

async function debugPageStructure() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log('Loading page...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/page-structure.png' });
    console.log('Screenshot saved to /tmp/page-structure.png');
    
    // Get page HTML structure
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('\n--- Page Structure ---');
    console.log(bodyHTML.substring(0, 2000) + '...');
    
    // Look for input fields
    const inputs = await page.$$eval('input', inputs => 
        inputs.map(input => ({
            type: input.type,
            placeholder: input.placeholder,
            id: input.id,
            className: input.className
        }))
    );
    console.log('\n--- Input Fields ---');
    console.log(inputs);
    
    // Look for buttons
    const buttons = await page.$$eval('button', buttons => 
        buttons.map(button => ({
            text: button.textContent,
            id: button.id,
            className: button.className
        }))
    );
    console.log('\n--- Buttons ---');
    console.log(buttons);
    
    await browser.close();
}

debugPageStructure();