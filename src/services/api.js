const API_BASE_URL = 'http://localhost:5000/api';
const WS_BASE_URL = 'ws://localhost:5000';

// Helper for making JSON requests
async function fetchJson(endpoint, options = {}) {
  const token = localStorage.getItem('adaptvr_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// -------------------------------------------------------------------
// REST API Exported Functions
// -------------------------------------------------------------------
export const api = {
  // Auth
  login: (email, password) => fetchJson('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => fetchJson('/auth/me'),

  // Students
  getStudents: () => fetchJson('/students'),
  getStudentById: (id) => fetchJson(`/students/${id}`),
  createStudent: (studentData) => fetchJson('/students', { method: 'POST', body: JSON.stringify(studentData) }),

  // Modules
  getModules: () => fetchJson('/modules'),
  createModule: (moduleData) => fetchJson('/modules', { method: 'POST', body: JSON.stringify(moduleData) }),

  // Sessions
  getSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/sessions${query ? `?${query}` : ''}`);
  },
  getSessionById: (id) => fetchJson(`/sessions/${id}`),
  startSession: (sessionData) => fetchJson('/sessions', { method: 'POST', body: JSON.stringify(sessionData) }),
  endSession: (id, data) => fetchJson(`/sessions/${id}/end`, { method: 'POST', body: JSON.stringify(data) }),

  // Telemetry Ingestion
  postEvent: (sessionId, eventData) => fetchJson(`/sessions/${sessionId}/events`, { method: 'POST', body: JSON.stringify(eventData) }),
  postPrediction: (sessionId, predictionData) => fetchJson(`/sessions/${sessionId}/predictions`, { method: 'POST', body: JSON.stringify(predictionData) }),

  // Analytics
  getAnalyticsOverview: () => fetchJson('/analytics/overview'),
  getStudentAnalytics: (studentId) => fetchJson(`/analytics/student/${studentId}`),

  // Reports
  getSessionReport: (sessionId) => fetchJson(`/reports/session/${sessionId}`),
};

// -------------------------------------------------------------------
// Real-Time WebSocket Client Connection
// -------------------------------------------------------------------
export function connectTelemetryWebSocket(onMessage, onError) {
  try {
    const ws = new WebSocket(WS_BASE_URL);

    ws.onopen = () => {
      console.log('[AdaptVR Telemetry] WebSocket connection opened');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (onMessage) onMessage(payload);
      } catch (e) {
        console.error('[AdaptVR Telemetry] Failed parsing WS message:', e);
      }
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = () => {
      console.log('[AdaptVR Telemetry] WebSocket closed, retrying in 5s...');
      setTimeout(() => connectTelemetryWebSocket(onMessage, onError), 5000);
    };

    return ws;
  } catch (err) {
    console.error('[AdaptVR Telemetry] WebSocket connection error:', err);
    return null;
  }
}
