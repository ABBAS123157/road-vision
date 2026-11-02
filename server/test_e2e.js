import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  console.log('🧪 Starting RoadVision AI End-to-End Automated Test Suite...\n');

  // Test 1: Health check & MongoDB status
  console.log('1️⃣ Testing Server Health & MongoDB Connection...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const health = await healthRes.json();
  console.log('   ✓ Health check passed:', health.service, '| Storage:', health.database.storageType);

  // Test 2: User Registration (Phase 1 & Phase 11)
  console.log('\n2️⃣ Testing User Registration with Multilingual Preferences (MongoDB)...');
  const testEmail = `inspector_${Date.now()}@roadvision.ai`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SafeRoadsPassword2026!',
      full_name: 'Lead Inspector Anita Sharma',
      role: 'Road Safety Inspector',
      phone: '+91 98765 12345',
      emergency_contact: '+91 98765 67890',
      preferred_languages: ['en', 'ta', 'hi', 'te'],
      default_language: 'ta'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  assert(regData.access_token, 'Token must be returned');
  const token = regData.access_token;
  const userId = regData.user.id;
  console.log('   ✓ User registered in MongoDB with ID:', userId, '| Preferred languages:', regData.user.preferred_languages);

  // Test 3: User Login
  console.log('\n3️⃣ Testing User Login & JWT Authentication...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SafeRoadsPassword2026!'
    })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.user.email, testEmail);
  console.log('   ✓ JWT Login successful! Token type:', loginData.token_type);

  // Test 4: Profile & Multilingual Preferences Retrieval
  console.log('\n4️⃣ Testing /api/auth/me & Multilingual Preferences...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200);
  const me = await meRes.json();
  assert.strictEqual(me.full_name, 'Lead Inspector Anita Sharma');
  assert.strictEqual(me.default_language, 'ta');
  console.log('   ✓ Profile verified from MongoDB! Default language:', me.default_language);

  // Test 5: Real-time Device GPS Coordinates Logging (Phase 3)
  console.log('\n5️⃣ Testing Real-Time Device GPS Logging (Phase 3)...');
  const gpsRes = await fetch(`${BASE_URL}/gps/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      latitude: 28.613939,
      longitude: 77.209021,
      altitude: 216.5,
      accuracy: 3.2,
      speed: 11.2, // ~40.3 km/h
      heading: 45.0,
      timestamp: new Date().toISOString()
    })
  });
  assert.strictEqual(gpsRes.status, 201);
  const gpsDataResp = await gpsRes.json();
  console.log('   ✓ Device GPS position logged in MongoDB:', gpsDataResp.log.latitude, gpsDataResp.log.longitude, `(${gpsDataResp.log.speed_kmh.toFixed(1)} km/h)`);

  // Test 6: Detection Event Logging (Phase 7)
  console.log('\n6️⃣ Testing Detection Events & Tracking ID Logging (Phase 7)...');
  const eventRes = await fetch(`${BASE_URL}/detection/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      event_type: 'PERSON_ENTERED_VIEW',
      object_label: 'Pedestrian',
      confidence: 0.94,
      tracking_id: 3,
      gps_lat: 28.613939,
      gps_lng: 77.209021,
      severity: 'warning',
      details: { proximity_meters: 4.5, is_crossing: true }
    })
  });
  assert.strictEqual(eventRes.status, 201);
  console.log('   ✓ Detection event saved in MongoDB with tracking ID #3');

  // Test 7: Video Upload & Telemetry Indexing (Phase 5 & 6)
  console.log('\n7️⃣ Testing Road Detection Video Saving & Indexing (Phase 5)...');
  // Create a dummy MP4-like buffer for file upload test
  const fakeVideoBuffer = Buffer.alloc(15000, 0x11);
  const formData = new FormData();
  const blob = new Blob([fakeVideoBuffer], { type: 'video/mp4' });
  formData.append('video', blob, 'test_road_event.mp4');
  formData.append('duration', '8.5');
  formData.append('trigger_event', 'auto_hazard');
  formData.append('gps_lat', '28.613939');
  formData.append('gps_lng', '77.209021');
  formData.append('gps_accuracy', '3.5');
  formData.append('detected_objects', JSON.stringify([
    { label: 'Pothole', category: 'Road Damage', confidence: 0.91, box: [100, 200, 250, 320] },
    { label: 'Car', category: 'Vehicle', tracking_id: 7, confidence: 0.96, box: [50, 80, 200, 190] }
  ]));
  formData.append('detection_summary', '1 Pothole, 1 Car tracked');

  const uploadRes = await fetch(`${BASE_URL}/videos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  assert.strictEqual(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  const savedVideoId = uploadData.video.video_id;
  console.log('   ✓ Video saved with ID:', savedVideoId, '| Path:', uploadData.video.file_path);

  // Test 8: Video Gallery Retrieval (Phase 6)
  console.log('\n8️⃣ Testing Video Gallery Retrieval...');
  const listRes = await fetch(`${BASE_URL}/videos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(listRes.status, 200);
  const listData = await listRes.json();
  assert(listData.videos.length > 0, 'Must have at least 1 video');
  console.log('   ✓ Retrieved', listData.total, 'saved video(s) for user in MongoDB');

  // Test 9: Video Deletion
  console.log('\n9️⃣ Testing Video Deletion & Storage Cleanup...');
  const delRes = await fetch(`${BASE_URL}/videos/${savedVideoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.strictEqual(delRes.status, 200);
  console.log('   ✓ Video successfully removed from MongoDB and disk.');

  // Test 10: Multilingual Preferences Update (Phase 11)
  console.log('\n🔟 Testing Multilingual Preferences Update (12 Languages Supported)...');
  const voiceRes = await fetch(`${BASE_URL}/voice/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      default_language: 'hi',
      preferred_languages: ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'ur', 'es', 'fr', 'ar'],
      voice_settings: {
        voice_output_enabled: true,
        speech_rate: 1.1,
        pitch: 1.0,
        volume: 0.95
      }
    })
  });
  assert.strictEqual(voiceRes.status, 200);
  console.log('   ✓ Multilingual preferences updated in MongoDB for 12 languages!');

  console.log('\n🎉 ALL 10 TEST SUITES PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

