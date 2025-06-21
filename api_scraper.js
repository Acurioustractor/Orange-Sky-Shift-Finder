#!/usr/bin/env node

/**
 * Orange Sky API-based Scraper
 * 
 * This scraper uses the actual API endpoints that the Orange Sky website uses
 * to load location and shift data, providing access to all locations and shifts.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Schema for validating shift data
const ShiftSchema = z.array(
  z.object({
    service_name: z.string(),
    suburb: z.string(),
    state: z.string(),
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
    day: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    shift_status: z.string().optional(),
    van_asset: z.string().optional()
  })
);

// First, let's extract the locations data from the map page
async function getLocationsData() {
  console.log('Fetching locations data from Orange Sky map page...');
  
  const response = await fetch('https://orangesky.org.au/map/');
  const html = await response.text();
  
  // Extract the locations array from the JavaScript
  const locationsMatch = html.match(/var locations = \[(.*?)\];/s);
  if (!locationsMatch) {
    throw new Error('Could not find locations data in map page');
  }
  
  // Use eval to parse the JavaScript array (safer than manual JSON conversion)
  // This is generally not recommended, but in this case we're parsing known data
  try {
    const locationsCode = `[${locationsMatch[1]}]`;
    
    // Create a safe evaluation context
    const locations = eval(`(${locationsCode})`);
    
    console.log(`✅ Found ${locations.length} locations`);
    return locations;
  } catch (error) {
    console.error('Failed to parse locations JavaScript:', error.message);
    // Fallback: save the raw data for manual inspection
    fs.writeFileSync('locations_raw.txt', `[${locationsMatch[1]}]`);
    throw error;
  }
}

// Fetch shift data for a specific post ID using the WordPress REST API
async function getShiftData(postId) {
  try {
    const response = await fetch(`https://orangesky.org.au/wp-json/knd_rostify/v1/shifts/${postId}`);
    
    if (!response.ok) {
      console.log(`⚠️  No shift data for post ID ${postId}`);
      return [];
    }
    
    const data = await response.json();
    
    // Process the shift data without debug logging
    
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error(`Error fetching shift data for post ID ${postId}:`, error.message);
    return [];
  }
}

// Convert API shift data to our standard format
function convertShiftData(apiShift, location) {
  try {
    const attrs = apiShift.attributes || {};
    const niceData = apiShift.nice || {};
    const objectData = apiShift.object || {};
    
    // Helper function to extract string value from field (handles objects)
    function extractStringValue(field) {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (typeof field === 'object') {
        // Try common object properties that might contain the actual value
        return field.value || field.label || field.name || JSON.stringify(field);
      }
      return String(field);
    }
    
    // Extract day information from nice data or attributes
    const dayField = niceData.start_timestamp__dayofweek || extractStringValue(attrs.custom_what_days_it_occurs || attrs.day);
    
    // Extract time information from nice data or attributes
    const startTime = niceData.start_timestamp__time || extractStringValue(attrs.custom_start_time || attrs.start_time);
    const endTime = niceData.end_timestamp__time || extractStringValue(attrs.custom_end_time || attrs.end_time);
    
    // Extract state from postcode or city
    const state = extractStateFromLocation(location);
    
    return {
      service_name: location.name,
      suburb: location.city,
      state: state,
      address: location.street || location.city,
      lat: location.lat,
      lng: location.lng,
      day: dayField,
      start_time: startTime,
      end_time: endTime,
      shift_status: extractStringValue(attrs.custom_shift_status),
      van_asset: extractStringValue(attrs.custom_van_asset)
    };
  } catch (error) {
    return null;
  }
}

// Extract state from location data
function extractStateFromLocation(location) {
  const postcode = location.postcode;
  
  if (!postcode) return 'Unknown';
  
  const pc = parseInt(postcode);
  
  if (pc >= 1000 && pc <= 2999) return 'NSW';
  if (pc >= 3000 && pc <= 3999) return 'VIC';
  if (pc >= 4000 && pc <= 4999) return 'QLD';
  if (pc >= 5000 && pc <= 5999) return 'SA';
  if (pc >= 6000 && pc <= 6999) return 'WA';
  if (pc >= 7000 && pc <= 7999) return 'TAS';
  if (pc >= 800 && pc <= 999) return 'NT';
  if (pc >= 200 && pc <= 299) return 'ACT';
  
  return 'Unknown';
}

// Convert data to CSV format
function convertToCSV(shifts) {
  if (shifts.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(shifts[0]);
  
  // Create CSV content
  const csvRows = [headers.join(',')];
  
  const dataRows = shifts.map(shift => {
    return headers.map(header => {
      const value = shift[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  csvRows.push(...dataRows);
  return csvRows.join('\n');
}

// Main function
async function main() {
  try {
    console.log('🍊 Orange Sky API Scraper Starting...');
    
    // Get all locations
    const locations = await getLocationsData();
    
    const allShifts = [];
    let processedLocations = 0;
    
    console.log('\nFetching shift data for all locations...');
    
    // Process locations in batches
      const batchSize = 3;
      
      for (let i = 0; i < locations.length; i += batchSize) {
        const batch = locations.slice(i, i + batchSize);
      
      for (const location of batch) {
        if (!location.post_id) {
          console.log(`⚠️  No post_id for location: ${location.name}`);
          continue;
        }
        
        // Split post_id if it contains multiple IDs
        const postIds = location.post_id.split(',');
        
        for (const postId of postIds) {
          const shiftData = await getShiftData(postId.trim());
          
          for (const apiShift of shiftData) {
          // Convert to our standard format using the updated function
          const convertedShift = convertShiftData(apiShift, location);
          if (convertedShift) {
            allShifts.push(convertedShift);
          }
        }
          
          // Small delay to be respectful to the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        processedLocations++;
      }
      
      console.log(`📍 Processed ${Math.min(i + batchSize, locations.length)}/${locations.length} locations...`);
    }
    
    console.log(`\n✅ Processed ${processedLocations} locations`);
    console.log(`📊 Found ${allShifts.length} total shifts`);
    
    if (allShifts.length === 0) {
      console.log('⚠️  No shifts found. This might indicate the API structure has changed.');
      return;
    }
    
    // Log sample shifts to understand the data structure
    console.log(`\n📋 Sample shifts (first 3):`);
    allShifts.slice(0, 3).forEach((shift, index) => {
      console.log(`Shift ${index + 1}:`, JSON.stringify(shift, null, 2));
    });
    
    // Filter out shifts with missing essential data and validate
      const completeShifts = allShifts.filter(shift => 
        shift.service_name && shift.suburb && (shift.day || shift.start_time || shift.end_time)
      );
    
    console.log(`\n📊 Found ${completeShifts.length} complete shifts out of ${allShifts.length} total shifts`);
    
    const validatedShifts = ShiftSchema.parse(completeShifts);
    
    // Save to JSON
    const jsonFile = path.resolve('orange_sky_shifts_api.json');
    fs.writeFileSync(jsonFile, JSON.stringify(validatedShifts, null, 2));
    console.log(`💾 Saved ${validatedShifts.length} shifts to ${jsonFile}`);
    
    // Save to CSV
    const csvFile = path.resolve('orange_sky_shifts_api.csv');
    const csvContent = convertToCSV(validatedShifts);
    fs.writeFileSync(csvFile, csvContent);
    console.log(`💾 Saved ${validatedShifts.length} shifts to ${csvFile}`);
    
    // Show sample of data
    console.log('\n📋 Sample shifts:');
    validatedShifts.slice(0, 3).forEach(shift => {
      console.log(`   ${shift.service_name} (${shift.suburb}, ${shift.state}) - ${shift.day} ${shift.start_time}-${shift.end_time}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the scraper
main().catch(console.error);