#!/usr/bin/env node
/*
 * Orange Sky location/shift scraper using text-based URL approach
 * --------------------------------------------------------
 * 💡 Usage:
 *   npm install
 *   node scraper.js
 *   # → writes orange_sky_shifts.json in current folder
 */

import fetch from 'node-fetch';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Known working locations (discovered from the example)
const knownLocations = [
  'north_hobart_uniting_church'
];

// Base patterns for generating location slugs
const cities = [
  'brisbane', 'sydney', 'melbourne', 'perth', 'adelaide',
  'hobart', 'darwin', 'canberra', 'gold_coast', 'sunshine_coast',
  'newcastle', 'wollongong', 'geelong', 'townsville', 'cairns',
  'north_hobart', 'south_hobart', 'west_hobart'
];

const descriptors = [
  'uniting_church', 'community_centre', 'service', 'cbd',
  'park', 'shelter', 'mission', 'centre', 'hall', 'church'
];

// Schema for shift data validation
const ShiftSchema = z.array(
  z.object({
    service_name: z.string(),
    suburb: z.string(),
    state: z.string(),
    address: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    day: z.string(),
    start_time: z.string(),
    end_time: z.string(),
  })
);

async function fetchLocationData(slug) {
  try {
    const response = await fetch(`https://orangesky.org.au/list/${slug}`);
    if (!response.ok) return null;
    const text = await response.text();
    
    // Check if we got actual content (not just the slug echoed back)
    if (text.trim() === slug) {
      return null; // This indicates the endpoint doesn't exist
    }
    
    // Parse HTML content for shift data
    const shifts = parseShiftData(text, slug);
    return shifts;
  } catch (error) {
    console.error(`Error fetching ${slug}:`, error.message);
    return null;
  }
}

function parseShiftData(html, slug) {
  const shifts = [];
  
  // Extract location name
  const locationNameMatch = html.match(/<div class="location-name">([^<]+)<\/div>/);
  const locationName = locationNameMatch ? locationNameMatch[1] : slug.replace(/_/g, ' ');
  
  // Extract address and coordinates
  const addressMatch = html.match(/<a href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=([^,]+),([^"]+)" class="address">([^<]+)<\/a>/);
  let lat = 0, lng = 0, address = '';
  
  if (addressMatch) {
    lat = parseFloat(addressMatch[1]);
    lng = parseFloat(addressMatch[2]);
    address = addressMatch[3];
  }
  
  // Extract shift times - pattern: "Wed 25 June, 9:30 am - 11:30 am"
  const shiftPattern = /<div class="shift-time"[^>]*>([^<]+)<\/div>/g;
  let shiftMatch;
  
  while ((shiftMatch = shiftPattern.exec(html)) !== null) {
    const shiftText = shiftMatch[1].trim();
    
    // Parse the shift text: "Wed 25 June, 9:30 am - 11:30 am"
    const timeMatch = shiftText.match(/(\w{3})\s+\d+\s+\w+,\s*(\d{1,2}:\d{2}\s*(?:am|pm))\s*-\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    
    if (timeMatch) {
      const [, day, startTime, endTime] = timeMatch;
      
      // Extract state from address
      const state = extractStateFromAddress(address);
      const suburb = extractSuburbFromAddress(address);
      
      shifts.push({
        service_name: locationName,
        suburb: suburb,
        state: state,
        address: address,
        lat: lat,
        lng: lng,
        day: day,
        start_time: convertTo24Hour(startTime),
        end_time: convertTo24Hour(endTime)
      });
    }
  }
  
  return shifts;
}

function extractStateFromAddress(address) {
  // Extract state from address format like "2 Swan Street,North Hobart,7000"
  const parts = address.split(',');
  if (parts.length >= 2) {
    const suburb = parts[1].trim();
    // Map common suburb patterns to states
    if (suburb.includes('Hobart')) return 'TAS';
    if (suburb.includes('Brisbane')) return 'QLD';
    if (suburb.includes('Sydney') || suburb.includes('Newcastle')) return 'NSW';
    if (suburb.includes('Melbourne') || suburb.includes('Geelong')) return 'VIC';
    if (suburb.includes('Perth')) return 'WA';
    if (suburb.includes('Adelaide')) return 'SA';
    if (suburb.includes('Darwin')) return 'NT';
    if (suburb.includes('Canberra')) return 'ACT';
  }
  return 'Unknown';
}

function extractSuburbFromAddress(address) {
  const parts = address.split(',');
  return parts.length >= 2 ? parts[1].trim() : 'Unknown';
}



function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(/\s*(am|pm)/i);
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  
  if (modifier.toLowerCase() === 'pm') {
    hours = parseInt(hours, 10) + 12;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function convertToCSV(shifts) {
  if (shifts.length === 0) return '';
  
  // Get headers from the first object
  const headers = Object.keys(shifts[0]);
  
  // Create CSV header row
  const csvHeaders = headers.join(',');
  
  // Create CSV data rows
  const csvRows = shifts.map(shift => {
    return headers.map(header => {
      const value = shift[header];
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

async function main() {
  const shifts = [];
  const discoveredLocations = new Set();

  // First test known working locations
  console.log('Testing known locations...');
  for (const slug of knownLocations) {
    console.log(`Testing known location: ${slug}...`);
    const locationData = await fetchLocationData(slug);
    if (locationData && locationData.length > 0) {
      discoveredLocations.add(slug);
      shifts.push(...locationData);
      console.log(`✅ Found ${locationData.length} shifts at ${slug}`);
    }
  }

  // Then generate and test location combinations (comprehensive scan)
   console.log('\nTesting generated location combinations...');
   let tested = 0;
   const maxTests = 500; // Increased limit for comprehensive discovery
  
  for (const city of cities) {
    for (const descriptor of descriptors) {
      if (tested >= maxTests) break;
      
      const slug = `${city}_${descriptor}`;
      if (knownLocations.includes(slug)) continue; // Skip already tested
      
      console.log(`Testing ${slug}...`);
      tested++;
      
      const locationData = await fetchLocationData(slug);
      if (locationData && locationData.length > 0) {
        discoveredLocations.add(slug);
        shifts.push(...locationData);
        console.log(`✅ Found ${locationData.length} shifts at ${slug}`);
      }
      
      // Small delay to be respectful to the server
       await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (tested >= maxTests) break;
  }

  console.log(`\nDiscovered ${discoveredLocations.size} locations`);
  console.log(`Found ${shifts.length} total shifts`);
  console.log('Discovered locations:', Array.from(discoveredLocations));

  // Validate and save results
  try {
    const validatedShifts = ShiftSchema.parse(shifts);
    
    // Save JSON file
    const jsonFile = path.resolve('orange_sky_shifts.json');
    fs.writeFileSync(jsonFile, JSON.stringify(validatedShifts, null, 2));
    console.log(`✅ Saved ${validatedShifts.length} shifts to ${jsonFile}`);
    
    // Save CSV file
    const csvFile = path.resolve('orange_sky_shifts.csv');
    const csvContent = convertToCSV(validatedShifts);
    fs.writeFileSync(csvFile, csvContent);
    console.log(`✅ Saved ${validatedShifts.length} shifts to ${csvFile}`);
    
  } catch (error) {
    console.error('❌ Data validation failed:', error.message);
    console.error('Raw shifts data:', JSON.stringify(shifts, null, 2));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});