import fs from 'fs';

const endpoints = [
  '/api/db-status',
  '/api/load-data',
  '/api/roles',
  '/api/departments',
  '/api/users',
  '/api/tasks',
  '/api/agendas',
  '/api/task-models?t=1',
  '/api/radar-activities',
  '/api/resolutions',
  '/api/publications',
  '/api/reg/tomadas',
  '/api/areas',
  '/api/responsibles',
  '/api/categories',
  '/api/plans',
  '/api/task-models'
];

for (const ep of endpoints) {
  try {
    const res = await fetch(`http://localhost:3000${ep}`);
    const text = await res.text();
    if (text.startsWith('<!doctype html>')) {
      console.log(`Endpoint ${ep} returned HTML`);
    } else if (text.startsWith('<!DOCTYPE html>')) {
      console.log(`Endpoint ${ep} returned HTML`);
    } else {
      console.log(`Endpoint ${ep} returned ${text.substring(0, 20)}...`);
    }
  } catch(e) {
    console.log(`Error on ${ep}:`, e);
  }
}
